# Registro de modificações no core

Exigido pelo PRD §63: **toda** mudança fora de `nutef/` (e fora de arquivos novos que o upstream
não tem) entra aqui com motivo, arquivos, impacto e risco de conflito. Arquivo NOVO em diretório
do upstream (ex.: um workflow a mais em `.github/workflows/`) também entra, porque o upstream pode
um dia criar um homônimo.

Antes de acrescentar uma linha, a pergunta é a do §63: *há uma forma de extensão?*
`EXTENDER > SOBRESCREVER > MODIFICAR CORE`.

| Data | Arquivos | Motivo | Impacto | Risco de conflito |
|---|---|---|---|---|
| 2026-09-18 | `CLAUDE.md` (1 linha, logo abaixo do título) | Toda sessão de IA lê o `CLAUDE.md`; sem um ponteiro para `nutef/README.md` a camada do fork é invisível para quem chega | Zero em runtime; só leitura de agentes | **Baixo** — uma linha em posição estável (o upstream edita o corpo, não o cabeçalho). Conflito, se houver, resolve mantendo as duas versões |
| 2026-09-18 | `.github/workflows/seguranca.yml` (novo) | PRD §35: gitleaks + `pnpm audit` no CI; o upstream não tem secret scanning | Job novo em PR e push na `main`; `audit` é informativo | **Baixo** — nome que o upstream não usa; se um dia criar `seguranca.yml`, renomear o nosso |
| 2026-09-18 | `tests/unit/gatilho-dos-jobs-de-entrega.test.ts` (2 entradas no mapa `GATILHO_ESPERADO`) | O teste enumera TODO job de TODO workflow e reprova job fora do mapa — os dois jobs de `seguranca.yml` precisam constar | Só o teste | **Baixo** — entradas no fim do mapa, sob comentário próprio; conflito só se o upstream mexer na última entrada (`relogio.yml::tick`) |
| 2026-09-18 | `.github/workflows/ci.yml` (bloco `env:` no job `verify`) | Repo privado roda em runner 2 vCPU/7 GB; o `tsc` estoura o heap padrão do Node (OOM, exit 134, 2× no PR #3) | `verify` passa a rodar com `--max-old-space-size=5120` e `timeout-minutes: 40` (a suíte de unidade foi cancelada aos 15 min no runner menor); `tests/unit/preambulo-do-ci-nao-come-o-relogio.test.ts` fixa esse teto e foi atualizado com a razão | **Baixo–médio** — 6 linhas no cabeçalho do job; o upstream mexe nos `steps`, não ali. Some quando o repo virar público ou usar runner maior |
| 2026-09-18 (Fase 1A) | `scripts/test-db.sh` (1 linha: `TEST_DB_BASELINE` sobreponível) | Rodar os invariantes do upstream contra baseline + apêndice do fork | Nenhum sem a variável | **Baixo** |
| 2026-09-18 (Fase 1A) | `tests/invariants/rls-completude-varredura.test.ts` (lista `PROVA_PROPRIA_DO_FORK` + laço condicional) | A varredura exige prova comportamental de toda tabela tenant-aware; as do fork só existem no banco do fork, então a cobrança é condicional à presença | Só o teste | **Baixo–médio** — bloco próprio no topo; o laço do "ainda existem" ganhou 6 linhas |
| 2026-09-18 (Fase 1A) | `lib/audit/actions.ts` (7 códigos `billing.*` no fim do array) | `AuditAction` é união fechada; a rota do tick audita | Vocabulário de auditoria cresce | **Baixo** — apêndice no fim, sob comentário |
| 2026-09-18 (Fase 1A) | `docker/scheduler/entrypoint.sh` (1 linha de cron) | `cron-routes-scheduled.test.ts` exige toda rota de cron agendada | `billing-tick` de hora em hora | **Baixo** — última linha da lista |
| 2026-09-18 (Fase 1A) | `lib/agent-engine/guardrails/before-send.ts` (gate `billing` na posição 3, `ctx.billing`, versão da cadeia 7→8) + `tests/unit/before-send-chain-shape.test.ts` | Estágio 2 da régua: bloquear envios AUTOMÁTICOS. `runBeforeSend` é o funil único de todo envio automático (6 chamadores); um gate ali é o único ponto correto. Fail-open sem `ctx.billing` | Todo envio automático consulta `fn_billing_envio_automatico_permitido` (1 SELECT barato, com `to_regprocedure` para instalação sem o fork) | **Médio** — o upstream muda essa cadeia com frequência (v1→v7 em 2 meses); toda mudança de ordem lá vai conflitar aqui. Resolver mantendo `billing` logo após `lgpd` e bumpando a versão |
| 2026-09-18 (Fase 1A) | `lib/ai/guardrails/lista-de-conferencia.ts` (1 entrada `billing`, na posição da cadeia) + `lib/ai/agents/avaliar-resposta-de-teste.ts` (1 linha) | Dois gates do upstream exigem que TODO gate da cadeia tenha explicação para o dono do negócio e declare se é avaliável no "Testar" | Texto na tela de segurança do agente | **Baixo** — entradas isoladas; a ordem tem de casar com a cadeia |
| 2026-09-18 (Fase 1A) | `app/api/v1/cron/billing-tick/route.ts` (novo) | Rota do cron precisa morar em `app/api/v1/cron/` (os testes varrem o diretório) | Rota nova | **Baixo** — nome que o upstream não usa |
| 2026-09-18 (Fase 1A) | `tests/invariants/nutef-billing.test.ts`, `tests/unit/nutef-billing-tick-route.test.ts` (novos) | Provas do fork nos diretórios de teste do upstream (o runner varre por diretório) | — | **Baixo** — prefixo `nutef-` |
| 2026-09-18 (Fase 1C) | `app/app/settings/billing/page.tsx` | A porta "Billing" já existia no menu como placeholder "Em breve — Fase 2"; a página vira delegadora para `nutef/billing/ui/PaginaCobranca` (auth + org da sessão continuam do upstream) | Tela de cobrança do cliente | **Baixo** — placeholder que o upstream não evolui |
| 2026-09-18 (Fase 1C) | `app/admin/(protected)/tenants/[id]/layout.tsx` (1 aba), `components/admin/AdminSidebar.tsx` (1 item + ícone) | Porta para `/admin/tenants/:id/cobranca` e `/admin/cobranca` | Navegação do superadmin | **Baixo** — 1 linha em cada lista |
| 2026-09-18 (Fase 1C) | `app/globals.css` (`@source "../nutef"`) | Tailwind 4 só gera classes das pastas em `@source`; o teste `tailwind-tokens` EXIGE a pasta quando ela escreve className | Nenhum além do CSS gerado | **Baixo** — 1 linha |
| 2026-09-18 (Fase 1C) | `lib/i18n/dicionario.ts` (1 chave `"Cobrança"` no fim) | `i18n-espanhol-cobre-a-tela` reprova `t()` sem espanhol em `app/`; as telas em `nutef/` ficam fora da varredura e são pt-BR por ora | — | **Baixo–médio** — o upstream também apende no fim; conflito trivial |
| 2026-09-18 (Fase 1C) | `app/admin/(protected)/cobranca/`, `app/admin/(protected)/tenants/[id]/cobranca/`, `app/api/v1/admin/billing/**` (novos) | Páginas e rotas precisam morar em `app/` (App Router) | Rotas admin novas: painel, detalhe, trocar plano, estender prazo, emitir fatura, cancelar, marcar paga — todas `requirePlatformAdmin` + `requireSupportWrite` + Zod + audit | **Baixo** — nomes que o upstream não usa |
| 2026-09-18 (Fase 2) | `app/onboarding/done/page.tsx` (1 import + 1 componente) | Aviso do teste grátis no "Tudo pronto!" do onboarding | Texto a mais na última tela | **Baixo** — o componente mora em `nutef/billing/ui`; a página só o renderiza |
| 2026-09-18 (Fase 2) | `lib/instalacao/prova-de-credito.ts` (+ teste): `max_completion_tokens` 1→16 na sonda da OpenAI | Bug do upstream: a família gpt-5 (inclusive o padrão curado `gpt-5.6-terra`) responde 400 à sonda de 1 token; a etapa "Treinar" dizia "a chave foi aceita, mas o teste não passou" com chave válida | Sonda passa a custar ~9 tokens em vez de 1 | **Baixo** — **candidato a PR para o upstream** (medição na própria linha) |
| 2026-09-18 (Fase 1/2) | `lib/agent-engine/edge/llm/run-model-call.ts` (1 linha: `costCents(...) ?? custoPeloCatalogo(...)`) | A tabela fixa de preços do motor só tem Claude; para OpenAI grava `cost_cents=null` e o crédito de IA do plano nunca é consumido (medido: 30 chamadas, 205k tokens, custo 0) | Chamadas a modelos do catálogo passam a ter custo; orçamento por org volta a valer | **Baixo** — 1 linha; a lógica vive em `nutef/billing/preco-do-catalogo.ts`. **Candidato a PR upstream** |
| 2026-09-18 (Fase 3A) | `app/app/ai/agents/[id]/_components/AgentForm.tsx` (prop `inicial` em modo create, 1 spread), `app/app/ai/agents/new/page.tsx` (`?modelo=` → `preenchimentoDoModelo`) | Um modelo de funcionário é só pré-preenchimento da tela de criação do motor; sem isso teria de haver um formulário paralelo (duplicação) | Nenhum sem `?modelo=` | **Médio-baixo** — o AgentForm muda com frequência no upstream, mas a alteração são 8 linhas em dois pontos estáveis (props e `baseline`) |
| 2026-09-18 (Fase 3A) | `app/app/ai/agents/_components/AgentsList.tsx` (botão "Contratar funcionário de IA" nos dois estados), `lib/navigation/catalogo.ts` (porta `/app/ai/funcionarios`, fora do sidebar), `lib/i18n/dicionario.ts` (5 chaves) | Porta para a vitrine; o grupo de IA do sidebar fixa 3 itens (`navegacao-registry.test.ts`) | Um botão a mais na lista | **Baixo** |
| 2026-09-18 (Fase 3A) | `app/app/ai/funcionarios/page.tsx` (novo) | Página da vitrine (o conteúdo mora em `nutef/funcionarios/ui`) | Rota nova | **Baixo** |
| 2026-09-18 | `hostgator-setup-kit/_common.sh` (`IMG_NS` + URL do repo), `docker-compose.prod.yml` (3 defaults `image:`), `.env.hostgator.example` (3 `*_IMAGE`), `install.sh`/`comecar.sh` (`REPO_URL`), 3 `Dockerfile*` (`image.source`), `tests/unit/namespace-das-imagens.test.ts` (âncora) | O fork publica as próprias imagens em `ghcr.io/bugzoidtm`; o gate `namespace-das-imagens-runtime-owner` exige que `IMG_NS` seja do dono do repo que roda o CI, e a âncora exige a troca coerente nesses lugares (é o "recado ao fork" escrito no próprio teste) | Instalações a partir deste repo puxam as imagens do fork; o `agent.sh`/`update.sh` do kit apontam para este repositório | **Médio** — literais em 9 arquivos que o upstream também edita raramente; o próprio teste lista os lugares, então um conflito é resolvido reaplicando a troca |
| 2026-09-18 | `.github/workflows/e2e.yml` (`timeout-minutes` 30→60 em `e2e-parte`; `--retries=1` no comando do Playwright) | Runner privado de 2 vCPU: a parte 2 foi cancelada aos 30 min; depois, 14 specs caíram por tempo (toBeVisible/timeout) nas partes 1 e 3 | Um retry por spec no CI; falha real continua vermelha | **Baixo** |
| 2026-09-18 | `hostgator-setup-kit/test-validators.sh` (caso do 403 aponta `REPO_URL` para um bare local com tag) | Repo privado: `git ls-remote` anônimo devolve vazio e o instalador cai em `latest` antes do aviso; o caso passa a não depender de rede | Só o teste | **Baixo** |
| 2026-09-18 | `.gitleaks.toml` (novo) | Config do gitleaks com a linha de base de falsos positivos medida | Nenhum em runtime | **Baixo** — arquivo que o upstream não tem |

## O que NÃO foi modificado, de propósito

- **Marca**: nome, cor e logo são configuração (`APP_NAME`, `APP_ACCENT_HEX`, `/admin/marca`).
  Nenhuma constante de marca foi tocada; `tests/unit/branding.test.ts` continua a régua.
- **Imagens Docker**: o staging usa as imagens publicadas pelo upstream por número de versão
  (`IMG_NS` de `hostgator-setup-kit/_common.sh`), sem editar compose nem kit. O dia em que o CI
  do fork publicar as suas, `IMG_NS` muda em UM lugar e o teste âncora
  (`tests/unit/namespace-das-imagens.test.ts`) cobra a coerência — essa troca será a primeira
  modificação de core "de verdade" e entra nesta tabela.
- **Deploy**: os stacks de swarm em `nutef/staging/` são tradução do `docker-compose.prod.yml` +
  `docker-compose.traefik.yml`, não edição deles.

## Dívida conhecida: e2e parte 3 no runner privado (2026-09-18)

Sete specs (`agenda-presenca-recuperacao`, `central-avisos-destino`, `encerramento-atendimento`,
`roteamento-por-canal`, `interface-por-vinculo`, `organizacoes-criacao-convite-e-cache`,
`suporte-temporario`) falham DUAS vezes (retry incluído) no runner de 2 vCPU do repo privado, e
passam no upstream (4 vCPU). Todos exercitam duas organizações + inbox em tempo real; o log do
servidor mostra `The destination stream closed early` (resposta cortada) — sintoma de capacidade,
não de produto. O PR #3 não toca código de produto, então `e2e` não entrou nos checks
obrigatórios da `main` por enquanto. **Saída correta:** runner self-hosted nesta VPS (31 GB /
muitos núcleos) para os jobs `e2e-parte`, ou o plano pago do GitHub com runner de 4 núcleos.
Até lá, mudança de UI do fork é provada pela tela no staging (Playwright), como o §64 pede.
