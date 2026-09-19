# Fase 1 — Billing (PRD §20–§26, §47)

Estado: **em execução desde 2026-09-18**. Este arquivo é o plano vivo; cada entrega marca o que
foi provado em staging.

## O que o motor JÁ tem (medido em 1.35.0) — e o que a Fase 1 reaproveita

| Peça do upstream | Onde | Como entra no billing |
|---|---|---|
| `organizations.status` (`active`/`suspended`/`redacted`/`archived`), `suspended_at/_reason/_by` | baseline, `app/app/layout.tsx:110` redireciona para `/account-suspended` | **Estágio 3 da suspensão** (PRD §24). Não reinventar |
| Rotas `POST /api/v1/admin/tenants/:id/suspend` e `/reactivate` (motivo ≥10 chars, audit) | `app/api/v1/admin/tenants/[id]/` | O tick do billing chama a mesma lógica; o superadmin já tem o botão |
| Console `/admin` (dashboard, tenants, usage, impersonate, audit, incidents) | `app/admin/(protected)/` | **Fase 5 já está 70% feita.** A Fase 1 acrescenta plano/assinatura/faturas ao tenant e um painel de MRR |
| `ai_budgets` (`monthly_limit_cents`, `action_at_100pct`, `is_throttled`, `is_disabled`) + `lib/ai/budget/check.ts` | baseline + agent-engine | **Crédito de IA por plano** (PRD §25): o plano grava `monthly_limit_cents`; o bloqueio a 100% já existe |
| `ai_invocations.cost_cents`, `ai_pricing` | baseline | Fonte do **uso de IA** (PRD §20 `usage.ai_cost`) |
| `user_organizations`, `channel_sessions`, `contacts`, `messages` | baseline | Fonte de `users`, `whatsapp_numbers`, `contacts`, `messages` do uso |
| `SUPPORT_EMAIL` nas telas de conta suspensa/cobrança | `lib/branding` | já resolve a marca |

## Decisões de arquitetura (o que muda no core fica em `registro-core.md`)

1. **Schema do fork em camada própria: `nutef/db/`.** Migrations do upstream são numeradas
   (`_02NN_`) e o CI reprova colisão — um fork que numere no mesmo espaço colide a cada sync.
   O fork tem `nutef/db/migrations/N00NN_<slug>.sql` (fonte da verdade) e
   `nutef/db/baseline-nutef.sql` (apêndice idempotente, aplicado DEPOIS do `supabase/baseline.sql`
   pelo `deploy.sh schema`). Mesmas regras do upstream: `organization_id not null`, RLS
   `tenant_isolation_<tabela>_all` via `fn_user_org_ids()`, `type text + check`, dinheiro em
   `_cents`, função nova revogada de `public, anon`.
2. **Os invariantes do upstream cobrem as tabelas do fork.** `scripts/test-db.sh` ganha 1 linha
   (`TEST_DB_BASELINE` sobreponível) e o fork roda a suíte de invariantes contra
   baseline + baseline-nutef num job próprio (`nutef-invariants`, em `seguranca.yml`). A varredura
   de RLS, de `security definer` e de vocabulário passam a medir as tabelas de billing.
3. **Estado de assinatura é do fork; efeito no acesso é do motor.** `billing_subscriptions.status`
   (`trialing → active → past_due → suspended → cancelled`) é a verdade comercial;
   `organizations.status='suspended'` continua sendo a verdade de acesso. O tick sincroniza os
   dois — nunca duas fontes decidindo acesso.
4. **Adapter de pagamento** (`nutef/billing/provider.ts`): `PaymentProvider` com `manual`
   (superadmin marca fatura como paga — lança sem gateway) e `asaas` (Pix/boleto/cartão,
   webhook). Stripe/MP ficam para depois. Chaves do Asaas no `.env`, nunca no banco.
5. **Enforcement de limites por plano é fail-open com aviso, não fail-closed** na primeira
   entrega: estourar `max_users`/`max_whatsapp_numbers` bloqueia o convite/a conexão NOVA com
   mensagem; nada que já existe é derrubado. Crédito de IA é a exceção — aí o motor já bloqueia.

## Modelo (nutef/db/migrations/N0001_billing.sql)

```
billing_plans            id, slug, name, monthly_price_cents, yearly_price_cents, max_users,
                         max_whatsapp_numbers, ai_credit_cents, max_contacts, features jsonb,
                         is_public, sort_order, created_at, updated_at        (catálogo, sem org)
billing_subscriptions    id, organization_id (unique), plan_id, status, started_at, trial_ends_at,
                         current_period_start, current_period_end, cancel_at, cancelled_at,
                         payment_provider ('manual'|'asaas'), provider_customer_id,
                         provider_subscription_id, dunning_stage int, dunning_stage_at,
                         created_at, updated_at
billing_invoices         id, organization_id, subscription_id, amount_cents, currency, status
                         ('draft'|'open'|'paid'|'void'|'uncollectible'), due_date, paid_at,
                         provider, provider_invoice_id (unique com provider), payment_url,
                         period_start, period_end, created_at
billing_usage            organization_id, period_start (date), messages_in, messages_out,
                         ai_tokens, ai_cost_cents, storage_bytes, whatsapp_numbers, users,
                         contacts, computed_at                        (pk org+period, 1 linha/dia)
billing_events           id, provider, external_id (unique com provider), kind, payload jsonb,
                         organization_id null, processed_at, error   (webhooks idempotentes)
```

Planos semeados (PRD §22/§25): `start` 397/50, `pro` 697/100, `growth` 1297/250, `dedicated`
1997/— (`is_public=false`, contrato). Trial (PRD §23): 7 dias no `start`, criado por trigger no
INSERT de `organizations` (a org nasce `trialing`; `ai_budgets.monthly_limit_cents` = crédito do
trial, reduzido: 2000).

## Tick (cron diário `billing-tick`)

1. trial vencido sem fatura paga → `past_due` (estágio 1: aviso na tela e e-mail se Resend)
2. `past_due` há 3 dias → estágio 2: **bloqueio de envios automáticos** (agente e follow-up não
   enviam; humano continua) — gate `fn_billing_envio_automatico_permitido(org)`
3. `past_due` há 10 dias → estágio 3: `organizations.status='suspended'` (somente leitura pelo
   motor); **nunca apaga dados** (PRD §24)
4. fatura paga → volta a `active`, zera estágio, reativa a org
5. virada de período → gera fatura do período seguinte (provider `manual`: `open` com
   instruções; `asaas`: cria cobrança e guarda `payment_url`)
6. agrega `billing_usage` do dia e sincroniza `ai_budgets.monthly_limit_cents` com o plano

## Entregas (cada uma é um PR provado em staging)

- [x] **1A — schema + planos + trial + uso + tick + estágios** (sem gateway: provider `manual`) — código em 2026-09-18; schema aplicado no staging (org Nutef em trial até 25/09, teto de IA R$ 20 armado). A rota do tick e o gate só passam a rodar lá quando o staging trocar para a imagem do fork
- [ ] **1B — Asaas**: cliente, assinatura, cobrança, webhook idempotente, conciliação
- [x] **1C — telas** (código em 2026-09-18): `/app/settings/billing` (plano, situação, crédito de IA, faturas, como pagar), aba Cobrança em `/admin/tenants/:id` (trocar plano/ciclo, estender prazo, emitir fatura do período ou de crédito, marcar paga, cancelar) e `/admin/cobranca` (MRR/ARR, ativos, trials, atraso, faturas abertas, lista). Fica para depois: banner de `past_due` no shell do app e e-mail de aviso
- [ ] **1D — enforcement**: convite e conexão de número checam o plano; compra de crédito de IA

## Core que a Fase 1 tocou/vai tocar (o registro de verdade é registro-core.md)

`scripts/test-db.sh` (1 linha), `docker/scheduler/entrypoint.sh` (1 linha do cron; o teste
`cron-routes-scheduled` exige), `lib/auth/public-paths.ts` (webhook do Asaas),
`lib/navigation/catalogo.ts` (porta da tela de cobrança), 1 hook no caminho de envio do agente
(gate do estágio 2), o trigger de criação de org (para nascer `trialing`) e o layout do shell
(banner). Tudo pequeno e nomeado; a regra continua: se der para estender, não modificar.
