# Nutef CRM — a camada do fork

> Leitura obrigatória para qualquer sessão que trabalhe neste repositório **depois** do
> `CLAUDE.md` (que continua sendo a doutrina do motor). O PRD comercial está em
> [`nutef/prd.md`](prd.md); este arquivo diz **como o fork se organiza** para que o motor
> (DeskcommCRM) continue atualizável.

## O que este repositório é

Um fork comercial do [DeskcommCRM](https://github.com/melgarafael/DeskcommCRM), que aqui é
tratado como **motor**, não como produto. O produto — Nutef CRM — é o que fica em cima: marca,
billing, onboarding comercial, funcionários de IA, templates por segmento, superadmin.

```
upstream  melgarafael/DeskcommCRM ──► origin  bugzoidTM/nutef-crm (privado)
                                        │
                                        ├── nutef/            ← TUDO do fork mora aqui
                                        │   ├── prd.md        o PRD comercial
                                        │   ├── identidade.md nome, cor, domínios, tom
                                        │   ├── registro-core.md  toda mudança no core, com motivo/impacto/risco
                                        │   ├── scripts/      sync-upstream.sh
                                        │   └── staging/      stacks + deploy.sh do ambiente de staging
                                        ├── .github/workflows/seguranca.yml  (gitleaks + audit)
                                        └── .gitleaks.toml
```

## As três regras

1. **`EXTENDER > SOBRESCREVER > MODIFICAR CORE`** (PRD §63). Antes de tocar em qualquer arquivo
   fora de `nutef/`, procure uma extensão: o upstream já tem marca própria por configuração
   (`docs/white-label.md`), extensões declarativas (`docs/doctrine/extensoes.md`) e um catálogo
   de navegação. Só quando não houver caminho, modifique — e **registre em
   [`registro-core.md`](registro-core.md)** (motivo, arquivos, impacto, risco de conflito).
2. **A doutrina do upstream continua valendo** para o código que vive fora de `nutef/`:
   multi-tenancy com RLS, tripla de migration (arquivo + apêndice do baseline + MANIFEST),
   Definition of Done, QA visual pela tela. O CI do upstream roda inteiro aqui e é a régua.
3. **Nada de marca no código.** Nome, cor e logo são `APP_NAME` / `APP_ACCENT_HEX` / upload pela
   tela (`/admin/marca`) — o teste `tests/unit/branding.test.ts` reprova marca vazada. "Nutef" só
   aparece em `nutef/`, em configuração e em documentação.

## Sincronizar com o upstream

```bash
bash nutef/scripts/sync-upstream.sh          # fetch + merge upstream/main na branch atual
```

O script recusa árvore suja e branch diferente de `main` sem `--branch`. Conflito é resolvido
com cabeça, nunca escolhendo um lado no automático — e todo conflito fora de `nutef/` é
sinal de que algo que deveria ser camada virou modificação de core.

## Ambientes

| Ambiente | Onde | Como |
|---|---|---|
| **staging** | `https://crm-staging.nutef.com` (VPS da Nutef, Docker Swarm) | [`nutef/staging/README.md`](staging/README.md) |
| produção | — ainda não existe (Fase 1+) | — |

## Fases (PRD §46–§53)

| Fase | Entrega | Estado |
|---|---|---|
| 0 | Fundação: identidade, upstream, staging, CI | **feita em 2026-09-18** |
| 1 | Billing: planos, assinaturas, faturas, trial, uso, suspensão | 1A+1C feitas 2026-09-18 (`fase-1-billing.md`); 1B Asaas aguarda credenciais |
| 2 | Onboarding em < 15 min | **feita 2026-09-18** (`fase-2-onboarding.md`): IA da plataforma, aviso do teste, IA medida; o relógio completo só com WhatsApp pareado |
| 3 | Funcionários de IA (UX sobre o motor de agentes) | **feita 2026-09-18** (`fase-3-funcionarios.md`): modelos Ana/Carlos/Marina/atendente, equipe com métricas, 19 ensaios |
| 4 | Templates: imobiliária, serviços, clínica | **feita 2026-09-18** (`fase-4-templates.md`): roteiro no prompt, campos do funil, retomada em rascunho, perguntas do Acervo; aplicado e provado no staging |
| 5 | Superadmin | o upstream já traz `/admin` (tenants, suspender, impersonar, uso, auditoria); a Fase 1C acrescentou `/admin/cobranca` e a aba Cobrança — falta decidir o que mais o §27/§28 pede |
| 5 | Superadmin | |
| 6 | 10 clientes pagantes | |
