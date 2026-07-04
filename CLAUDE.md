# TowerDefense

Mobile-first web tower defense game. PixiJS 8 + TypeScript + Vite, no other runtime deps in the game client itself. Current state: full game — 6-level campaign with stars/unlocks (`src/data/levels.ts`, one level multi-lane), Easy/Normal/Hard difficulty tiers and pause/1x-2x-3x speed controls (`src/data/difficulty.ts`, `src/core/loop.ts`), 4 tower types with branching upgrade paths (`src/data/towers.ts`), 9 enemy types including armor/flying/regen/shield/split-on-death specials and a boss archetype (`src/data/enemies.ts`), an Endless/survival mode with an escalating wave generator (`src/game/endless.ts`), date-seeded daily challenge with Wordle-style share card (`src/game/daily.ts`), persistent meta-progression — gem currency, meta-upgrades, achievements (`src/data/metaUpgrades.ts`, `src/data/achievements.ts`, `src/game/achievements.ts`) — layered on localStorage saves (`src/core/save.ts`, schema v2) that optionally sync to an account (`src/net/`, `server/`), procedural sprite art generated at startup (`src/render/textures.ts` — no asset files) with hit-flash/screen-shake juice, WebAudio-synthesized SFX and a procedural ambient music layer (`src/audio/sfx.ts`, `src/audio/music.ts`), PWA manifest.

## Commands

- `npm run dev` — Vite dev server with `--host` (for testing on a phone over LAN); proxies `/api/*` to the local backend on `:3001` (`vite.config.ts`)
- `npm run dev:all` — the above plus the backend (`server/`), run concurrently
- `npm run build` — typecheck (`tsc --noEmit`) + production build
- `npm run sim` — headless greedy-bot playthrough of all campaign levels plus sampled daily seeds (`DAILY_SAMPLE=40` to widen); verifies determinism (same seed ⇒ identical end state) and winnability, prints lives-remaining as the balance signal. Run after any simulation, data, or balance change. Never touches `server/` or the network — stays green regardless of backend changes.

## Accounts & sync (`server/`)

A separate Node/Express/Prisma service (own `package.json`/`tsconfig.json`, not an npm workspace) backs optional accounts: email/password auth (argon2id, httpOnly session cookie backed by a DB-side `Session` table — no JWT) and progress sync against **self-hosted MSSQL**. The game is fully playable with zero network as a guest, exactly as before; signing in merges local `stars`/`daily`/`currency`/`metaUpgrades`/`achievements` into the account (all monotonic max-wins or first-write-wins/permanent-once-unlocked) and an offline outbox (`src/net/sync.ts`) retries pushes that failed while offline.

Setup:
1. `cp server/.env.example server/.env` and fill in `DATABASE_URL` (point at your SQL Server instance — use a dedicated low-privilege login scoped to one database, never `sa`) and `SESSION_COOKIE_SECRET`.
2. `npm --prefix server install`
3. First run (creating the initial schema): `npm --prefix server run migrate` (`prisma migrate dev`) — needs a shadow database, which needs `CREATE DATABASE` permission the app's runtime login shouldn't have; run with a more privileged connection string, then switch `.env` back to the restricted login. For subsequent migrations against the live database, prefer hand-authoring the migration folder and running `npx prisma migrate deploy` instead — it needs no shadow database, only ordinary DDL grants (`ALTER`/`CREATE TABLE`, plus `REFERENCES` on any table a new foreign key points at) on the app login's own schema.
4. `npm run dev:all` (or `npm run dev` + `npm --prefix server run dev` separately)

Key files: `server/prisma/schema.prisma` (User/Session/LevelProgress/DailyResult/UserAchievement/MetaUpgrade), `server/src/routes/{auth,sync}.ts`, `src/net/{api,auth,sync}.ts`, `src/ui/auth.ts`.

For production, serve the built SPA and the API from the same origin behind one reverse proxy (static at `/`, API at `/api/*`, TLS terminated there) — this keeps the session cookie same-site with zero CORS config, matching the dev proxy setup.

## Architecture (load-bearing rules)

- **Simulation is renderer-agnostic and deterministic.** `src/game/` mutates plain state only; `src/render/` reads it. Never import Pixi or touch the DOM from `src/game/` or `src/core/` — this is what makes headless simulation and future daily-challenge replay verification possible.
- **All gameplay randomness goes through the seeded RNG** (`src/core/rng.ts`, threaded through `GameState.rng`). Never `Math.random()` in simulation code.
- **Fixed timestep:** simulation advances in exact 1/30s ticks (`src/core/loop.ts` accumulator); rendering is per-rAF. Gameplay durations are expressed in ticks, speeds in cells/second × `TICK_DT`.
- **World units are grid cells** (`src/core/grid.ts`): cell (cx, cy) spans [cx, cx+1), center at +0.5. The renderer maps cells→pixels with one scale factor; never hardcode pixels in game logic.
- **Levels are data** (`src/data/level01.ts`, `LevelDef`): grid size, one or more orthogonal-waypoint lanes (`paths`), wave definitions. Most levels have a single lane; `WaveGroup.path` picks which lane a group spawns on. New content should be new data files, not new code.
- **UI is DOM, game board is canvas.** HUD/buttons/banners live in `index.html` + `src/ui/hud.ts` (CSS handles safe areas, fonts). Only the board renders through Pixi.

## Mobile-first constraints

- Portrait orientation; landscape shows a rotate hint (CSS-only, `src/style.css`).
- Touch placement: press-and-drag from the dock button; on touch the ghost is offset 1.6 cells above the finger so it never hides the target cell (`src/ui/input.ts`).
- `touch-action: none` on the board and dock buttons; min 44px touch targets; `env(safe-area-inset-*)` padding; `100dvh` layout.
- Keep the bundle small (currently ~114 KB gzip for the app chunk, grown from ~86 KB as of the multi-path/endless/meta-progression/polish features — watch this on future additions) — instant load is the web's advantage.

## Verification

After gameplay changes: run the headless sim (above), then exercise the real UI — `npm run dev`, place towers by drag, run a wave, check win/lose paths. A Playwright mobile-viewport (390×844, `hasTouch`) driver script pattern exists; note that Playwright `.tap()` waits for disabled buttons to re-enable, so use `dispatchEvent("click")` for guard-rail probes.

## Git workflow — auto-commit & push

After each completed task (a finished feature, fix, or plan step — not every individual file edit), automatically commit and push to `origin` with no confirmation prompt:
1. Run `npm run build` (typecheck + build); for gameplay/data/balance changes also run `npm run sim`. Both must pass.
2. Run `graphify update .` if `graphify-out/` exists (see below).
3. `git add` the relevant files, commit with a descriptive message, and `git push`.
If either check fails, fix the issue and re-verify before committing — never commit a red build. If a task is small/exploratory with no durable change, skip this and just report back.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost) — part of the commit workflow above.
