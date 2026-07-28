#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────
# Tester gay-retreat-landingssiden og dens admin-fane.
#
# KØRES I TERMINAL PÅ MACEN — ikke i Supabase SQL Editor.
#
#   cd "/Users/tillykke.nu/Work CASTILLO/castillo-del-alma"
#   bash test/gay/koer-alle.sh
#
# Scriptet installerer selv jsdom første gang. Det ændrer intet i projektet
# og rører hverken database eller hjemmeside — det læser kun filerne igennem.
# ─────────────────────────────────────────────────────────────────────────
set -u
cd "$(dirname "$0")/../.." || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node er ikke installeret. Hent den på https://nodejs.org — så virker resten."
  exit 1
fi

if [ ! -d node_modules/jsdom ]; then
  echo "Installerer jsdom (kun første gang)…"
  npm install jsdom --no-save --silent || { echo "Kunne ikke installere jsdom."; exit 1; }
fi

fejl=0
for fil in test/gay/*test.js; do
  navn=$(basename "$fil" .js)
  if node "$fil" >/tmp/cda-$navn.log 2>&1; then
    printf '  ✓  %s\n' "$navn"
  else
    printf '  ✗  %s\n' "$navn"
    sed -n 's/^  FEJL:/     →/p' "/tmp/cda-$navn.log"
    tail -3 "/tmp/cda-$navn.log" | sed 's/^/     /'
    fejl=$((fejl + 1))
  fi
done

echo
if [ "$fejl" -eq 0 ]; then
  echo "Alt i orden — ingen fejl fundet."
else
  echo "$fejl testfil(er) fejlede. Fuld udskrift ligger i /tmp/cda-*.log"
fi
exit "$fejl"
