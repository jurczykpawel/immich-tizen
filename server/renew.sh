#!/bin/sh
# Weekly: renews the tvpair certificate when it is due (acme.sh skips otherwise) and restarts the service only after a renewal.
set -eu
DIR="${PAIR_DIR:-/opt/immich-tv-pair}"
NAME="${PAIR_DOMAIN:?set PAIR_DOMAIN to the host name of the pairing page}"
OUT=$(docker run --rm -v "$DIR/acme:/acme.sh" -v "$DIR/certs:/certs" neilpang/acme.sh sh -c \
  "acme.sh --renew -d $NAME --ecc; rc=\$?; if [ \$rc -eq 0 ]; then acme.sh --install-cert -d $NAME --ecc --key-file /certs/tvpair.key --fullchain-file /certs/tvpair.crt; fi; exit \$rc" 2>&1) && RC=0 || RC=$?
if [ "$RC" -eq 0 ]; then
  chown -R 1000:1000 "$DIR/certs"
  (cd "$DIR" && docker compose restart pair >/dev/null)
  logger -t tvpair-renew "certificate renewed"
elif [ "$RC" -eq 2 ]; then
  logger -t tvpair-renew "not due yet"
else
  logger -t tvpair-renew "renewal FAILED rc=$RC"
  echo "$OUT" | tail -5 >&2
  exit "$RC"
fi
