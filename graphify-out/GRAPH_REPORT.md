# Graph Report - TowerDefense  (2026-07-04)

## Corpus Check
- 49 files · ~22,561 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 386 nodes · 847 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d73ca00f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_App Bootstrap & Wave Flow|App Bootstrap & Wave Flow]]
- [[_COMMUNITY_Placement Input & Rendering|Placement Input & Rendering]]
- [[_COMMUNITY_Core Simulation & Grid|Core Simulation & Grid]]
- [[_COMMUNITY_Package Manifest|Package Manifest]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Tower Combat System|Tower Combat System]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]

## God Nodes (most connected - your core abstractions)
1. `main()` - 42 edges
2. `Renderer` - 34 edges
3. `GameState` - 16 edges
4. `compilerOptions` - 12 edges
5. `apiFetch()` - 12 edges
6. `cellKey()` - 11 edges
7. `createRng()` - 11 edges
8. `run()` - 11 edges
9. `Tower` - 10 edges
10. `generateDailyLevel()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `index.html #app shell (HUD DOM, board host, dock buttons)` --references--> `main()`  [EXTRACTED]
  index.html → src/main.ts
- `run()` --semantically_similar_to--> `main()`  [INFERRED] [semantically similar]
  scripts/simulate.ts → src/main.ts
- `createHud()` --shares_data_with--> `index.html #app shell (HUD DOM, board host, dock buttons)`  [INFERRED]
  src/ui/hud.ts → index.html
- `towerdefense package manifest` --conceptually_related_to--> `Renderer`  [INFERRED]
  package.json → src/render/renderer.ts
- `run()` --calls--> `createGame()`  [EXTRACTED]
  scripts/simulate.ts → src/game/state.ts

## Hyperedges (group relationships)
- **Per-tick simulation update pipeline** — game_state_step, game_enemies_updatespawner, game_enemies_updateenemies, game_towers_updatetowers, game_waves_checkwaveend [EXTRACTED 1.00]
- **Deterministic seeded simulation (fixed timestep + seeded RNG, verified headlessly)** — core_loop_startloop, core_rng_createrng, game_state_step, scripts_simulate_run [INFERRED 0.85]
- **Drag-to-place tower flow (input validates via game rules, renderer draws ghost)** — ui_input_createplacementinput, game_state_canplacetower, game_state_placetower, render_renderer_renderer, render_renderer_placementpreview [INFERRED 0.85]

## Communities (15 total, 2 thin omitted)

### Community 0 - "App Bootstrap & Wave Flow"
Cohesion: 0.07
Nodes (47): Cell, Fixed-timestep accumulator loop, createRng(), Rng, Seeded deterministic randomness, LEVEL_01, LevelDef, WaveDef (+39 more)

### Community 2 - "Core Simulation & Grid"
Cohesion: 0.08
Nodes (52): buildTrack(), cellCenter(), cellKey(), expandPathCells(), PathTrack, Point, pointAtDistance(), unionPathCells() (+44 more)

### Community 3 - "Package Manifest"
Cohesion: 0.08
Nodes (23): author, dependencies, pixi.js, description, devDependencies, concurrently, playwright-core, tsx (+15 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 5 - "Tower Combat System"
Cohesion: 0.06
Nodes (65): createMusic(), createSfx(), startLoop(), awardCurrency(), DailyRecord, DEFAULTS, loadSave(), migrateSave() (+57 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (28): ENEMIES, EnemyDef, EnemyTypeId, TOWER_ORDER, TowerDef, TOWERS, TowerStats, TowerTypeId (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (24): AuthedRequest, requireAuth(), authRouter, credentialsSchema, parsed, bodySchema, dailyRecordSchema, finalCurrency (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (22): dependencies, argon2, cookie-parser, express, @prisma/client, zod, devDependencies, prisma (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir, skipLibCheck (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (8): ensureAudioContext(), CALM_CHORD, Music, DEFS, Note, Sfx, SfxName, THROTTLE_MS

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (7): DIFFICULTIES, DIFFICULTY_ORDER, DifficultyDef, DifficultyId, createScreens(), el(), Screens

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (7): Accounts & sync (`server/`), Architecture (load-bearing rules), Commands, graphify, Mobile-first constraints, TowerDefense, Verification

## Knowledge Gaps
- **149 isolated node(s):** `target`, `module`, `moduleResolution`, `lib`, `strict` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Renderer` connect `Placement Input & Rendering` to `Core Simulation & Grid`, `Tower Combat System`, `Community 6`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `main()` connect `Tower Combat System` to `App Bootstrap & Wave Flow`, `Placement Input & Rendering`, `Core Simulation & Grid`, `Community 11`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `GameState` connect `Core Simulation & Grid` to `App Bootstrap & Wave Flow`, `Placement Input & Rendering`, `Tower Combat System`, `Community 6`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `target`, `module`, `moduleResolution` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Bootstrap & Wave Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.06599326599326599 - nodes in this community are weakly interconnected._
- **Should `Core Simulation & Grid` be split into smaller, more focused modules?**
  _Cohesion score 0.08065458796025717 - nodes in this community are weakly interconnected._
- **Should `Package Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._