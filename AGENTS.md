# AGENTS.md

Instructions for AI coding agents working on this repository (Claude Code, Codex, others). Humans: read [README.md](README.md) first; this file is the short, operational version.

## What this is

Immich client for Samsung Tizen TVs: Preact + Vite + TypeScript web app packaged as a `.wgt` widget. Browses Immich albums and years, runs photo/video slideshows with the TV remote, set up by QR code from a phone (optional pairing service in `server/`) or by typing. Tested on a 2021 TV (Tizen 6.0, **Chromium 76**).

## Commands

```bash
pnpm install            # also enables .githooks/pre-commit (secret scan)
pnpm test               # unit tests (jsdom, recorded fixtures); no TV needed; run before every commit
pnpm typecheck
pnpm build              # TV app -> dist/   (target chrome76)
pnpm build:phone        # phone pairing page -> dist-phone/
pnpm scan:secrets       # TruffleHog over history (needs trufflehog installed)
```

TV commands need `TV_HOST` (the TV's IP) and a developer-mode TV: `pnpm deploy:tv [--run]`, `pnpm test:tv` (also needs `HOST_IP`, this computer's LAN address), `node tools/tv-smoke.mjs`.

## Rules that matter

1. **Test first.** Write the failing test, watch it fail for the right reason, then implement. Fixtures in `test/fixtures/` are recorded Immich responses with anonymized IDs and names; do not replace them with hand-written objects, and add a case where an optional field is absent.
2. **Code that runs on the TV must be Chromium 76 compatible.** No `aspect-ratio`, `inset`, flex `gap`, `min()/max()/clamp()`, `backdrop-filter`, `:is()`. `?.` and `??` are fine in `src/` (Vite transpiles them) but not in expressions you send to the TV by hand (`tools/tv.mjs eval`). `test/css-compat.test.ts` enforces the CSS side; it exists because a layout that looked right on a desktop browser broke on the real TV.
3. **Never commit secrets.** API keys, `.env`, `*.p12`, certificates, `certs/` are git-ignored. `.env` may hold a test key for local builds. The pre-commit hook and CI run TruffleHog (`.trufflehog.yaml` adds an Immich key detector). Production builds must have empty `VITE_IMMICH_*`; `tools/deploy.sh` refuses to build with a key set unless `ALLOW_BAKED_KEY=1` (test builds only; `tools/launch.mjs` sets it for smoke tests).
4. **Do not describe vulnerabilities in commit messages, comments or test names.** Describe the behavior ("reject messages that fail authentication"), not the attack.
5. **Keep user-facing text Polish and plain.** The UI language is Polish; code, comments and docs are English (README.pl.md is the Polish README).
6. **Do not leave the TV in debug mode.** After a debug session, exit the app with Back at the library root and start it with `tizen run`. Killing `sdb … debug` while the app runs froze a TV.
7. **Do not add checks that only print reports.** A script must change the product or fail a build; otherwise delete it.

## Map

```
src/immich-client.ts    API client (albums, assets for album or year, years, media URLs)
src/grouping.ts         albums by year, years by decade, labels (pure)
src/rows-nav.ts         focus movement over shelves (pure)
src/slideshow.ts        slideshow reducer (pure)
src/browse-view.tsx     side menu + shelves          src/show-view.tsx   slideshow view
src/settings-view.tsx   settings                      src/app.tsx          screen state machine
src/pairing/            crypto (ECDH + AES-GCM), relay client, pairing flow
server/                 pairing page + relay server (Node, no deps), Dockerfile, renew.sh
tools/                  deploy.sh, deploy-pair.sh, install-renewal.sh, cdp.mjs, tv.mjs, tv-smoke.mjs, launch.mjs
test/                   unit tests          test-tv/   tests that need a real TV
```

Immich endpoints: `GET /api/albums`, `POST /api/search/metadata`, `GET /api/timeline/buckets?size=MONTH`, `GET /api/assets/{id}/thumbnail?size=preview|thumbnail`, `GET /api/assets/{id}/video/playback`. Required API key permissions: `album.read`, `asset.read`, `asset.view`, `timeline.read`. Media URLs carry the key as `?apiKey=`.

## Getting a build onto a TV (what an agent can do, what needs the human)

Human, once: put the TV in developer mode (Apps → 1 2 3 4 5 → Developer mode On, host IP = this computer's address toward the TV, restart TV); create a **Samsung** certificate profile for the TV's DUID in Tizen Studio's Certificate Manager (needs a Samsung account login in a GUI). Details: README "Install on your TV".

Agent, every time:

1. Verify the TV: `curl -s http://$TV_HOST:8001/api/v2/` must return JSON with `"developerMode":"1"`. No answer means the TV is off (Wake-on-LAN, or ask the human).
2. `TV_HOST=… TIZEN_PROFILE=… pnpm deploy:tv --run` (builds, signs, installs, starts normally).
3. Verify on the TV: `TV_HOST=… node tools/tv-smoke.mjs` (deploys a test build, drives the app with key presses, checks layout, navigation, slideshow, video). For pairing: `TV_HOST=… HOST_IP=… pnpm test:tv`.
4. Restore the production build (`pnpm deploy:tv --run` without `VITE_*` baked in) so the TV does not keep a test build or a baked-in key.

Debugging: start the app with `sdb -s $TV_HOST:26101 shell 0 debug ImmichTV01.immichtv` while it is **not** running; it prints a port; use `tools/cdp.mjs`. Screenshots over CDP hang on Tizen; read the DOM or preview in a desktop browser (`DEV_IMMICH_TARGET=… VITE_IMMICH_URL=http://localhost:5173 VITE_IMMICH_KEY=… pnpm dev`).

## Known pitfalls

| Symptom | Fix |
|---|---|
| `sdb connect` fails, log says *Connection reset by peer* | The host IP in the TV's developer mode must be the interface this computer uses toward the TV (check `route -n get $TV_HOST`). |
| `sdb` says *target not found* | `sdb kill-server; sdb start-server; sdb connect $TV_HOST`. `tizen install -t` takes the device *name* from `sdb devices` (the model), not the IP. |
| Install fails silently | A space in the `.wgt` file name, or a non-Samsung certificate. `deploy.sh` already renames the file. |
| `sdb shell 0 debug` prints nothing | The app is already running. Reinstall (restarts it) or exit it with Back, then retry. |
| Layout differs between desktop and TV | Chromium 76 limits above; check the failing `css-compat` test and the TV smoke test's tile-size check. |
| Reinstalling the app | Keeps the saved connection (localStorage), so it does not drop back to setup. |

## Conventions

- Small commits, imperative subject, no issue numbers or internal identifiers. Run `pnpm test` and `pnpm typecheck` first.
- Prefer pure functions in `src/*.ts` for logic and keep components thin; add the unit test next to the behavior it pins.
- New screens: add the key hints bar (`HintBar`), a visible focus state and Back handling; add navigation tests that press keys.
