# chess — Knight School

A chess learning page for an adult beginner and kids together: 25 interactive lessons and a computer opponent
with levels 1 to 100. It is a static web app (one page, English, phone / tablet / desktop) served by the
homie-pipeline `app-template` Go service. Everything runs in the browser; stars, the chosen level and the game in
progress are kept in that browser's localStorage. The server stores nothing and has no accounts.

Tailnet only: **https://chess.tail8e3e5b.ts.net** (previews: `https://pr-<n>-chess.tail8e3e5b.ts.net`).

| Path | What |
|---|---|
| `web/index.html` | the page: markup and styles |
| `web/js/lessons.js` | all lesson content (5 chapters, 25 lessons) |
| `web/js/app.js` | board (tap, drag, keyboard), lesson runner, play mode, saved progress |
| `web/js/engine.js` | computer opponent: level policy, Stockfish over UCI in a Web Worker, fallbacks |
| `web/js/mini-engine.js` | small built-in engine, used until Stockfish is ready or if it cannot start |
| `web/vendor/` | **not committed.** The `Dockerfile` downloads chess.js 0.10.3 (BSD) and Stockfish 17.1 (GPLv3, with its licence text) from npm, pinned by SHA-256, and they are embedded with the rest of `web/` |
| `web.go`, `web_test.go` | serves `/`, `/js/<file>`, `/vendor/<file>` from the embedded files: `.wasm` as `application/wasm`, engine builds cached for a year (hashed names), everything else revalidated per release |
| `main.go` | `GET /healthz`, `GET /version` (**keep `/version`**: the pipeline reads it to announce "deployed") |
| `telemetry.go`, `browser.go` | OpenTelemetry server spans + metrics to the in-cluster collector (D81); New Relic Browser stays off unless a `newrelic-browser` ConfigMap is added |
| `Dockerfile`, `deploy/` | arm64 image (distroless, non-root); kustomize base, Argo CD sets namespace, image tag and hostname |
| `CLAUDE.md`, `.github/` | pipeline rules and workflows, unchanged from `app-template` apart from the "This app" section |

## Players (profiles)
"Who's playing?" (top right) lets several people share a device: each profile has a name, a picture, its own stars,
level, colour and game in progress. Saved in localStorage under `knight-school-profiles-v2` as a versioned document
(`{ v: 2, active, profiles: [{ id, name, avatar, data }] }`, ids are stable). On first load the old single set of
progress (`knight-school-v1`, left in place) becomes the first profile. A profile is exported as a text code or file
(`KS1.` + base64url JSON) and imported on another device as a new player; invalid codes are rejected without touching
anything. `web/js/profiles.js` holds the data rules (no DOM); `app.js` reaches storage only through `Store.backend`
(`load()` / `save(text)`), so a server can replace `LocalBackend` without changing the rest.

### Mid-term plan: a real backend
The owner wants proper accounts and storage later: a **database** behind an HTTP API (profiles, stars, games), written
in a language New Relic instruments easily. The plan is to stay with **Go + OpenTelemetry** (already used here, D81)
and add a `Backend` that talks to that API in place of `LocalBackend`; export/import then doubles as the way to move
local progress into an account. Not built yet: the server stays stateless today.

## Levels
- 1–30: Stockfish scores every legal move at depth 1–3, then one is drawn at random, better moves being likelier.
  Level 1 plays a purely random move 90% of the time; that share falls to zero by level 25.
- 31–99: Stockfish's own strength limiter (`UCI_Elo` 1320–3190). 100: Stockfish unrestricted, 1.5 s per move.

## Run locally
    mkdir -p web/vendor && cd web/vendor
    curl -sL https://registry.npmjs.org/chess.js/-/chess.js-0.10.3.tgz | tar -xz --strip-components=1 package/chess.js
    curl -sL https://registry.npmjs.org/stockfish/-/stockfish-17.1.0.tgz | tar -xz --strip-components=2 \
      package/src/stockfish-17.1-lite-single-03e3232.js package/src/stockfish-17.1-lite-single-03e3232.wasm \
      package/src/stockfish-17.1-asm-341ff22.js
    cd ../.. && go run .        # http://127.0.0.1:8080

## Checks
`gofmt -l .`, `go vet ./...`, `go test ./...` (CI runs them, then builds the image). The browser tests (every
lesson solved through the UI, the rules, a full game, the engine fallbacks) are Playwright scripts kept outside this
repo; they take the URL to test as `KS_URL`.
