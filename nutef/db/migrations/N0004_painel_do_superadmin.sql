-- N0004 — painel do superadmin (PRD §27/§28, Fase 5): a camada de NEGÓCIO em
-- cima do /admin do upstream. Duas funções service_role-only, uma consulta
-- cada, agregando o que já existe: billing (N0001), llm_calls (custo de IA),
-- channel_sessions (WhatsApp), incidents (erros), conversations (atividade).
--
-- Só números e ids de organização — nunca conteúdo de conversa, nome de
-- contato ou telefone: o superadmin vê SAÚDE e DINHEIRO, não o que os clientes
-- dos clientes escreveram (a mesma fronteira do PDF de LGPD do upstream).

-- Os KPIs do dashboard (§27).
create or replace function public.fn_nutef_kpis_da_plataforma()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with sub as (
    select s.status, s.billing_cycle, s.cancelled_at, p.monthly_price_cents, p.yearly_price_cents
      from public.billing_subscriptions s join public.billing_plans p on p.id = s.plan_id
  ),
  mrr as (
    select coalesce(sum(case when billing_cycle = 'yearly'
                             then round(coalesce(yearly_price_cents, monthly_price_cents * 12) / 12.0)
                             else monthly_price_cents end), 0)::bigint as cents
      from sub where status in ('active','past_due')
  ),
  ia as (
    select coalesce(sum(cost_cents), 0) as custo_mes_cents, count(*) as chamadas_mes
      from public.llm_calls where created_at >= date_trunc('month', now())
  ),
  wa as (
    select count(*) filter (where status = 'WORKING') as trabalhando,
           count(*) filter (where status in ('FAILED','STOPPED')) as com_problema,
           count(*) as total
      from public.channel_sessions
  ),
  inc as (
    select count(*) filter (where status = 'open') as abertos,
           count(*) filter (where status = 'open' and severity in ('critical','high')) as graves
      from public.incidents
  ),
  fat as (
    select count(*) as abertas, coalesce(sum(amount_cents), 0)::bigint as abertas_cents,
           count(*) filter (where due_date < current_date) as vencidas
      from public.billing_invoices where status = 'open'
  )
  select jsonb_build_object(
    'mrr_cents', (select cents from mrr),
    'arr_cents', (select cents from mrr) * 12,
    'ativos', (select count(*) from sub where status = 'active'),
    'trials', (select count(*) from sub where status = 'trialing'),
    'inadimplentes', (select count(*) from sub where status in ('past_due','suspended')),
    'cancelados_30d', (select count(*) from sub where status = 'cancelled' and cancelled_at >= now() - interval '30 days'),
    'organizacoes', (select count(*) from public.organizations where status <> 'redacted'),
    'ia', (select jsonb_build_object('custo_mes_cents', custo_mes_cents, 'chamadas_mes', chamadas_mes) from ia),
    'whatsapp', (select jsonb_build_object('trabalhando', trabalhando, 'com_problema', com_problema, 'total', total) from wa),
    'erros', (select jsonb_build_object('abertos', abertos, 'graves', graves) from inc),
    'faturas', (select jsonb_build_object('abertas', abertas, 'abertas_cents', abertas_cents, 'vencidas', vencidas) from fat)
  );
$$;
revoke execute on function public.fn_nutef_kpis_da_plataforma() from public, anon, authenticated;
grant execute on function public.fn_nutef_kpis_da_plataforma() to service_role;

-- Uma linha por organização (§28): usuários, números, consumo de IA, última
-- atividade, saúde — sem conteúdo.
create or replace function public.fn_nutef_saude_por_organizacao()
returns table (
  organization_id uuid,
  usuarios integer,
  numeros_total integer,
  numeros_trabalhando integer,
  ia_custo_mes_cents numeric,
  ia_teto_cents integer,
  ultima_atividade timestamptz,
  incidentes_abertos integer,
  conversas_abertas integer
) language sql stable security definer set search_path = public, pg_temp as $$
  select o.id,
    (select count(*)::int from public.user_organizations u where u.organization_id = o.id and u.accepted_at is not null and u.revoked_at is null),
    (select count(*)::int from public.channel_sessions c where c.organization_id = o.id),
    (select count(*)::int from public.channel_sessions c where c.organization_id = o.id and c.status = 'WORKING'),
    (select coalesce(sum(l.cost_cents), 0) from public.llm_calls l where l.organization_id = o.id and l.created_at >= date_trunc('month', now())),
    (select b.monthly_limit_cents from public.ai_budgets b where b.organization_id = o.id),
    (select max(c.last_message_at) from public.conversations c where c.organization_id = o.id),
    (select count(*)::int from public.incidents i where i.organization_id = o.id and i.status = 'open'),
    (select count(*)::int from public.conversations c where c.organization_id = o.id and c.status = 'open')
  from public.organizations o
  where o.status <> 'redacted';
$$;
revoke execute on function public.fn_nutef_saude_por_organizacao() from public, anon, authenticated;
grant execute on function public.fn_nutef_saude_por_organizacao() to service_role;

notify pgrst, 'reload schema';
