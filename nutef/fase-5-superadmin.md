# Fase 5 — Superadmin (PRD §27, §28, §51)

O upstream já traz o console: `/admin` com dashboard operacional (conversas pendentes, alertas
de banimento do WhatsApp, LGPD em risco, avisos de orçamento de IA), tenants (suspender,
reativar, impersonar como suporte, saúde, agente), uso de IA por tenant, auditoria, incidentes,
usuários, platform admins, marca. A Fase 1C acrescentou a cobrança. O que faltava para o §27/§28
era a **camada de negócio**, e é o que esta fase põe em cima — sem mexer nas telas do motor:

| PRD | Onde | Fonte |
|---|---|---|
| §27 MRR, ARR, clientes ativos, trials, cancelamentos, inadimplência | faixa **Negócio** no topo de `/admin/dashboard` | `fn_nutef_kpis_da_plataforma()` (N0004) sobre billing |
| §27 uso total de IA | idem ("IA no mês": custo em US$ + chamadas) | `llm_calls` do mês |
| §27 sessões WhatsApp | idem ("WhatsApp": trabalhando/total, com problema) | `channel_sessions.status` |
| §27 erros | idem ("Erros abertos", graves) → `/admin/incidents` | `incidents` |
| §27 infraestrutura | link para `/api/v1/health` (Supabase, Redis, WAHA) | motor |
| §28 empresa, plano, status, nº usuários, números conectados, consumo IA, MRR, última atividade, saúde | `/admin/cobranca` → **Clientes e cobrança** (uma linha por org) | `fn_nutef_saude_por_organizacao()` + billing |
| §28 ações: suspender, reativar, impersonar, logs | página do tenant do motor (`/admin/tenants/:id`) e `/admin/audit` | motor |
| §28 ações: trocar plano, adicionar crédito | aba Cobrança do tenant (Fase 1C) | fork |

Fronteira deliberada: o superadmin vê **saúde e dinheiro**, nunca conteúdo — as duas funções
devolvem só números e ids (nada de mensagem, nome de contato ou telefone), a mesma linha que o
PDF de LGPD do upstream traça.

"Saúde" em uma palavra, o pior sinal ganha: org suspensa › incidente aberto › WhatsApp fora ›
IA no teto › sem WhatsApp › ok.

## Provado no staging (2026-09-19, pela tela)

`/admin/dashboard`: faixa **Negócio** com MRR/ARR, clientes ativos (1 organização · 1 em teste),
inadimplência, cancelamentos, IA no mês (US$ 0,22 · 171 chamadas), WhatsApp 0/0, erros 0, infra —
em cima dos KPIs operacionais do motor. `/admin/cobranca` ("Clientes e cobrança"): 11 colunas;
a linha Nutef mostra Start · Período de teste · 1 usuário · WhatsApp 0/0 · IA US$ 0,22 / US$ 4,00 ·
sem conversas · saúde "sem WhatsApp". Zero erros de console/4xx.
