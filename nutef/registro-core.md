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
| 2026-09-18 | `.github/workflows/ci.yml` (bloco `env:` no job `verify`) | Repo privado roda em runner 2 vCPU/7 GB; o `tsc` estoura o heap padrão do Node (OOM, exit 134, 2× no PR #3) | `verify` passa a rodar com `--max-old-space-size=5120` | **Baixo–médio** — 6 linhas no cabeçalho do job; o upstream mexe nos `steps`, não ali. Some quando o repo virar público ou usar runner maior |
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
