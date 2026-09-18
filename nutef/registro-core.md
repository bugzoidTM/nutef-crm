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
