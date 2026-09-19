/**
 * Leituras e escritas do billing para o superadmin (camada do fork). Todas
 * rodam com service role — quem chama já passou por requirePlatformAdmin() e
 * requireSupportWrite(); o organization_id vem do PATH da rota admin, nunca do
 * body (CLAUDE.md, multi-tenancy).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Assinatura, Fatura, Plano, StatusDeAssinatura } from "./types";
import { sincronizarOrcamentoDeIA } from "./db";
import { saudePorOrganizacao, type SaudeDaOrganizacao } from "@/nutef/superadmin/kpis";

export interface LinhaDoPainel {
  organization_id: string;
  slug: string;
  display_name: string;
  org_status: string;
  subscription: Assinatura;
  plan: Pick<Plano, "slug" | "name" | "monthly_price_cents" | "yearly_price_cents">;
  open_invoices_cents: number;
  /** Fase 5 (§28): usuários, números, IA, última atividade, saúde — null se a leitura falhar. */
  saude: SaudeDaOrganizacao | null;
}

export interface PainelDeBilling {
  mrr_cents: number;
  por_status: Record<StatusDeAssinatura, number>;
  faturas_abertas: { quantidade: number; total_cents: number; vencidas: number };
  linhas: LinhaDoPainel[];
}

function erro(ctx: string, e: { message: string } | null): never {
  throw new Error(`${ctx}: ${e?.message ?? "erro desconhecido"}`);
}

/** Visão geral: MRR, contagens por status e uma linha por organização. */
export async function painelDeBilling(admin: SupabaseClient): Promise<PainelDeBilling> {
  const { data: subs, error } = await admin
    .from("billing_subscriptions")
    .select("*, organizations!inner(slug, display_name, status), billing_plans!inner(slug, name, monthly_price_cents, yearly_price_cents)")
    .order("created_at", { ascending: false });
  if (error) erro("painel", error);
  const { data: abertas, error: e2 } = await admin
    .from("billing_invoices")
    .select("organization_id, amount_cents, due_date")
    .eq("status", "open");
  if (e2) erro("faturas abertas", e2);
  const saude = await saudePorOrganizacao(admin).catch(() => new Map<string, SaudeDaOrganizacao>());

  const abertasPorOrg = new Map<string, number>();
  let vencidas = 0;
  const hoje = new Date().toISOString().slice(0, 10);
  for (const f of abertas ?? []) {
    abertasPorOrg.set(f.organization_id, (abertasPorOrg.get(f.organization_id) ?? 0) + f.amount_cents);
    if (f.due_date < hoje) vencidas += 1;
  }

  const por_status: Record<StatusDeAssinatura, number> = { trialing: 0, active: 0, past_due: 0, suspended: 0, cancelled: 0 };
  let mrr = 0;
  const linhas: LinhaDoPainel[] = [];
  for (const raw of subs ?? []) {
    const { organizations: org, billing_plans: plan, ...s } = raw as Record<string, unknown> & {
      organizations: { slug: string; display_name: string; status: string };
      billing_plans: LinhaDoPainel["plan"];
    };
    const sub = s as unknown as Assinatura;
    por_status[sub.status] += 1;
    // MRR = receita recorrente de quem está pagando (active/past_due); anual normalizado por 12
    if (sub.status === "active" || sub.status === "past_due") {
      mrr += sub.billing_cycle === "yearly"
        ? Math.round((plan.yearly_price_cents ?? plan.monthly_price_cents * 12) / 12)
        : plan.monthly_price_cents;
    }
    linhas.push({
      organization_id: sub.organization_id,
      slug: org.slug,
      display_name: org.display_name,
      org_status: org.status,
      subscription: sub,
      plan,
      open_invoices_cents: abertasPorOrg.get(sub.organization_id) ?? 0,
      saude: saude.get(sub.organization_id) ?? null,
    });
  }
  const total = [...abertasPorOrg.values()].reduce((a, b) => a + b, 0);
  return { mrr_cents: mrr, por_status, faturas_abertas: { quantidade: (abertas ?? []).length, total_cents: total, vencidas }, linhas };
}

export async function faturasDaOrganizacao(admin: SupabaseClient, organizationId: string): Promise<Fatura[]> {
  const { data, error } = await admin
    .from("billing_invoices")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) erro("faturas", error);
  return (data ?? []) as Fatura[];
}

export async function planosDisponiveis(admin: SupabaseClient): Promise<Plano[]> {
  const { data, error } = await admin.from("billing_plans").select("*").order("sort_order");
  if (error) erro("planos", error);
  return (data ?? []) as Plano[];
}

/** Troca o plano (e opcionalmente o ciclo). Não mexe em status nem período: quem cobra a diferença é a próxima fatura. */
export async function trocarPlano(
  admin: SupabaseClient,
  organizationId: string,
  planSlug: string,
  billingCycle?: "monthly" | "yearly",
): Promise<{ de: string; para: string }> {
  const { data: plano, error } = await admin.from("billing_plans").select("id, slug").eq("slug", planSlug).maybeSingle();
  if (error) erro("plano", error);
  if (!plano) throw new Error("billing_plan_not_found");
  const { data: atual, error: e2 } = await admin
    .from("billing_subscriptions")
    .select("plan_id, billing_plans!inner(slug)")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (e2) erro("assinatura", e2);
  if (!atual) throw new Error("billing_subscription_not_found");
  const de = (atual as unknown as { billing_plans: { slug: string } }).billing_plans.slug;
  const patch: Record<string, unknown> = { plan_id: plano.id };
  if (billingCycle) patch.billing_cycle = billingCycle;
  const { error: e3 } = await admin.from("billing_subscriptions").update(patch).eq("organization_id", organizationId);
  if (e3) erro("trocar plano", e3);
  await sincronizarOrcamentoDeIA(admin);
  return { de, para: plano.slug };
}

/** Estende o trial (ou o período vigente) em N dias. Sem pagamento, sem fatura: é cortesia do superadmin. */
export async function estenderPrazo(admin: SupabaseClient, organizationId: string, dias: number): Promise<{ novo_fim: string }> {
  const { data: s, error } = await admin
    .from("billing_subscriptions")
    .select("status, current_period_end, trial_ends_at")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) erro("assinatura", error);
  if (!s) throw new Error("billing_subscription_not_found");
  const fim = new Date(s.current_period_end);
  fim.setUTCDate(fim.getUTCDate() + dias);
  const patch: Record<string, unknown> = { current_period_end: fim.toISOString() };
  if (s.status === "trialing" || s.status === "past_due") {
    patch.trial_ends_at = fim.toISOString();
    if (s.status === "past_due") Object.assign(patch, { status: "trialing", dunning_stage: 0, dunning_stage_at: null });
  }
  const { error: e2 } = await admin.from("billing_subscriptions").update(patch).eq("organization_id", organizationId);
  if (e2) erro("estender", e2);
  return { novo_fim: fim.toISOString() };
}

/** Fatura avulsa: do período vigente (kind subscription) ou de crédito de IA. */
export async function emitirFatura(
  admin: SupabaseClient,
  organizationId: string,
  pedido: { kind: "subscription" } | { kind: "ai_credit"; amount_cents: number; credit_cents: number; description?: string },
): Promise<{ invoice_id: string }> {
  const { data: s, error } = await admin
    .from("billing_subscriptions")
    .select("id, status, billing_cycle, current_period_start, current_period_end")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) erro("assinatura", error);
  if (!s) throw new Error("billing_subscription_not_found");
  if (pedido.kind === "subscription") {
    const vence = new Date(); vence.setUTCDate(vence.getUTCDate() + 3);
    // Em teste grátis, o que se fatura é o PRIMEIRO MÊS PAGO, que começa quando
    // o teste termina — nunca a semana de teste (medido: a 1ª versão cobrava
    // R$ 397 por 18→25/09). Fora do teste, é o período vigente.
    let inicio = s.current_period_start;
    let fim = s.current_period_end;
    if (s.status === "trialing") {
      inicio = s.current_period_end;
      const f = new Date(inicio);
      if (s.billing_cycle === "yearly") f.setUTCFullYear(f.getUTCFullYear() + 1); else f.setUTCMonth(f.getUTCMonth() + 1);
      fim = f.toISOString();
    }
    const { data, error: e2 } = await admin.rpc("fn_billing_emitir_fatura", {
      p_sub: s.id, p_inicio: inicio, p_fim: fim, p_vence: vence.toISOString().slice(0, 10),
    });
    if (e2) erro("emitir", e2);
    return { invoice_id: data as string };
  }
  const vence = new Date(); vence.setUTCDate(vence.getUTCDate() + 3);
  const { data, error: e3 } = await admin
    .from("billing_invoices")
    .insert({
      organization_id: organizationId, subscription_id: s.id, amount_cents: pedido.amount_cents, kind: "ai_credit",
      credit_cents: pedido.credit_cents, description: pedido.description ?? "Crédito extra de IA",
      due_date: vence.toISOString().slice(0, 10), provider: "manual",
    })
    .select("id")
    .single();
  if (e3) erro("emitir crédito", e3);
  return { invoice_id: (data as { id: string }).id };
}

export async function cancelarAssinatura(admin: SupabaseClient, organizationId: string, motivo: string): Promise<void> {
  const { error } = await admin
    .from("billing_subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), notes: motivo })
    .eq("organization_id", organizationId);
  if (error) erro("cancelar", error);
  await sincronizarOrcamentoDeIA(admin);
}

/** A org dona de uma fatura — para o guard de suporte da rota de pagamento. */
export async function organizacaoDaFatura(admin: SupabaseClient, invoiceId: string): Promise<string | null> {
  const { data, error } = await admin.from("billing_invoices").select("organization_id").eq("id", invoiceId).maybeSingle();
  if (error) erro("fatura", error);
  return data?.organization_id ?? null;
}
