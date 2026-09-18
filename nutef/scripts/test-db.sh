#!/usr/bin/env bash
# Roda a suíte de invariantes do upstream (scripts/test-db.sh) contra o schema
# COMPLETO do fork: supabase/baseline.sql + nutef/db/baseline-nutef.sql. Assim as
# varreduras de RLS, security definer, vocabulário e LGPD passam a medir também
# as tabelas do billing. Mesmos knobs do script do upstream (TEST_DB_IMAGE, etc.).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
bash nutef/scripts/gerar-baseline.sh >/dev/null
tmp="$(mktemp "${TMPDIR:-/tmp}/nutef-baseline.XXXXXX.sql")"
trap 'rm -f "$tmp"' EXIT
cat supabase/baseline.sql nutef/db/baseline-nutef.sql > "$tmp"
TEST_DB_BASELINE="$tmp" exec bash scripts/test-db.sh "$@"
