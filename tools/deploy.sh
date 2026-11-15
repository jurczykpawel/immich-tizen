#!/usr/bin/env bash
# Build, sign and install the app on a Samsung TV (reinstalling also restarts a running app).
#
#   TV_HOST=192.168.1.50 tools/deploy.sh [--run]
#
# Needs Tizen Studio CLI tools (sdb, tizen), Java 17+, a Samsung certificate profile and a TV in developer mode.
# See README.md, "Install on your TV".
set -euo pipefail
cd "$(dirname "$0")/.."

: "${TV_HOST:?set TV_HOST to the IP address of the TV}"

# A key baked into the package ends up on every TV that gets it. Test builds opt in with ALLOW_BAKED_KEY=1.
BAKED="${VITE_IMMICH_KEY-$(grep -s '^VITE_IMMICH_KEY=.' .env | cut -d= -f2-)}"
if [ -n "$BAKED" ] && [ -z "${ALLOW_BAKED_KEY:-}" ]; then
  echo "Refusing to build: VITE_IMMICH_KEY is set (in .env or the environment), so the API key would be packed into the app."
  echo "For a normal build run:  VITE_IMMICH_URL= VITE_IMMICH_KEY= $0 $*   (or empty them in .env)."
  echo "For a throwaway test build set ALLOW_BAKED_KEY=1."
  exit 1
fi
PROFILE="${TIZEN_PROFILE:-immich-tv}"
TIZEN_STUDIO="${TIZEN_STUDIO:-$HOME/tizen-studio}"
export PATH="$TIZEN_STUDIO/tools/ide/bin:$TIZEN_STUDIO/tools:${JAVA_HOME:+$JAVA_HOME/bin:}$PATH"
command -v tizen >/dev/null || { echo "tizen CLI not found (looked in $TIZEN_STUDIO)"; exit 1; }
OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT

pnpm build >/dev/null
tizen package -t wgt -s "$PROFILE" -o "$OUT" -- dist >/dev/null
mv "$OUT"/*.wgt "$OUT/ImmichTV.wgt"   # a space in the file name makes the TV reject the install

sdb kill-server >/dev/null 2>&1 || true
sdb start-server >/dev/null 2>&1
for _ in 1 2 3 4 5; do
  sdb connect "$TV_HOST" | tail -1
  sdb devices | awk 'NR>1 && $2=="device"{f=1} END{exit !f}' && break
  sleep 3
done
TARGET="$(sdb devices | awk 'NR==2{print $NF}')"
tizen install -n ImmichTV.wgt -t "$TARGET" -- "$OUT" | tail -2
# `--run` leaves the app running normally (not in debug mode), which is how it is meant to be used.
[ "${1:-}" = "--run" ] && tizen run -p ImmichTV01.immichtv -t "$TARGET" | tail -1 || true
