#!/usr/bin/env bash
# Nutef CRM — STAGING — subir, atualizar e validar (Docker Swarm, VPS da Nutef)
#
#   bash nutef/staging/deploy.sh init       gera o .env (segredos) — idempotente, nunca sobrescreve
#   bash nutef/staging/deploy.sh supabase   sobe o Supabase dedicado e espera Auth/Storage migrarem
#   bash nutef/staging/deploy.sh schema     extensões + baseline.sql + dono/super-admin
#   bash nutef/staging/deploy.sh crm        sobe app/worker/scheduler/waha/redis
#   bash nutef/staging/deploy.sh validar    sondas: health, login, worker, scheduler, redis, waha
#   bash nutef/staging/deploy.sh tudo       init → supabase → schema → crm → validar
#
# Espelha o que `hostgator-setup-kit/install.sh` faz numa VPS crua (gerar
# segredos, aplicar baseline, criar o dono via GoTrue + SQL), trocando o
# `docker compose` por `docker stack deploy`. Quando este script e o instalador
# discordarem sobre o QUE fazer, o instalador está certo; sobre o COMO subir
# nesta VPS, este arquivo (o Traefik daqui é swarm-only).
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$AQUI/../.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-/root/nutef-crm-deploy/staging}"
ENV_FILE="$DEPLOY_DIR/.env"
STACK_SB="nutefcrm-sb"
STACK_CRM="nutefcrm"
REDE="nutefcrm-staging"
PSQL_IMG="postgres:17-alpine"
# Versão NUMERADA das imagens (doutrina de packaging: nunca tag móvel). Bump = editar aqui.
VERSAO_STAGING="${VERSAO_STAGING:-1.35.0}"

c_grn() { printf '\033[32m%s\033[0m\n' "$*"; }
c_ylw() { printf '\033[33m%s\033[0m\n' "$*"; }
die()   { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
step()  { printf '\n\033[1m── %s\033[0m\n' "$*"; }

rand_hex() { openssl rand -hex "$1"; }
rand_b64() { openssl rand -base64 "$1" | tr -d '\n'; }
b64url()   { openssl base64 -e -A | tr '+/' '-_' | tr -d '='; }

# JWT HS256 para o Kong/GoTrue/PostgREST — o que o painel do Supabase cloud
# chama de anon key e service_role key. 10 anos, como o gerador oficial.
jwt() { # jwt <role> <secret>
  local h p s
  h=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  p=$(printf '{"role":"%s","iss":"supabase","iat":%d,"exp":%d}' "$1" "$(date +%s)" "$(( $(date +%s) + 315360000 ))" | b64url)
  s=$(printf '%s.%s' "$h" "$p" | openssl dgst -sha256 -hmac "$2" -binary | b64url)
  printf '%s.%s.%s' "$h" "$p" "$s"
}

# O .env é lido como o Docker lê (valor LITERAL, sem aspas), nunca com `source`:
# o env_file do `docker stack deploy` não tira aspas (medido com `docker stack
# config`: APP_NAME="Nutef CRM" chega ao contêiner COM as aspas), e sem aspas o
# `source` do bash quebra em qualquer valor com espaço. Um leitor só, o mesmo
# contrato dos dois lados.
carregar_env() {
  [ -f "$ENV_FILE" ] || die "$ENV_FILE não existe — rode: $0 init"
  local line
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
    export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
  done < "$ENV_FILE"
  export DEPLOY_DIR
}

# grava KEY=valor (literal, sem aspas — ver carregar_env) se a chave ainda não
# existe com valor no .env. Nunca sobrescreve: segredo gerado uma vez fica.
env_default() { # env_default KEY valor
  if grep -qE "^$1=.+" "$ENV_FILE" 2>/dev/null; then return 0; fi
  sed -i -E "/^$1=$/d" "$ENV_FILE"
  printf '%s=%s\n' "$1" "${2-}" >> "$ENV_FILE"
}

psql_privado() { # roda psql na overlay privada, com stdin
  docker run --rm -i --network "$REDE" "$PSQL_IMG" psql "$@"
}

# ─────────────────────────────────────────────────────────────────────────────
cmd_init() {
  step "init — $ENV_FILE"
  mkdir -p "$DEPLOY_DIR/supabase/db/data" "$DEPLOY_DIR/supabase/storage" "$DEPLOY_DIR/supabase/api"
  chmod 700 "$DEPLOY_DIR"
  touch "$ENV_FILE"; chmod 600 "$ENV_FILE"

  env_default APP_NAME "Nutef CRM"
  env_default APP_ACCENT_HEX "#1f7a3d"
  env_default APP_LOCALE "pt-BR"
  env_default APP_DOMAIN "crm-staging.nutef.com"
  env_default SB_DOMAIN "supabase-crm-staging.nutef.com"
  carregar_env
  env_default DOMAIN "$APP_DOMAIN"
  env_default NEXT_PUBLIC_APP_URL "https://$APP_DOMAIN"
  env_default WAHA_WEBHOOK_BASE_URL "https://$APP_DOMAIN"
  env_default DEPLOY_DIR "$DEPLOY_DIR"

  # O namespace das imagens vem de hostgator-setup-kit/_common.sh (IMG_NS), o
  # único lugar do repo autorizado a cravar o literal — o gate
  # tests/unit/namespace-das-imagens.test.ts reprova o literal em qualquer outro
  # arquivo. Quando o CI do fork passar a publicar, trocar IMG_NS lá troca aqui.
  local img_ns
  img_ns=$(sed -nE 's/^IMG_NS="([^"]+)"$/\1/p' "$REPO/hostgator-setup-kit/_common.sh")
  [ -n "$img_ns" ] || die "não achei IMG_NS em hostgator-setup-kit/_common.sh"
  env_default APP_IMAGE "$img_ns/deskcommcrm:$VERSAO_STAGING"
  env_default WORKER_IMAGE "$img_ns/deskcomm-worker:$VERSAO_STAGING"
  env_default SCHEDULER_IMAGE "$img_ns/deskcomm-scheduler:$VERSAO_STAGING"
  env_default WAHA_IMAGE "devlikeapro/waha:latest-2026.7.2"

  env_default SB_POSTGRES_PASSWORD "$(rand_hex 16)"
  env_default SB_JWT_SECRET "$(rand_hex 32)"
  env_default SB_SECRET_KEY_BASE "$(rand_hex 32)"
  env_default SB_DASHBOARD_USERNAME "nutef"
  env_default SB_DASHBOARD_PASSWORD "$(rand_hex 12)"
  carregar_env
  env_default SB_ANON_KEY "$(jwt anon "$SB_JWT_SECRET")"
  env_default SB_SERVICE_ROLE_KEY "$(jwt service_role "$SB_JWT_SECRET")"
  carregar_env
  env_default NEXT_PUBLIC_SUPABASE_URL "https://$SB_DOMAIN"
  env_default NEXT_PUBLIC_SUPABASE_ANON_KEY "$SB_ANON_KEY"
  env_default SUPABASE_SERVICE_ROLE_KEY "$SB_SERVICE_ROLE_KEY"
  env_default SUPABASE_DB_URL "postgres://postgres:$SB_POSTGRES_PASSWORD@crm-sb-db:5432/postgres"

  for k in INTERNAL_SECRET INTERNAL_CRON_SECRET CPF_ENCRYPTION_KEY AI_CRED_AES_KEY \
           WAHA_BYO_ENCRYPTION_KEY IMPERSONATE_COOKIE_SECRET LGPD_SIGNING_KEY \
           NUVEMSHOP_OAUTH_ENCRYPTION_KEY WAHA_HMAC_SECRET SRH_TOKEN; do
    env_default "$k" "$(rand_b64 32)"
  done
  env_default WAHA_API_KEY "$(rand_hex 24)"
  carregar_env
  env_default WAHA_API_KEY_SHA512 "$(printf '%s' "$WAHA_API_KEY" | openssl dgst -sha512 -hex | awk '{print $NF}')"
  env_default WAHA_API_BASE_URL "http://waha:3000"
  env_default WAHA_WEBHOOK_REQUIRE_SIGNATURE "true"
  env_default WHATSAPP_DEFAULT_ENGINE "NOWEB"
  env_default UPSTASH_REDIS_REST_URL "http://srh:80"
  env_default UPSTASH_REDIS_REST_TOKEN "$SRH_TOKEN"
  env_default AI_PROVIDER "anthropic"
  env_default SENTRY_DSN "off"
  env_default NUVEMSHOP_ENABLED "false"
  env_default INTERNAL_AGENT_RUN_STUB "false"
  env_default NODE_ENV "production"
  env_default OWNER_EMAIL "${OWNER_EMAIL:-eleniltonfreitas2009@gmail.com}"
  env_default OWNER_PASSWORD "$(rand_b64 18)"
  env_default OWNER_ORG_NAME "Nutef"

  # arquivos montados nos contêineres
  cp "$AQUI/kong.yml" "$DEPLOY_DIR/supabase/api/kong.yml"
  if [ ! -f "$DEPLOY_DIR/supabase/db/roles.sql" ]; then
    die "faltam os init scripts do Postgres em $DEPLOY_DIR/supabase/db (copie do template Orion: /root/supabase/docker/volumes/db/*.sql)"
  fi
  docker network inspect "$REDE" >/dev/null 2>&1 || docker network create --driver overlay --attachable "$REDE" >/dev/null
  c_grn "✓ .env pronto ($(grep -c '=' "$ENV_FILE") chaves), rede $REDE existe"
}

cmd_supabase() {
  carregar_env
  step "supabase — stack $STACK_SB"
  cp "$AQUI/kong.yml" "$DEPLOY_DIR/supabase/api/kong.yml"
  docker stack deploy --detach=true -c "$AQUI/supabase-stack.yml" "$STACK_SB" >/dev/null
  printf 'esperando o Postgres'
  for _ in $(seq 1 60); do
    if psql_privado "postgres://postgres:$SB_POSTGRES_PASSWORD@crm-sb-db:5432/postgres" -tAc 'select 1' >/dev/null 2>&1; then break; fi
    printf '.'; sleep 5
  done; echo
  psql_privado "postgres://postgres:$SB_POSTGRES_PASSWORD@crm-sb-db:5432/postgres" -tAc 'select 1' >/dev/null 2>&1 || die "Postgres não respondeu em 5 min: docker service logs ${STACK_SB}_crm-sb-db"
  printf 'esperando GoTrue e Storage migrarem (auth.users, storage.buckets)'
  for _ in $(seq 1 60); do
    ok=$(psql_privado "postgres://postgres:$SB_POSTGRES_PASSWORD@crm-sb-db:5432/postgres" -tAc \
      "select count(*) from information_schema.tables where (table_schema,table_name) in (('auth','users'),('storage','buckets'))" 2>/dev/null || echo 0)
    [ "$ok" = "2" ] && break
    printf '.'; sleep 5
  done; echo
  [ "$ok" = "2" ] || die "auth.users/storage.buckets não apareceram: docker service logs ${STACK_SB}_crm-sb-auth / crm-sb-storage"
  c_grn "✓ Supabase de pé; API em https://$SB_DOMAIN"
}

cmd_schema() {
  carregar_env
  local DB="postgres://postgres:$SB_POSTGRES_PASSWORD@crm-sb-db:5432/postgres"
  step "schema — extensões + baseline.sql"
  psql_privado "$DB" -v ON_ERROR_STOP=1 -c \
    "create extension if not exists vector with schema public; create extension if not exists citext with schema public; create extension if not exists pg_trgm with schema public;" >/dev/null
  local log="$DEPLOY_DIR/baseline-$(date +%Y%m%d-%H%M%S).log"
  local has
  has=$(psql_privado "$DB" -tAc "select count(*) from information_schema.tables where table_schema='public' and table_name='organizations'")
  if [ "$has" = "0" ]; then
    # banco novo: ON_ERROR_STOP, como o install.sh
    psql_privado "$DB" -v ON_ERROR_STOP=1 -f - < "$REPO/supabase/baseline.sql" > "$log" 2>&1 \
      || die "baseline.sql falhou (log: $log)"
  else
    # banco existente: reaplicar SEM a flag, como o update.sh (apêndice idempotente)
    psql_privado "$DB" -f - < "$REPO/supabase/baseline.sql" > "$log" 2>&1 || true
    c_ylw "baseline reaplicado em banco existente; erros ignorados por desenho — $(grep -c ERROR "$log" || true) linhas ERROR em $log"
  fi
  local n
  n=$(psql_privado "$DB" -tAc "select count(*) from information_schema.tables where table_schema='public'")
  c_grn "✓ schema aplicado — $n tabelas em public"

  step "schema — dono e super-admin ($OWNER_EMAIL)"
  # 1) usuário no GoTrue (admin API), idempotente: 422 se já existe
  code=$(curl -s -o /tmp/nutefcrm-owner.json -w '%{http_code}' -X POST "https://$SB_DOMAIN/auth/v1/admin/users" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"locale\":\"$APP_LOCALE\"}}")
  case "$code" in 200|201) c_grn "  usuário criado no Auth";; 422) c_ylw "  usuário já existia no Auth";; *) die "GoTrue admin respondeu $code: $(cat /tmp/nutefcrm-owner.json)";; esac
  rm -f /tmp/nutefcrm-owner.json
  # 2) organização + vínculo admin + platform_admin (o mesmo bloco do install.sh)
  local slug
  slug=$(printf '%s' "$OWNER_ORG_NAME" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g')
  psql_privado "$DB" -v ON_ERROR_STOP=1 <<SQL >/dev/null
do \$\$
declare v_org uuid; v_uid uuid;
begin
  select id into v_uid from auth.users where email = '$OWNER_EMAIL';
  if v_uid is null then raise exception 'usuário % não está em auth.users', '$OWNER_EMAIL'; end if;
  select id into v_org from public.organizations where slug='$slug';
  if v_org is null then
    insert into public.organizations (slug, display_name, legal_name, locale, created_by)
    values ('$slug','$OWNER_ORG_NAME','$OWNER_ORG_NAME','$APP_LOCALE', v_uid) returning id into v_org;
  end if;
  insert into public.user_organizations (user_id, organization_id, role, accepted_at)
  values (v_uid, v_org, 'admin', now())
  on conflict (user_id, organization_id) do update set role='admin', revoked_at=null;
  if not exists (select 1 from public.platform_admins where user_id=v_uid and revoked_at is null) then
    insert into public.platform_admins (user_id, granted_by, scope, mfa_required, reason)
    values (v_uid, v_uid, 'full', false, 'Bootstrap do staging Nutef CRM');
  end if;
end \$\$;
SQL
  c_grn "✓ dono promovido a admin da org '$OWNER_ORG_NAME' e super-admin da plataforma"
}

cmd_crm() {
  carregar_env
  step "crm — stack $STACK_CRM"
  docker stack deploy --detach=true -c "$AQUI/crm-stack.yml" "$STACK_CRM" >/dev/null
  printf 'esperando o app'
  for _ in $(seq 1 60); do
    if curl -sf -o /dev/null "https://$APP_DOMAIN/api/v1/health"; then break; fi
    printf '.'; sleep 5
  done; echo
  curl -sf -o /dev/null "https://$APP_DOMAIN/api/v1/health" || c_ylw "health ainda não respondeu 200 — veja: docker service logs ${STACK_CRM}_crm-app"
  docker stack services "$STACK_CRM" --format '  {{.Name}}  {{.Replicas}}  {{.Image}}'
}

cmd_validar() {
  carregar_env
  step "validar — $APP_DOMAIN"
  local falhas=0
  sonda() { # sonda <nome> <comando...>
    local nome="$1"; shift
    if "$@" >/dev/null 2>&1; then c_grn "  ✓ $nome"; else printf '  \033[31m✗ %s\033[0m\n' "$nome"; falhas=$((falhas+1)); fi
  }
  sonda "domínio responde 307 (redireciona ao login)" bash -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' https://$APP_DOMAIN/)\" = 307 ]"
  sonda "health 200" curl -sf "https://$APP_DOMAIN/api/v1/health"
  sonda "Supabase REST responde com anon key" curl -sf -H "apikey: $SB_ANON_KEY" "https://$SB_DOMAIN/rest/v1/"
  sonda "Supabase Auth settings" curl -sf -H "apikey: $SB_ANON_KEY" "https://$SB_DOMAIN/auth/v1/settings"
  sonda "login do dono (password grant)" bash -c "curl -sf -X POST 'https://$SB_DOMAIN/auth/v1/token?grant_type=password' -H 'apikey: $SB_ANON_KEY' -H 'Content-Type: application/json' -d '{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASSWORD\"}' | grep -q access_token"
  sonda "worker healthz (8787)" bash -c "docker run --rm --network $REDE alpine:3.20 wget -qO- http://worker:8787/healthz"
  sonda "redis PONG" bash -c "docker run --rm --network $REDE redis:7-alpine redis-cli -h redis ping | grep -q PONG"
  # protocolo REST do Upstash: POST com o comando em JSON, não GET /ping
  sonda "srh (Upstash-compatível) autentica" bash -c "docker run --rm --network $REDE alpine:3.20 wget -qO- --header='Authorization: Bearer $SRH_TOKEN' --header='Content-Type: application/json' --post-data='[\"PING\"]' http://srh:80/ | grep -qi pong"
  sonda "waha API responde (com chave)" bash -c "docker run --rm --network $REDE alpine:3.20 wget -qO- --header='X-Api-Key: $WAHA_API_KEY' http://waha:3000/api/sessions"
  sonda "webhook global do waha bloqueado de fora (403)" bash -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' -X POST https://$APP_DOMAIN/api/v1/webhooks/waha)\" = 403 ]"
  sonda "scheduler crond vivo" bash -c "docker service ps ${STACK_CRM}_crm-scheduler --format '{{.CurrentState}}' | head -1 | grep -q Running"
  local nota="  serviços: "
  nota+=$(docker stack services "$STACK_CRM" --format '{{.Name}}={{.Replicas}}' | sed "s/${STACK_CRM}_//" | tr '\n' ' ')
  echo "$nota"
  [ "$falhas" = 0 ] && c_grn "✓ staging válido" || die "$falhas sonda(s) falharam"
}

case "${1:-}" in
  init)     cmd_init ;;
  supabase) cmd_supabase ;;
  schema)   cmd_schema ;;
  crm)      cmd_crm ;;
  validar)  cmd_validar ;;
  tudo)     cmd_init; cmd_supabase; cmd_schema; cmd_crm; cmd_validar ;;
  *) sed -n '2,10p' "$0"; exit 1 ;;
esac
