#!/usr/bin/env bash
# Builds the phone page and (re)starts the pairing service on the Immich VM (separate compose, /opt/immich-tv-pair).
set -euo pipefail
cd "$(dirname "$0")/.."
HOST="${PAIR_HOST:?set PAIR_HOST to the ssh host that will run the pairing service}"
DIR=/opt/immich-tv-pair

pnpm build:phone >/dev/null
tar -cz server dist-phone compose.yml | ssh "$HOST" "mkdir -p $DIR && tar -xz -C $DIR && cd $DIR && docker compose up -d --build"
ssh "$HOST" "cd $DIR && docker compose ps --format '{{.Name}} {{.Status}}'"
