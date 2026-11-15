#!/usr/bin/env bash
# Installs the weekly certificate renewal (cron) on the host that runs the pairing service.
# The DNS API token that acme.sh uses is stored by acme.sh in /opt/immich-tv-pair/acme/account.conf (root, mode 600).
# Give it the narrowest scope your DNS provider allows (edit DNS of one zone).
#
#   PAIR_HOST=my-server PAIR_DOMAIN=tvpair.example.com tools/install-renewal.sh
set -euo pipefail
cd "$(dirname "$0")/.."
HOST="${PAIR_HOST:?set PAIR_HOST to the ssh host that runs the pairing service}"
DOMAIN="${PAIR_DOMAIN:?set PAIR_DOMAIN to the host name of the pairing page}"
scp -q server/renew.sh "$HOST":/opt/immich-tv-pair/renew.sh
ssh "$HOST" bash -s <<REMOTE
set -e
chmod 700 /opt/immich-tv-pair/renew.sh
printf '17 4 * * 1 root PAIR_DOMAIN=$DOMAIN /opt/immich-tv-pair/renew.sh\n' > /etc/cron.d/immich-tv-pair-renew
chmod 644 /etc/cron.d/immich-tv-pair-renew
PAIR_DOMAIN=$DOMAIN /opt/immich-tv-pair/renew.sh && echo "renewal check ok"
REMOTE
