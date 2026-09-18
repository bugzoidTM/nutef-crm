/**
 * Billing (camada do fork Nutef CRM) — prova comportamental de isolamento e da
 * régua de cobrança, no Postgres descartável de `nutef/scripts/test-db.sh`
 * (baseline do upstream + nutef/db/baseline-nutef.sql).
 *
 * Cobre as cinco tabelas de nutef/db/migrations/N0001_billing.sql:
 *   billing_plans, billing_subscriptions, billing_invoices, billing_usage,
 *   billing_events — e é o arquivo que `PROVA_PROPRIA` de
 *   tests/invariants/rls-completude-varredura.test.ts cita para elas.
 *
 * Só roda quando o schema do fork está aplicado: no `pnpm test:db` do upstream
 * (baseline puro) as tabelas não existem e o arquivo se declara pulado — sem
 * isso, o job `invariants` do upstream ficaria vermelho por causa do fork.
 */
import { execFileSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";

const container = process.env.TEST_DB_CONTAINER;
if (!container) {
  throw new Error("TEST_DB_CONTAINER not set — run via `bash nutef/scripts/test-db.sh`");
}
const containerName: string = container;

function sql(script: string): string {
  return execFileSync(
    "docker",
    ["exec", "-i", containerName, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-tA", "-f", "-"],
    { input: script, encoding: "utf8" },
  ).trim();
}

const ORG_A = "b1111111-0000-4000-8000-000000000001";
const ORG_B = "b2222222-0000-4000-8000-000000000002";
const USER_A = "b1111111-1111-4000-8000-000000000001";
const USER_B = "b2222222-1111-4000-8000-000000000002";

function comoUsuario(userId: string, query: string): string {
  const out = sql(`
    set role authenticated;
    select set_config('request.jwt.claims', '{"sub":"${userId}","role":"authenticated"}', false);
    ${query}
  `);
  const lines = out.split("\n");
  return lines[lines.length - 1] ?? "";
}

const temSchemaDoFork = (): boolean =>
  sql(`select count(*) from information_schema.tables where table_schema='public' and table_name='billing_subscriptions'`) === "1";

const semSchema = !temSchemaDoFork();

describe.skipIf(semSchema)("billing do fork — isolamento e régua", () => {
  beforeAll(() => {
    sql(`
      insert into auth.users (id, email) values ('${USER_A}', 'billing-a@invariant.test'), ('${USER_B}', 'billing-b@invariant.test')
        on conflict (id) do nothing;
      insert into public.organizations (id, slug, legal_name, display_name)
        values ('${ORG_A}', 'billing-a', 'Billing A', 'Billing A'), ('${ORG_B}', 'billing-b', 'Billing B', 'Billing B')
        on conflict (id) do nothing;
      insert into public.user_organizations (user_id, organization_id, role, accepted_at)
        values ('${USER_A}', '${ORG_A}', 'admin', now()), ('${USER_B}', '${ORG_B}', 'admin', now())
        on conflict do nothing;
    `);
  });

  it("toda organização nova nasce em trial de 7 dias no plano start — e SEM linha em ai_budgets", () => {
    const linha = sql(`
      select s.status || '|' || p.slug || '|' || ((s.trial_ends_at::date - now()::date))
        from public.billing_subscriptions s join public.billing_plans p on p.id = s.plan_id
       where s.organization_id = '${ORG_A}'`);
    expect(linha).toBe("trialing|start|7");
    expect(sql(`select count(*) from public.ai_budgets where organization_id = '${ORG_A}'`)).toBe("0");
  });

  it("o sync do teto de IA arma o crédito do trial no modo que o motor lê (bloquear, vigente já)", () => {
    sql(`select public.fn_billing_sincronizar_orcamento_ia()`);
    expect(sql(`select monthly_limit_cents || '|' || enforcement_mode || '|' || (enforcement_effective_at <= now())
                  from public.ai_budgets where organization_id = '${ORG_A}'`)).toBe("2000|bloquear|true");
  });

  it("membro lê a própria assinatura e não a da outra organização (RLS)", () => {
    expect(comoUsuario(USER_A, `select count(*) from public.billing_subscriptions where organization_id = '${ORG_A}'`)).toBe("1");
    expect(comoUsuario(USER_A, `select count(*) from public.billing_subscriptions where organization_id = '${ORG_B}'`)).toBe("0");
    expect(comoUsuario(USER_B, `select count(*) from public.billing_subscriptions`)).toBe("1");
  });

  it("planos públicos são visíveis; o dedicated (contrato) não", () => {
    expect(comoUsuario(USER_A, `select count(*) from public.billing_plans where is_public`)).toBe("3");
    expect(comoUsuario(USER_A, `select count(*) from public.billing_plans where slug = 'dedicated'`)).toBe("0");
  });

  it("authenticated não escreve em nenhuma tabela de billing, nem na própria org", () => {
    for (const cmd of [
      `update public.billing_subscriptions set status = 'active' where organization_id = '${ORG_A}'`,
      `insert into public.billing_invoices (organization_id, subscription_id, amount_cents, due_date)
         select '${ORG_A}', id, 1, current_date from public.billing_subscriptions where organization_id = '${ORG_A}'`,
      `insert into public.billing_usage (organization_id, period_start) values ('${ORG_A}', current_date)`,
      `select count(*) from public.billing_events`,
      `update public.billing_plans set monthly_price_cents = 1`,
    ]) {
      expect(() => comoUsuario(USER_A, cmd), cmd).toThrow(/permission denied/);
    }
  });

  it("anon e authenticated não executam as funções do servidor (tick, sync, portão)", () => {
    for (const fn of ["fn_billing_tick()", "fn_billing_sincronizar_orcamento_ia()", "fn_billing_envio_automatico_permitido('" + ORG_A + "')"]) {
      expect(() => sql(`set role anon; select public.${fn};`), "anon " + fn).toThrow(/permission denied/);
      expect(() => comoUsuario(USER_A, `select public.${fn};`), "authenticated " + fn).toThrow(/permission denied/);
    }
  });

  it("a régua: trial vence → past_due + fatura; 3 dias → portão fecha; 10 dias → org suspensa; pagar reabre tudo", () => {
    const portao = () => sql(`select public.fn_billing_envio_automatico_permitido('${ORG_A}')`);
    expect(portao()).toBe("t");

    const d8 = JSON.parse(sql(`select public.fn_billing_tick(now() + interval '8 days')::text`));
    expect(d8.past_due).toBeGreaterThanOrEqual(1);
    expect(sql(`select status || '|' || dunning_stage from public.billing_subscriptions where organization_id = '${ORG_A}'`)).toBe("past_due|1");
    expect(sql(`select count(*) from public.billing_invoices where organization_id = '${ORG_A}' and status = 'open' and amount_cents = 39700`)).toBe("1");
    expect(portao()).toBe("t");

    sql(`select public.fn_billing_tick(now() + interval '11 days')`);
    expect(sql(`select dunning_stage from public.billing_subscriptions where organization_id = '${ORG_A}'`)).toBe("2");
    expect(portao()).toBe("f");

    sql(`select public.fn_billing_tick(now() + interval '18 days')`);
    expect(sql(`select s.status || '|' || o.status || '|' || o.suspended_reason
                  from public.billing_subscriptions s join public.organizations o on o.id = s.organization_id
                 where s.organization_id = '${ORG_A}'`)).toBe("suspended|suspended|billing: assinatura em atraso há mais de 10 dias");
    // suspensa: o teto que tinha fica como está (a org inteira já está fechada pelo motor)
    expect(sql(`select monthly_limit_cents from public.ai_budgets where organization_id = '${ORG_A}'`)).toBe("2000");

    // idempotente: o mesmo dia de novo não tem efeito
    expect(JSON.parse(sql(`select public.fn_billing_tick(now() + interval '18 days')::text`)).effect).toBe(false);

    const pago = JSON.parse(sql(`
      select public.fn_billing_confirmar_pagamento(
        (select id from public.billing_invoices where organization_id = '${ORG_A}' and status = 'open' limit 1),
        '${USER_A}', now() + interval '18 days')::text`));
    expect(pago.applied_now).toBe(true);
    expect(sql(`select s.status || '|' || s.dunning_stage || '|' || o.status || '|' || b.monthly_limit_cents || '|' || b.enforcement_mode
                  from public.billing_subscriptions s join public.organizations o on o.id = s.organization_id
                  join public.ai_budgets b on b.organization_id = s.organization_id
                 where s.organization_id = '${ORG_A}'`)).toBe("active|0|active|5000|bloquear");
    expect(portao()).toBe("t");
    // pagar de novo não rola o período
    expect(JSON.parse(sql(`select public.fn_billing_confirmar_pagamento(
        (select id from public.billing_invoices where organization_id = '${ORG_A}' and status = 'paid' limit 1))::text`)).applied_now).toBe(false);
  });

  it("a suspensão do billing não sobrescreve uma suspensão manual do superadmin", () => {
    sql(`update public.organizations set status = 'suspended', suspended_at = now(), suspended_reason = 'manual: fraude' where id = '${ORG_B}'`);
    sql(`select public.fn_billing_tick(now() + interval '40 days')`);
    expect(sql(`select suspended_reason from public.organizations where id = '${ORG_B}'`)).toBe("manual: fraude");
    // e pagar a fatura da B NÃO reativa a org: quem suspendeu foi uma pessoa, não a cobrança
    sql(`select public.fn_billing_confirmar_pagamento((select id from public.billing_invoices where organization_id = '${ORG_B}' and status = 'open' limit 1))`);
    expect(sql(`select status from public.organizations where id = '${ORG_B}'`)).toBe("suspended");
  });

  it("uso do dia é consulta: recalcular devolve o mesmo número, não soma", () => {
    sql(`select public.fn_billing_agregar_uso(current_date)`);
    const a = sql(`select users || '|' || contacts from public.billing_usage where organization_id = '${ORG_A}' and period_start = current_date`);
    sql(`select public.fn_billing_agregar_uso(current_date)`);
    const b = sql(`select users || '|' || contacts from public.billing_usage where organization_id = '${ORG_A}' and period_start = current_date`);
    expect(a).toBe("1|0");
    expect(b).toBe(a);
  });

  it("o resumo só devolve a própria organização quando há usuário na sessão", () => {
    expect(comoUsuario(USER_A, `select public.fn_billing_resumo('${ORG_A}')->'plan'->>'slug'`)).toBe("start");
    expect(comoUsuario(USER_A, `select coalesce(public.fn_billing_resumo('${ORG_B}')::text, 'nulo')`)).toBe("nulo");
  });
});

describe.runIf(semSchema)("billing do fork — schema ausente", () => {
  it("pulado: este banco não tem o apêndice nutef/db/baseline-nutef.sql", () => {
    expect(semSchema).toBe(true);
  });
});
