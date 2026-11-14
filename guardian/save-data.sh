#!/usr/bin/env bash
# MYTHORIA GUARDIAN — enregistre un événement dans la branche « guardian-data » (lue par le tableau de bord).
# Usage (dans GitHub Actions) : bash guardian/save-data.sh controle | publication --etat publie --version X | rapport
# La branche ne garde qu'un seul commit (l'historique est DANS les fichiers JSON) : le dépôt ne grossit pas.
# Si deux contrôles écrivent en même temps, le second recommence à partir des données à jour (5 essais).
set -uo pipefail
: "${GITHUB_REPOSITORY:?}" "${GH_TOKEN:?}"
URL="${GUARDIAN_DATA_REMOTE:-https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git}"
WORK="$(mktemp -d)"
for i in 1 2 3 4 5; do
  rm -rf "$WORK/data"
  if git ls-remote --exit-code "$URL" guardian-data >/dev/null 2>&1; then
    git clone -q --depth 1 -b guardian-data "$URL" "$WORK/data" || { sleep 3; continue; }
    LEASE="$(git -C "$WORK/data" rev-parse HEAD)"
  else
    mkdir -p "$WORK/data"; LEASE=""
  fi
  node guardian/record.mjs "$@" --data "$WORK/data" || exit 1
  # les notifications ne doivent partir qu'une fois, même si on recommence
  export GUARDIAN_NO_NOTIFY=1
  cd "$WORK/data"
  rm -rf .git && git init -q -b guardian-data
  git config user.name "MYTHORIA Guardian"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add -A && git commit -qm "Données du Guardian ($1, $(date -u +%Y-%m-%dT%H:%MZ))"
  if [ -n "$LEASE" ]; then
    git push -q --force-with-lease="guardian-data:$LEASE" "$URL" guardian-data && { echo "Données enregistrées."; exit 0; }
  else
    git push -q "$URL" guardian-data && { echo "Données enregistrées (première fois)."; exit 0; }
  fi
  cd - >/dev/null
  echo "Quelqu'un a écrit en même temps : nouvel essai ($i)…"; sleep $((i * 3))
done
echo "::warning::Impossible d'enregistrer les données du Guardian après 5 essais."
exit 1
