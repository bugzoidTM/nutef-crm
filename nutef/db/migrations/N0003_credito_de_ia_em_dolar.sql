-- N0003 — crédito de IA na unidade do motor (centavo de DÓLAR) + taxa de câmbio da plataforma
--
-- O motor mede custo de IA em centavos de dólar (lib/agent-engine/edge/llm/
-- pricing.ts e o próprio BudgetCard do upstream dizem isso) e NÃO converte
-- moeda. A N0001 semeou `ai_credit_cents` como se fosse real: um plano "R$ 50"
-- dava um teto de US$ 50 (~5,5× mais IA do que se vende). Aqui:
--   1. `ai_credit_cents` passa a ser DECLARADAMENTE centavo de dólar;
--   2. os planos recebem o equivalente em dólar dos valores do PRD §25
--      (R$ 50 / 100 / 250 ≈ US$ 9 / 18 / 45 a 5,5) e o trial US$ 4 (≈ R$ 20);
--   3. a taxa `usd_brl` entra em nutef_platform_settings — só para MOSTRAR
--      "≈ R$" nas telas; nenhuma cobrança usa câmbio.

comment on column public.billing_plans.ai_credit_cents is
  'Crédito mensal de IA em CENTAVOS DE DÓLAR — a unidade em que o motor mede custo (ai_budgets.monthly_limit_cents). As telas mostram "≈ R$" pela taxa nutef_platform_settings.usd_brl.';

update public.billing_plans set ai_credit_cents = v.c
  from (values ('start', 900), ('pro', 1800), ('growth', 4500), ('dedicated', 9000)) as v(slug, c)
 where public.billing_plans.slug = v.slug
   and public.billing_plans.ai_credit_cents in (5000, 10000, 25000, 50000); -- só quem ainda tem a semente da N0001

insert into public.nutef_platform_settings (key, value)
values ('usd_brl', '{"rate": 5.5, "note": "só para exibir ≈ R$; nenhuma cobrança usa câmbio"}'::jsonb)
on conflict (key) do nothing;

-- Trial: US$ 4 (≈ R$ 20) em vez dos 2000 (US$ 20) da N0001.
create or replace function public.fn_billing_sincronizar_orcamento_ia()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_n integer;
begin
  insert into public.ai_budgets as b (organization_id, monthly_limit_cents, enforcement_mode, enforcement_effective_at)
  select s.organization_id,
    case when s.status = 'trialing' then 400 else p.ai_credit_cents + s.ai_extra_credit_cents end,
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

-- fn_billing_resumo passa a devolver a taxa (definição integral: a N0001 é reaplicada antes desta).
-- Leitura consolidada para as telas (plano + assinatura + uso do mês), por org.
create or replace function public.fn_billing_resumo(p_org uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'subscription', to_jsonb(s) - 'notes',
    'plan', to_jsonb(p),
    -- N0003: taxa só para EXIBIR ≈ R$ (o motor mede IA em centavos de dólar)
    'usd_brl', (select (value->>'rate')::numeric from public.nutef_platform_settings where key = 'usd_brl'),
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

notify pgrst, 'reload schema';
