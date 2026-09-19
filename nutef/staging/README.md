# Staging — crm-staging.nutef.com

Ambiente de staging do Nutef CRM na VPS da Nutef (Docker Swarm atrás do Traefik v2 da casa).
Subido e validado em 2026-09-18 (Fase 0 do PRD, passo 1 do §62).

## Desenho

```
https://crm-staging.nutef.com ──Traefik──► nutefcrm_crm-app ─┬─ crm-worker   (agente de IA, event_log)
                                                            ├─ crm-scheduler (crond → http://app:3000/api/v1/cron/*)
                                                            ├─ crm-waha     (WhatsApp, NOWEB)
                                                            └─ crm-redis + crm-srh (rate limit, debounce)
https://supabase-crm-staging.nutef.com ──Traefik──► nutefcrm-sb_crm-sb-kong ─► auth · rest · realtime · storage · meta · studio
                                                                              └─ crm-sb-db (supabase/postgres 15)
```

Dois stacks, uma overlay privada (`nutefcrm-staging`) onde os nomes curtos do compose do
upstream (`app`, `waha`, `redis`, `srh`) valem como alias — só o app e o Kong entram na rede
`Nutef` do Traefik. O porquê dos prefixos está no cabeçalho de cada stack.

## Arquivos

| Arquivo | Papel |
|---|---|
| `deploy.sh` | `init` · `supabase` · `schema` · `crm` · `validar` · `tudo` |
| `supabase-stack.yml` | Supabase dedicado (clone enxuto do template Orion que já roda na VPS) |
| `kong.yml` | rotas do Kong com os hosts prefixados; copiado para o deploy dir a cada subida |
| `crm-stack.yml` | app + worker + scheduler + WAHA + Redis, tradução do compose de produção do upstream |
| `env.example` | contrato do `.env` (o real fica em `/root/nutef-crm-deploy/staging/.env`, modo 600) |

Fora do git: `/root/nutef-crm-deploy/staging/` — `.env`, `supabase/db/data` (dados do Postgres),
`supabase/storage` (arquivos), `supabase/db/*.sql` (init scripts, copiados do template Orion),
`baseline-*.log`.

## Operar

```bash
bash nutef/staging/deploy.sh validar         # 11 sondas — o "está tudo no ar?"
bash nutef/staging/deploy.sh crm             # re-deploy do app (imagem nova: mude VERSAO_STAGING no deploy.sh)
bash nutef/staging/deploy.sh schema          # baseline do upstream + apêndice do fork (idempotentes) — depois de sync ou migration nova
docker service logs nutefcrm_crm-app --tail 100
docker service logs nutefcrm_crm-worker --tail 100
```

Login: o e-mail do dono e a senha estão em `OWNER_EMAIL` / `OWNER_PASSWORD` do `.env`. O dono é
admin da organização "Nutef" e super-admin da plataforma. Studio do Supabase: o domínio da API
com usuário/senha `SB_DASHBOARD_*`.

**Atualizar o CRM** = trocar `VERSAO_STAGING` (ou `APP_IMAGE`/`WORKER_IMAGE`/`SCHEDULER_IMAGE`
no `.env`), `deploy.sh schema` (o baseline é idempotente e é o que o `update.sh` do upstream
faz) e `deploy.sh crm`. Enquanto o CI do fork não publica imagens, as do upstream por número
servem — o fork é idêntico ao upstream em código de produto.

## O que foi validado em 2026-09-18

Pelas sondas (`deploy.sh validar`), todas verdes: domínio 307 → login, `/api/v1/health` 200 com
supabase/redis/waha `ok`, REST e Auth do Supabase pela URL pública, login do dono por password
grant, worker `healthz`, Redis `PONG`, SRH autenticando, WAHA respondendo com chave, webhook
global do WAHA bloqueado de fora (403), scheduler rodando.

Pela tela (Playwright, Chromium): `/login` com o título "Entrar · Nutef CRM", sem a palavra
Deskcomm no texto, `--color-accent` = `#1f7a3d`; login do dono leva a `/onboarding/welcome`,
zero erros de console e zero respostas ≥ 400. O onboarding aponta "falta a chave da IA" —
esperado: nenhuma chave foi configurada (BYOK pela tela em IA › Credenciais).

**Não validado (precisa de coisa que só o dono tem):** parear um número de WhatsApp (QR) e um
turno real do agente de IA (chave de provedor). São os dois primeiros passos da Fase 1.

## Armadilhas medidas nesta subida

- **Traefik v2 não conhece `ipallowlist`** (é `ipwhitelist`); o overlay do upstream usa o nome
  do v3. Middleware desconhecido derruba o router e o webhook global do WAHA fica aberto em
  silêncio — o app respondia 400 em vez do 403.
- **`docker stack deploy` não tira aspas do `env_file`** (`APP_NAME="Nutef CRM"` chega com as
  aspas), ao contrário do compose v2 que o `install.sh` alimenta. O `.env` daqui é literal, sem
  aspas, e o `deploy.sh` o lê linha a linha em vez de `source`.
- **Bind mount de diretório inexistente rejeita a task** em silêncio no swarm (`db/data` tinha
  de existir antes do primeiro deploy) — o `init` cria.
- **SRH não tem `GET /ping`**: o protocolo Upstash é `POST /` com `["PING"]` no corpo.
- Nome de serviço curto (`db`, `app`) na rede `Nutef` colide com outras stacks — daí os prefixos.
