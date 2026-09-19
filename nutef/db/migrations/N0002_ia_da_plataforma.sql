-- N0002 — IA da plataforma: toda organização nasce pensando com o provedor
-- que o SaaS contratou (PRD §25: o crédito de IA vem no plano; o cliente
-- nunca cola chave). Fase 2 do PRD (onboarding).
--
-- Como o motor já funciona: a chave da INSTALAÇÃO (OPENAI_API_KEY no .env) é
-- o último degrau da escada de credenciais, e a etapa "Treinar" do onboarding
-- mostra "O cérebro dele: … pronta para uso" quando ela existe para o provedor
-- da organização. O que faltava: o trigger do upstream
-- (fn_seed_org_llm_defaults) semeia `anthropic` fixo. Este arquivo põe um
-- segundo trigger, que dispara DEPOIS (ordem alfabética de BEFORE INSERT:
-- trg_seed_org_llm_defaults < trg_zz_nutef_org_llm) e troca o provedor/modelo
-- pelos da plataforma. Sem linha em nutef_platform_settings, não faz nada —
-- instalação sem o fork continua igual.

create table if not exists public.nutef_platform_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.nutef_platform_settings enable row level security;
revoke all on public.nutef_platform_settings from public, anon, authenticated;
grant all on public.nutef_platform_settings to service_role;
-- sem policy: só o servidor lê e escreve (superadmin pelas rotas do fork)

-- O provedor/modelo do SaaS NÃO é semeado aqui: é CONFIGURAÇÃO da instalação,
-- não schema — como APP_NAME. Quem grava a linha `llm` é o deploy
-- (nutef/staging/deploy.sh schema, a partir de AI_PROVIDER do .env). Sem a
-- linha, o trigger abaixo não faz nada e a org nasce como no upstream — é o
-- que os invariantes do upstream esperam quando rodam sobre o schema do fork
-- (eles semeiam orgs contando com o provedor padrão e injetam a chave dele).

create or replace function public.fn_nutef_org_llm_da_plataforma()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v jsonb; v_prov text; v_model text;
begin
  select value into v from public.nutef_platform_settings where key = 'llm';
  if v is null then return new; end if;
  v_prov := v->>'provider';
  if v_prov is null then return new; end if;
  v_model := (select m.model_id from public.ai_models m
               where m.provider = v_prov and m.model_id = v->>'model' and m.deprecated_at is null limit 1);
  if v_model is null then
    v_model := (select m.model_id from public.ai_models m
                 where m.provider = v_prov and m.is_default_for_provider and m.deprecated_at is null limit 1);
  end if;
  new.settings := jsonb_set(
    coalesce(new.settings, '{}'::jsonb), '{llm}',
    coalesce(new.settings->'llm', '{}'::jsonb)
      || jsonb_build_object('provider', v_prov)
      || case when v_model is null then '{}'::jsonb else jsonb_build_object('default_model', v_model) end,
    true);
  return new;
end $$;
revoke execute on function public.fn_nutef_org_llm_da_plataforma() from public, anon, authenticated;
drop trigger if exists trg_zz_nutef_org_llm on public.organizations;
create trigger trg_zz_nutef_org_llm before insert on public.organizations
  for each row execute function public.fn_nutef_org_llm_da_plataforma();

-- Organizações que já existiam com o default do upstream e nunca cadastraram
-- chave própria passam para o provedor da plataforma — uma vez (só faz algo
-- quando a linha `llm` existe, isto é, numa instalação configurada).
update public.organizations o
   set settings = jsonb_set(coalesce(o.settings,'{}'::jsonb), '{llm}',
         coalesce(o.settings->'llm','{}'::jsonb)
           || jsonb_build_object('provider', s.value->>'provider')
           || case when m.model_id is null then '{}'::jsonb else jsonb_build_object('default_model', m.model_id) end, true)
  from public.nutef_platform_settings s
  left join public.ai_models m on m.provider = s.value->>'provider' and m.model_id = s.value->>'model' and m.deprecated_at is null
 where s.key = 'llm'
   and coalesce(o.settings->'llm'->>'provider', 'anthropic') = 'anthropic'
   and (s.value->>'provider') <> 'anthropic'
   and not exists (select 1 from public.ai_provider_credentials c where c.organization_id = o.id);

notify pgrst, 'reload schema';
