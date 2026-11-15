# Security policy

## Reporting a problem

Please report security problems privately through GitHub: **Security → Report a vulnerability** on this repository. Do not open a public issue for them. You should get an answer within a week.

## What the app handles

- **Your Immich API key** is stored in the TV's local storage in plain text (the TV has no secure store for web apps). Create a dedicated key for the TV with read permissions only (`album.read`, `asset.read`, `asset.view`, `timeline.read`) and revoke it if the TV is sold or lost.
- **Media URLs carry the key** as a query parameter because `<img>` and `<video>` elements cannot send headers. Anything that logs requests to your Immich server (a reverse proxy, for example) will see it. Use the app on a trusted network.
- **QR pairing** encrypts the address and key on the phone to a key generated on the TV (ECDH P-256 and AES-GCM), so the relay only ever forwards ciphertext. Pairing topics are random 128-bit ids and the relay keeps nothing.
- The pairing service is optional. Without it the app still works with manual entry.

## Scope

In scope: this repository's code and the pairing service in `server/`. Out of scope: Immich itself, Tizen and Samsung firmware.
