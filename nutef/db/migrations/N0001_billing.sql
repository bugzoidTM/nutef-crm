-- N0001 — billing: planos, assinaturas, faturas, uso, eventos (Fase 1 do PRD)
--
-- Camada do fork Nutef CRM. Numeração própria (N00NN) para nunca colidir com as
-- migrations `_02NN_` do upstream. Idempotente por inteiro: `create ... if not
-- exists`, `create or replace function`, `drop policy if exists` — pode ser
-- reaplicada num banco que já a tem (é o que o deploy.sh schema faz).
--
-- Convenções herdadas do CLAUDE.md do motor: organization_id not null em toda
-- tabela tenant-aware; RLS ligada; policy `tenant_isolation_<tabela>_<op>` via
-- fn_user_org_ids(); vocabulário em text + check; dinheiro em _cents; função
-- nova em public revogada de PUBLIC e anon.
--
-- A verdade de ACESSO continua sendo organizations.status (o motor redireciona
-- para /account-suspended); billing_subscriptions.status é a verdade COMERCIAL.
-- Quem sincroniza as duas é o tick (app/api/v1/cron/billing-tick), nunca um
-- trigger — trigger que decide acesso viraria uma segunda autoridade.

-- ---------------------------------------------------------------- planos ----
create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9-]{1,31}$'),
  name text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  yearly_price_cents integer check (yearly_price_cents is null or yearly_price_cents >= 0),
  max_users integer not null check (max_users > 0),
  max_whatsapp_numbers integer not null check (max_whatsapp_numbers > 0),
  ai_credit_cents integer not null check (ai_credit_cents >= 0),
  max_contacts integer check (max_contacts is null or max_contacts > 0),
  features jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object'),
  is_public boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PRD §22 e §25. Preços em centavos; crédito de IA mensal incluído.
insert into public.billing_plans (slug, name, monthly_price_cents, yearly_price_cents, max_users, max_whatsapp_numbers, ai_credit_cents, max_contacts, features, is_public, sort_order)
values
  ('start',     'Start',     39700,  397000, 3,  1, 5000,  5000,  '{"ai_employees":1,"automations":"basic","campaigns":false,"integrations":false,"api":false,"webhooks":false,"advanced_metrics":false,"priority_support":false}', true, 10),
  ('pro',       'Pro',       69700,  697000, 10, 3, 10000, 25000, '{"ai_employees":null,"automations":"full","campaigns":true,"integrations":true,"api":false,"webhooks":false,"advanced_metrics":true,"priority_support":false}', true, 20),
  ('growth',    'Growth',    129700, 1297000, 25, 10, 25000, null, '{"ai_employees":null,"automations":"full","campaigns":true,"integrations":true,"api":true,"webhooks":true,"advanced_metrics":true,"priority_support":true}', true, 30),
  ('dedicated', 'Dedicated', 199700, null, 100, 25, 50000, null, '{"ai_employees":null,"automations":"full","campaigns":true,"integrations":true,"api":true,"webhooks":true,"advanced_metrics":true,"priority_support":true,"dedicated_vps":true}', false, 40)
on conflict (slug) do nothing;

-- ---------------------------------------------------------- assinaturas ----
create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.billing_plans(id),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','suspended','cancelled')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','yearly')),
  started_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default now() + interval '7 days',
  cancel_at timestamptz,
  cancelled_at timestamptz,
  payment_provider text not null default 'manual' check (payment_provider in ('manual','asaas')),
  provider_customer_id text,
  provider_subscription_id text,
  -- PRD §24: 0 = em dia; 1 = aviso; 2 = envios automáticos bloqueados; 3 = conta suspensa
  dunning_stage smallint not null default 0 check (dunning_stage between 0 and 3),
  dunning_stage_at timestamptz,
  -- crédito extra de IA comprado no período (PRD §25), soma-se ao do plano
  ai_extra_credit_cents integer not null default 0 check (ai_extra_credit_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_period check (current_period_end > current_period_start),
  constraint billing_subscriptions_trial check (status <> 'trialing' or trial_ends_at is not null)
);
create index if not exists billing_subscriptions_status on public.billing_subscriptions(status, current_period_end);
create index if not exists billing_subscriptions_provider on public.billing_subscriptions(payment_provider, provider_subscription_id)
  where provider_subscription_id is not null;

-- --------------------------------------------------------------- faturas ----
create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid not null references public.billing_subscriptions(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'open' check (status in ('draft','open','paid','void','uncollectible')),
  kind text not null default 'subscription' check (kind in ('subscription','ai_credit','adjustment')),
  -- fatura de crédito de IA: quanto crédito (em centavos de IA) o pagamento libera
  credit_cents integer check (credit_cents is null or credit_cents > 0),
  description text,
  due_date date not null,
  paid_at timestamptz,
  paid_by uuid references auth.users(id) on delete set null,
  provider text not null default 'manual' check (provider in ('manual','asaas')),
  provider_invoice_id text,
  payment_url text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_invoices_paid check (status <> 'paid' or paid_at is not null),
  constraint billing_invoices_ai_credit check (kind <> 'ai_credit' or credit_cents is not null)
);
create unique index if not exists billing_invoices_provider_id on public.billing_invoices(provider, provider_invoice_id)
  where provider_invoice_id is not null;
create index if not exists billing_invoices_org on public.billing_invoices(organization_id, created_at desc);
create index if not exists billing_invoices_open on public.billing_invoices(due_date) where status = 'open';

-- ------------------------------------------------------------------- uso ----
-- Uma linha por organização por DIA, recalculada pelo tick (consulta, nunca
-- contador — a mesma regra dos eventos do Streampolis: contador diverge, consulta não).
create table if not exists public.billing_usage (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  messages_in integer not null default 0,
  messages_out integer not null default 0,
  ai_tokens bigint not null default 0,
  ai_cost_cents numeric(12,4) not null default 0,
  storage_bytes bigint not null default 0,
  whatsapp_numbers integer not null default 0,
  users integer not null default 0,
  contacts integer not null default 0,
  computed_at timestamptz not null default now(),
  primary key (organization_id, period_start)
);

-- ---------------------------------------------------------------- eventos ----
-- Webhooks do provedor e marcos internos, idempotentes por (provider, external_id).
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('manual','asaas','system')),
  external_id text not null,
  kind text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, external_id)
);
create index if not exists billing_events_org on public.billing_events(organization_id, created_at desc);
create index if not exists billing_events_pending on public.billing_events(created_at) where processed_at is null;

-- ----------------------------------------------------------- updated_at ----
drop trigger if exists trg_billing_plans_updated_at on public.billing_plans;
create trigger trg_billing_plans_updated_at before update on public.billing_plans
  for each row execute function public.fn_set_updated_at();
drop trigger if exists trg_billing_subscriptions_updated_at on public.billing_subscriptions;
create trigger trg_billing_subscriptions_updated_at before update on public.billing_subscriptions
  for each row execute function public.fn_set_updated_at();
drop trigger if exists trg_billing_invoices_updated_at on public.billing_invoices;
create trigger trg_billing_invoices_updated_at before update on public.billing_invoices
  for each row execute function public.fn_set_updated_at();

-- ------------------------------------------------------- RLS e privilégios ----
alter table public.billing_plans enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_usage enable row level security;
alter table public.billing_events enable row level security;

-- O baseline concede ALL a anon/authenticated/service_role por default ACL em
-- toda tabela nova de public (CLAUDE.md, "Audit log"). Fecha e reabre só o que
-- cada papel precisa: escrita é do servidor (service_role, via rotas do fork);
-- membro lê o que é da própria organização; anon não vê nada.
revoke all on public.billing_plans, public.billing_subscriptions, public.billing_invoices,
  public.billing_usage, public.billing_events from public, anon, authenticated;
grant select on public.billing_plans, public.billing_subscriptions, public.billing_invoices,
  public.billing_usage to authenticated;
grant all on public.billing_plans, public.billing_subscriptions, public.billing_invoices,
  public.billing_usage, public.billing_events to service_role;

drop policy if exists tenant_isolation_billing_plans_select on public.billing_plans;
create policy tenant_isolation_billing_plans_select on public.billing_plans
  for select to authenticated using (
    is_public
    or public.fn_is_platform_admin()
    or id in (select s.plan_id from public.billing_subscriptions s
              where s.organization_id in (select public.fn_user_org_ids()))
  );

drop policy if exists tenant_isolation_billing_subscriptions_select on public.billing_subscriptions;
create policy tenant_isolation_billing_subscriptions_select on public.billing_subscriptions
  for select to authenticated using (
    organization_id in (select public.fn_user_org_ids()) or public.fn_is_platform_admin()
  );

drop policy if exists tenant_isolation_billing_invoices_select on public.billing_invoices;
create policy tenant_isolation_billing_invoices_select on public.billing_invoices
  for select to authenticated using (
    organization_id in (select public.fn_user_org_ids()) or public.fn_is_platform_admin()
  );

drop policy if exists tenant_isolation_billing_usage_select on public.billing_usage;
create policy tenant_isolation_billing_usage_select on public.billing_usage
  for select to authenticated using (
    organization_id in (select public.fn_user_org_ids()) or public.fn_is_platform_admin()
  );

-- billing_events: só o servidor. Sem policy = ninguém autenticado lê (RLS ligada
-- e nenhuma policy nega tudo); service_role ignora RLS.

-- ------------------------------------------------------ nascer em trial ----
-- PRD §23: toda organização nova nasce com 7 dias de trial no plano Start, com
-- crédito de IA reduzido (R$ 20). Trigger AFTER INSERT, sem HTTP, sem decidir
-- acesso — só grava a linha comercial e o teto de IA que o motor já respeita.
create or replace function public.fn_billing_iniciar_trial()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_plan uuid;
begin
  select id into v_plan from public.billing_plans where slug = 'start';
  if v_plan is null then return new; end if;  -- catálogo ausente: não derruba a criação da org
  insert into public.billing_subscriptions (organization_id, plan_id, status, trial_ends_at,
    current_period_start, current_period_end, payment_provider, dunning_stage)
  values (new.id, v_plan, 'trialing', now() + interval '7 days', now(), now() + interval '7 days', 'manual', 0)
  on conflict (organization_id) do nothing;
  -- ai_budgets NÃO é semeada aqui, de propósito: o motor trata "sem linha" como
  -- estado próprio (tests/invariants/orcamento-nasce-desarmado.test.ts semeia a
  -- linha por conta própria e quebra com duplicata). O teto de IA do plano entra
  -- pelo tick (fn_billing_sincronizar_orcamento_ia), que roda de hora em hora.
  return new;
end $$;
revoke execute on function public.fn_billing_iniciar_trial() from public, anon, authenticated;
drop trigger if exists trg_billing_iniciar_trial on public.organizations;
create trigger trg_billing_iniciar_trial after insert on public.organizations
  for each row execute function public.fn_billing_iniciar_trial();

-- Organizações que já existiam quando o billing chegou (a "Nutef" do staging,
-- instalações antigas): ganham a linha com o mesmo trial, uma vez.
insert into public.billing_subscriptions (organization_id, plan_id, status, trial_ends_at,
  current_period_start, current_period_end, payment_provider)
select o.id, p.id, 'trialing', now() + interval '7 days', now(), now() + interval '7 days', 'manual'
  from public.organizations o cross join (select id from public.billing_plans where slug='start') p
 where not exists (select 1 from public.billing_subscriptions s where s.organization_id = o.id)
on conflict (organization_id) do nothing;

-- ------------------------------------------------------------- o portão ----
-- PRD §24, estágio 2: envios AUTOMÁTICOS (agente de IA, follow-up, campanha)
-- param; humano continua. O motor consulta esta função no caminho de envio; ela
-- é a ÚNICA leitura de billing que o motor faz. Fail-OPEN por desenho: sem
-- assinatura (instalação sem billing) ou sem linha, envia — bloquear por
-- ausência de dado comercial derrubaria toda instalação self-host do upstream.
create or replace function public.fn_billing_envio_automatico_permitido(p_org uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select s.status not in ('suspended','cancelled') and s.dunning_stage < 2
       from public.billing_subscriptions s where s.organization_id = p_org),
    true);
$$;
-- Só o servidor chama (worker/rota com service_role). Executável por
-- authenticated ela cairia na varredura da 0149 (definer com org no argumento
-- sem conferir pertencimento) — e ninguém logado precisa perguntar isso ao banco.
revoke execute on function public.fn_billing_envio_automatico_permitido(uuid) from public, anon, authenticated;
grant execute on function public.fn_billing_envio_automatico_permitido(uuid) to service_role;

-- Leitura consolidada para as telas (plano + assinatura + uso do mês), por org.
create or replace function public.fn_billing_resumo(p_org uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'subscription', to_jsonb(s) - 'notes',
    'plan', to_jsonb(p),
    'ai_budget', (select jsonb_build_object('monthly_limit_cents', b.monthly_limit_cents,
                    'consumed_cents', b.current_month_consumed_cents, 'is_throttled', b.is_throttled,
                    'is_disabled', b.is_disabled) from public.ai_budgets b where b.organization_id = p_org),
    'usage_month', (select jsonb_build_object(
        'messages_in', coalesce(sum(u.messages_in),0), 'messages_out', coalesce(sum(u.messages_out),0),
        'ai_tokens', coalesce(sum(u.ai_tokens),0), 'ai_cost_cents', coalesce(sum(u.ai_cost_cents),0),
        'users', coalesce(max(u.users),0), 'whatsapp_numbers', coalesce(max(u.whatsapp_numbers),0),
        'contacts', coalesce(max(u.contacts),0))
      from public.billing_usage u
      where u.organization_id = p_org and u.period_start >= date_trunc('month', now())::date),
    'open_invoices', (select coalesce(jsonb_agg(to_jsonb(i) order by i.due_date), '[]'::jsonb)
      from public.billing_invoices i where i.organization_id = p_org and i.status = 'open')
  )
  from public.billing_subscriptions s
  join public.billing_plans p on p.id = s.plan_id
  where s.organization_id = p_org
    -- sem usuário na sessão = chamada do servidor (service_role); com usuário, só a própria org
    and (auth.uid() is null or s.organization_id in (select public.fn_user_org_ids())
         or public.fn_is_platform_admin());
$$;
revoke execute on function public.fn_billing_resumo(uuid) from public, anon;
grant execute on function public.fn_billing_resumo(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- o tick ----
-- Tudo o que o cron diário faz mora no banco, em funções: uma transação por
-- passo, testável no Postgres descartável dos invariantes, e a rota HTTP vira
-- só autenticação + chamada + auditoria (quando houve efeito).

-- Uso do dia: CONSULTA, nunca contador. Recalcula a linha inteira do dia.
create or replace function public.fn_billing_agregar_uso(p_dia date default current_date)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_n integer;
begin
  insert into public.billing_usage as u (organization_id, period_start, messages_in, messages_out,
    ai_tokens, ai_cost_cents, whatsapp_numbers, users, contacts, computed_at)
  select s.organization_id, p_dia,
    (select count(*) from public.messages m where m.organization_id = s.organization_id
       and m.direction = 'inbound' and m.created_at >= p_dia and m.created_at < p_dia + 1),
    (select count(*) from public.messages m where m.organization_id = s.organization_id
       and m.direction = 'outbound' and m.created_at >= p_dia and m.created_at < p_dia + 1),
    (select coalesce(sum(i.total_tokens),0) from public.ai_invocations i where i.organization_id = s.organization_id
       and i.created_at >= p_dia and i.created_at < p_dia + 1),
    (select coalesce(sum(i.cost_cents),0) from public.ai_invocations i where i.organization_id = s.organization_id
       and i.created_at >= p_dia and i.created_at < p_dia + 1),
    (select count(*) from public.channel_sessions c where c.organization_id = s.organization_id
       and c.status in ('STARTING','SCAN_QR_CODE','WORKING')),
    (select count(*) from public.user_organizations uo where uo.organization_id = s.organization_id
       and uo.accepted_at is not null and uo.revoked_at is null),
    (select count(*) from public.contacts c where c.organization_id = s.organization_id
       and not c.is_anonymized and c.is_merged_into is null),
    now()
  from public.billing_subscriptions s
  on conflict (organization_id, period_start) do update set
    messages_in = excluded.messages_in, messages_out = excluded.messages_out,
    ai_tokens = excluded.ai_tokens, ai_cost_cents = excluded.ai_cost_cents,
    whatsapp_numbers = excluded.whatsapp_numbers, users = excluded.users,
    contacts = excluded.contacts, computed_at = now();
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function public.fn_billing_agregar_uso(date) from public, anon, authenticated;
grant execute on function public.fn_billing_agregar_uso(date) to service_role;

-- Crédito de IA do plano → teto que o motor já respeita (ai_budgets). O motor lê
-- `enforcement_mode` + `enforcement_effective_at` (migration 0159 do upstream;
-- is_disabled/action_at_100pct são legado sem escritor). Num SaaS o crédito do
-- plano É a intenção declarada, então aqui o modo nasce 'bloquear' e vale já —
-- a carência de 72h da tela existe para o admin que arma à mão, não para o
-- contrato. Trial fica no crédito reduzido; suspensa/cancelada não é tocada (o
-- estágio 3 já fecha a org inteira).
create or replace function public.fn_billing_sincronizar_orcamento_ia()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_n integer;
begin
  -- past_due fica de FORA de propósito: quem está em atraso mantém o teto que
  -- tinha (trial continua em R$ 20; quem pagou antes continua no do plano) —
  -- subir o crédito de quem ainda não pagou seria premiar o atraso.
  insert into public.ai_budgets as b (organization_id, monthly_limit_cents, enforcement_mode, enforcement_effective_at)
  select s.organization_id,
    case when s.status = 'trialing' then 2000 else p.ai_credit_cents + s.ai_extra_credit_cents end,
    'bloquear', now()
  from public.billing_subscriptions s join public.billing_plans p on p.id = s.plan_id
  where s.status in ('trialing','active')
  on conflict (organization_id) do update set
    monthly_limit_cents = excluded.monthly_limit_cents,
    enforcement_mode = 'bloquear',
    enforcement_effective_at = coalesce(b.enforcement_effective_at, now()),
    updated_at = now()
  where b.monthly_limit_cents is distinct from excluded.monthly_limit_cents
     or b.enforcement_mode is distinct from 'bloquear'
     or b.enforcement_effective_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function public.fn_billing_sincronizar_orcamento_ia() from public, anon, authenticated;
grant execute on function public.fn_billing_sincronizar_orcamento_ia() to service_role;

-- Fatura do período: uma por (assinatura, period_start), idempotente. Provider
-- `manual` nasce `open` sem link; o Asaas (Fase 1B) preenche payment_url depois.
create or replace function public.fn_billing_emitir_fatura(p_sub uuid, p_inicio timestamptz, p_fim timestamptz, p_vence date)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_org uuid; v_valor integer; v_prov text; v_ciclo text;
begin
  select s.organization_id, s.payment_provider, s.billing_cycle,
         case when s.billing_cycle = 'yearly' then coalesce(p.yearly_price_cents, p.monthly_price_cents * 12) else p.monthly_price_cents end
    into v_org, v_prov, v_ciclo, v_valor
    from public.billing_subscriptions s join public.billing_plans p on p.id = s.plan_id where s.id = p_sub;
  if v_org is null then return null; end if;
  select id into v_id from public.billing_invoices where subscription_id = p_sub and kind = 'subscription'
    and period_start = p_inicio and status <> 'void';
  if v_id is not null then return v_id; end if;
  insert into public.billing_invoices (organization_id, subscription_id, amount_cents, kind, description,
    due_date, provider, period_start, period_end)
  values (v_org, p_sub, v_valor, 'subscription',
    'Assinatura ' || case when v_ciclo = 'yearly' then 'anual' else 'mensal' end || ' — ' ||
      to_char(p_inicio at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || ' a ' || to_char(p_fim at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'),
    p_vence, v_prov, p_inicio, p_fim)
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.fn_billing_emitir_fatura(uuid, timestamptz, timestamptz, date) from public, anon, authenticated;
grant execute on function public.fn_billing_emitir_fatura(uuid, timestamptz, timestamptz, date) to service_role;

-- Pagamento confirmado (manual pelo superadmin, ou webhook do provedor): fatura
-- paga, assinatura ativa, período rolado, régua zerada, org reativada se foi o
-- billing quem suspendeu. Idempotente: pagar fatura já paga não rola o período.
create or replace function public.fn_billing_confirmar_pagamento(p_fatura uuid, p_por uuid default null, p_quando timestamptz default now())
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare f record; s record; v_novo_fim timestamptz;
begin
  select * into f from public.billing_invoices where id = p_fatura for update;
  if f.id is null then raise exception using errcode = 'P0002', message = 'billing_invoice_not_found'; end if;
  if f.status = 'paid' then return jsonb_build_object('applied_now', false, 'invoice_id', f.id); end if;
  update public.billing_invoices set status = 'paid', paid_at = p_quando, paid_by = p_por where id = f.id;
  select * into s from public.billing_subscriptions where id = f.subscription_id for update;
  if f.kind = 'ai_credit' then
    update public.billing_subscriptions set ai_extra_credit_cents = ai_extra_credit_cents + coalesce(f.credit_cents, 0) where id = s.id;
  elsif f.kind = 'subscription' then
    v_novo_fim := coalesce(f.period_end, s.current_period_end);
    update public.billing_subscriptions set
      status = 'active', dunning_stage = 0, dunning_stage_at = null,
      current_period_start = coalesce(f.period_start, s.current_period_start),
      current_period_end = v_novo_fim,
      trial_ends_at = case when s.status = 'trialing' then p_quando else s.trial_ends_at end
      where id = s.id;
    update public.organizations set status = 'active', suspended_at = null, suspended_reason = null, suspended_by = null
      where id = s.organization_id and status = 'suspended' and suspended_reason like 'billing:%';
  end if;
  perform public.fn_billing_sincronizar_orcamento_ia();
  return jsonb_build_object('applied_now', true, 'invoice_id', f.id, 'organization_id', f.organization_id, 'kind', f.kind);
end $$;
revoke execute on function public.fn_billing_confirmar_pagamento(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.fn_billing_confirmar_pagamento(uuid, uuid, timestamptz) to service_role;

-- A régua (PRD §24). Entra em past_due quando o trial ou o período vence sem
-- pagamento; 3 dias depois bloqueia envios automáticos (estágio 2); 10 dias
-- depois suspende a org (estágio 3). Nunca apaga nada. Devolve contagens e as
-- orgs que mudaram de estágio (para a rota avisar, quando houver e-mail).
create or replace function public.fn_billing_tick(p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r record; v_venceu int := 0; v_e2 int := 0; v_e3 int := 0; v_faturas int := 0; v_uso int := 0; v_ia int := 0;
  v_mudaram jsonb := '[]'::jsonb; v_fim timestamptz; v_id uuid;
begin
  -- 1) trial/período vencido sem pagamento → past_due estágio 1 + fatura
  for r in select s.* from public.billing_subscriptions s
            where s.status in ('trialing','active') and s.current_period_end <= p_now
            for update skip locked loop
    v_fim := case when r.billing_cycle = 'yearly' then r.current_period_end + interval '1 year' else r.current_period_end + interval '1 month' end;
    v_id := public.fn_billing_emitir_fatura(r.id, r.current_period_end, v_fim, (p_now + interval '3 days')::date);
    if v_id is not null then v_faturas := v_faturas + 1; end if;
    update public.billing_subscriptions set status = 'past_due', dunning_stage = 1, dunning_stage_at = p_now where id = r.id;
    v_venceu := v_venceu + 1;
    v_mudaram := v_mudaram || jsonb_build_object('organization_id', r.organization_id, 'stage', 1, 'from', r.status);
  end loop;
  -- 2) 3 dias em atraso → envios automáticos bloqueados
  for r in select s.* from public.billing_subscriptions s
            where s.status = 'past_due' and s.dunning_stage = 1 and s.dunning_stage_at <= p_now - interval '3 days'
            for update skip locked loop
    update public.billing_subscriptions set dunning_stage = 2, dunning_stage_at = p_now where id = r.id;
    v_e2 := v_e2 + 1;
    v_mudaram := v_mudaram || jsonb_build_object('organization_id', r.organization_id, 'stage', 2);
  end loop;
  -- 3) 10 dias em atraso → conta suspensa (somente leitura pelo motor)
  for r in select s.* from public.billing_subscriptions s
            where s.status = 'past_due' and s.dunning_stage = 2 and s.dunning_stage_at <= p_now - interval '7 days'
            for update skip locked loop
    update public.billing_subscriptions set status = 'suspended', dunning_stage = 3, dunning_stage_at = p_now where id = r.id;
    update public.organizations set status = 'suspended', suspended_at = p_now,
      suspended_reason = 'billing: assinatura em atraso há mais de 10 dias'
      where id = r.organization_id and status = 'active';
    v_e3 := v_e3 + 1;
    v_mudaram := v_mudaram || jsonb_build_object('organization_id', r.organization_id, 'stage', 3);
  end loop;
  -- 4) uso de ontem e de hoje (ontem fecha o dia; hoje é parcial) + teto de IA
  v_uso := public.fn_billing_agregar_uso((p_now - interval '1 day')::date) + public.fn_billing_agregar_uso(p_now::date);
  v_ia := public.fn_billing_sincronizar_orcamento_ia();
  return jsonb_build_object('past_due', v_venceu, 'stage2', v_e2, 'stage3', v_e3, 'invoices', v_faturas,
    'usage_rows', v_uso, 'ai_budgets_synced', v_ia, 'changed', v_mudaram,
    -- 'effect' é o que decide auditar: recalcular o uso não é mutação de estado
    -- comercial (é consulta materializada), então fica de fora — senão a rodada
    -- de hora em hora auditaria 720 vezes por mês sem nada ter acontecido.
    'effect', (v_venceu + v_e2 + v_e3 + v_faturas + v_ia) > 0);
end $$;
revoke execute on function public.fn_billing_tick(timestamptz) from public, anon, authenticated;
grant execute on function public.fn_billing_tick(timestamptz) to service_role;
