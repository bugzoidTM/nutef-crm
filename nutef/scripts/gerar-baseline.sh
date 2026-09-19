#!/usr/bin/env bash
# Concatena nutef/db/migrations/N*.sql (ordem lexicográfica) no apêndice
# nutef/db/baseline-nutef.sql, preservando o cabeçalho do arquivo.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
out=nutef/db/baseline-nutef.sql
{ sed -n '1,/^-- =*$/p' "$out" | sed '$!b' ; } > /tmp/nutef-baseline-header.$$ 2>/dev/null || true
# cabeçalho = tudo até a 2ª linha de "-- ====" (inclusive)
awk 'BEGIN{n=0} {print} /^-- =+$/{n++; if(n==2) exit}' "$out" > /tmp/nutef-baseline-header.$$
{
  cat /tmp/nutef-baseline-header.$$
  for f in nutef/db/migrations/N*.sql; do
    printf '\n-- ---- %s ----\n' "$(basename "$f" .sql)"
    cat "$f"
  done
} > "$out.tmp"
mv "$out.tmp" "$out"; rm -f /tmp/nutef-baseline-header.$$
echo "✓ $out ($(wc -l < "$out") linhas, $(ls nutef/db/migrations/N*.sql | wc -l) migration(s))"
