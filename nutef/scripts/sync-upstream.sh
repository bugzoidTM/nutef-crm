#!/usr/bin/env bash
# Traz o upstream (melgarafael/DeskcommCRM) para dentro da branch atual — PRD §33.
#
#   bash nutef/scripts/sync-upstream.sh              # merge upstream/main na main
#   bash nutef/scripts/sync-upstream.sh --branch X   # ...numa branch de trabalho
#
# Segue a higiene de branches do CLAUDE.md: nunca reset/force; só fast-forward
# ou merge; árvore suja pára antes de qualquer coisa. Conflito FORA de nutef/ é
# sinal de camada que virou modificação de core — confira nutef/registro-core.md.
set -euo pipefail

UPSTREAM_URL="https://github.com/melgarafael/DeskcommCRM.git"
alvo="main"
[ "${1:-}" = "--branch" ] && alvo="${2:?--branch exige o nome}"

cd "$(git rev-parse --show-toplevel)"

if ! git remote get-url upstream >/dev/null 2>&1; then
  git remote add upstream "$UPSTREAM_URL"
  echo "remote upstream criado → $UPSTREAM_URL"
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "✗ árvore suja — commite ou guarde (stash) antes de sincronizar" >&2
  exit 1
fi

atual=$(git rev-parse --abbrev-ref HEAD)
if [ "$atual" != "$alvo" ]; then
  echo "✗ você está em '$atual'; o alvo é '$alvo' (use --branch $atual para sincronizar esta)" >&2
  exit 1
fi

git fetch upstream --quiet
git fetch origin --quiet

atras=$(git rev-list --count "HEAD..upstream/main")
frente=$(git rev-list --count "upstream/main..HEAD")
echo "upstream/main: $atras commit(s) a trazer · fork: $frente commit(s) próprios"
[ "$atras" = 0 ] && { echo "✓ já em dia com o upstream"; exit 0; }

if [ "$frente" = 0 ]; then
  git merge --ff-only upstream/main
  echo "✓ fast-forward"
else
  if git merge --no-edit upstream/main; then
    echo "✓ merge limpo"
  else
    echo
    echo "✗ conflito. Arquivos:"
    git diff --name-only --diff-filter=U | sed 's/^/   /'
    echo
    echo "   Fora de nutef/ ⇒ modificação de core que o upstream também mexeu; resolva"
    echo "   com cabeça e atualize nutef/registro-core.md. Depois: git add … && git commit"
    exit 2
  fi
fi

echo "próximo passo: rode a suíte (pnpm test:unit) e, se tocou schema, pnpm test:db; depois git push"
