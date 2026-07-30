#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────
# LIVE-TJEK AF SPROGSYSTEMET
#
# Kør fra repo-roden:   bash test/live-en.sh
#
# npm test tjekker koden i repoet. Dette script tjekker det DEPLOYEDE site —
# altså at Netlify faktisk gør det reglerne siger. Det er to forskellige ting,
# og kun det sidste beviser at det virker for Google.
#
# Vigtigt: -A "Googlebot" er ikke pynt. Edge-funktionen retter kun HTML for
# robotter. Uden den flag ser du den rå danske HTML og tror der er en fejl.
# ─────────────────────────────────────────────────────────────────────────

BASE="https://castillodelalma.es"
BOT="Googlebot/2.1 (+http://www.google.com/bot.html)"
fejl=0

grøn() { printf '\033[32m✓\033[0m %s\n' "$1"; }
rød()  { printf '\033[31m✗\033[0m %s\n' "$1"; fejl=$((fejl+1)); }

# ── 1. Omdirigeringer ───────────────────────────────────────────────────
echo
echo "═══ 1. OMDIRIGERINGER ═══"

tjek_redirect() {
  local sti="$1" ventet="$2"
  local svar status location
  svar=$(curl -sI -A "$BOT" "$BASE$sti")
  status=$(printf '%s' "$svar" | head -1 | awk '{print $2}')
  location=$(printf '%s' "$svar" | grep -i '^location:' | sed 's/^[Ll]ocation: *//' | tr -d '\r')
  if [ "$status" = "301" ] && [[ "$location" == *"$ventet"* ]]; then
    grøn "$sti → 301 $location"
  else
    rød "$sti → $status ${location:-(ingen location)}   forventet 301 → $ventet"
  fi
}

tjek_redirect "/en/udlejning"      "/en/venue-hire"
tjek_redirect "/en/udlejning.html" "/en/venue-hire"
tjek_redirect "/en/gay-retreat-spain" "/en/gay-retreat-malaga-spain"

# ── 2. Ingen 404 ────────────────────────────────────────────────────────
echo
echo "═══ 2. ALLE ADRESSER SVARER 200 ═══"

for sti in / /en/ /udlejning /en/venue-hire /ejendommen /en/ejendommen \
           /kontakt /en/kontakt /gay-retreat-malaga-spain /en/gay-retreat-malaga-spain \
           /sitemap.xml /robots.txt; do
  status=$(curl -so /dev/null -w '%{http_code}' -A "$BOT" "$BASE$sti")
  if [ "$status" = "200" ]; then grøn "$sti → 200"; else rød "$sti → $status"; fi
done

# ── 3. Canonical peger på sig selv ──────────────────────────────────────
echo
echo "═══ 3. CANONICAL PEGER PÅ SIG SELV ═══"
echo "    (peger en /en/-adresse på den danske, konsoliderer Google den væk)"

tjek_canonical() {
  local sti="$1" ventet="$2"
  local fundet
  fundet=$(curl -s -A "$BOT" "$BASE$sti" \
    | grep -o '<link rel="canonical" href="[^"]*"' | head -1 \
    | sed 's/.*href="//;s/"//')
  if [ "$fundet" = "$ventet" ]; then grøn "$sti → $fundet"
  else rød "$sti → ${fundet:-(ingen)}   forventet $ventet"; fi
}

tjek_canonical "/"                              "$BASE/"
tjek_canonical "/en/"                           "$BASE/en/"
tjek_canonical "/udlejning"                     "$BASE/udlejning"
tjek_canonical "/en/venue-hire"                 "$BASE/en/venue-hire"
tjek_canonical "/ejendommen"                    "$BASE/ejendommen"
tjek_canonical "/en/ejendommen"                 "$BASE/en/ejendommen"
tjek_canonical "/kontakt"                       "$BASE/kontakt"
tjek_canonical "/en/kontakt"                    "$BASE/en/kontakt"
tjek_canonical "/gay-retreat-malaga-spain"      "$BASE/gay-retreat-malaga-spain"
tjek_canonical "/en/gay-retreat-malaga-spain"   "$BASE/en/gay-retreat-malaga-spain"

# ── 4. lang og titel ────────────────────────────────────────────────────
echo
echo "═══ 4. SPROG OG TITEL I RÅ HTML ═══"

tjek_lang() {
  local sti="$1" ventet="$2"
  local html lang titel
  html=$(curl -s -A "$BOT" "$BASE$sti")
  lang=$(printf '%s' "$html" | grep -o '<html lang="[^"]*"' | head -1 | sed 's/.*lang="//;s/"//')
  titel=$(printf '%s' "$html" | grep -o '<title[^>]*>[^<]*' | head -1 | sed 's/.*>//')
  if [ "$lang" = "$ventet" ]; then grøn "$sti → lang=$lang   \"$titel\""
  else rød "$sti → lang=${lang:-(ingen)} forventet $ventet   \"$titel\""; fi
}

tjek_lang "/"                            "da"
tjek_lang "/en/"                         "en"
tjek_lang "/udlejning"                   "da"
tjek_lang "/en/venue-hire"               "en"
tjek_lang "/ejendommen"                  "da"
tjek_lang "/en/ejendommen"               "en"
tjek_lang "/kontakt"                     "da"
tjek_lang "/en/kontakt"                  "en"

# ── 5. hreflang gensidig ────────────────────────────────────────────────
echo
echo "═══ 5. HREFLANG ER GENSIDIG ═══"
echo "    (begge adresser skal opremse begge sprog — ellers ignorerer Google klyngen)"

tjek_hreflang() {
  local sti="$1" da="$2" en="$3" xd="$4"
  local html ok=1
  html=$(curl -s -A "$BOT" "$BASE$sti")
  for par in "da|$da" "en|$en" "x-default|$xd"; do
    local hl="${par%%|*}" href="${par#*|}"
    local f
    f=$(printf '%s' "$html" | grep -o "hreflang=\"$hl\" href=\"[^\"]*\"" | head -1 | sed 's/.*href="//;s/"//')
    [ "$f" = "$href" ] || { rød "$sti: hreflang $hl = ${f:-(mangler)}   forventet $href"; ok=0; }
  done
  [ $ok = 1 ] && grøn "$sti → alle tre hreflang korrekte"
}

tjek_hreflang "/udlejning"     "$BASE/udlejning"  "$BASE/en/venue-hire" "$BASE/en/venue-hire"
tjek_hreflang "/en/venue-hire" "$BASE/udlejning"  "$BASE/en/venue-hire" "$BASE/en/venue-hire"
tjek_hreflang "/ejendommen"    "$BASE/ejendommen" "$BASE/en/ejendommen" "$BASE/en/ejendommen"
tjek_hreflang "/en/ejendommen" "$BASE/ejendommen" "$BASE/en/ejendommen" "$BASE/en/ejendommen"
tjek_hreflang "/kontakt"       "$BASE/kontakt"    "$BASE/en/kontakt"    "$BASE/kontakt"
tjek_hreflang "/en/kontakt"    "$BASE/kontakt"    "$BASE/en/kontakt"    "$BASE/kontakt"

# ── 6. Sitemap ──────────────────────────────────────────────────────────
echo
echo "═══ 6. SITEMAP ═══"

sitemap=$(curl -s "$BASE/sitemap.xml")
antal=$(printf '%s' "$sitemap" | grep -c '<loc>')
echo "    $antal adresser i sitemappet"

for adresse in "/" "/en/" "/udlejning" "/en/venue-hire" "/ejendommen" "/en/ejendommen" \
               "/kontakt" "/en/kontakt" "/gay-retreat-malaga-spain" "/en/gay-retreat-malaga-spain"; do
  if printf '%s' "$sitemap" | grep -q "<loc>$BASE$adresse</loc>"; then grøn "sitemap indeholder $adresse"
  else rød "sitemap MANGLER $adresse"; fi
done

if printf '%s' "$sitemap" | grep -q '/en/udlejning'; then
  rød "sitemap peger stadig på /en/udlejning — den 301'er nu, dårligt signal"
else
  grøn "sitemap peger ikke længere på /en/udlejning"
fi

# ── 7. Indeksering må ikke være spærret ─────────────────────────────────
echo
echo "═══ 7. INGEN NOINDEX ═══"

for sti in /en/ /en/venue-hire /en/ejendommen /en/kontakt /en/gay-retreat-malaga-spain; do
  if curl -s -A "$BOT" "$BASE$sti" | grep -qi 'name="robots"[^>]*noindex'; then
    rød "$sti har noindex"
  else
    grøn "$sti ingen noindex"
  fi
done

# ── Opsummering ─────────────────────────────────────────────────────────
echo
echo "════════════════════════════════════════════════════════════"
if [ $fejl -eq 0 ]; then
  echo "  Alt bestået — sprogsystemet virker på det deployede site."
else
  echo "  $fejl fejl. Er deployet færdigt? Tjek Netlify og kør igen."
fi
echo "════════════════════════════════════════════════════════════"
echo
echo "Det scriptet IKKE kan tjekke — gør det i en browser:"
echo "  • Klik sprogskifteren på hver side, begge veje"
echo "  • Åbn /en/venue-hire i et vindue hvor du FØRST har været på den"
echo "    danske forside (så cda_geo_lang='da' ligger i sessionStorage)."
echo "    Siden SKAL vise engelsk. Det var fejlen vi lige rettede."
echo "  • Send en forespørgsel fra /en/venue-hire og se at mailen er engelsk"
echo
exit $fejl
