# Graph Report - .  (2026-07-03)

## Corpus Check
- Corpus is ~3,725 words - fits in a single context window. You may not need a graph.

## Summary
- 111 nodes · 244 edges · 6 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.91)
- Token cost: 50,409 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Bootstrap & Wave Flow|App Bootstrap & Wave Flow]]
- [[_COMMUNITY_Placement Input & Rendering|Placement Input & Rendering]]
- [[_COMMUNITY_Core Simulation & Grid|Core Simulation & Grid]]
- [[_COMMUNITY_Package Manifest|Package Manifest]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Tower Combat System|Tower Combat System]]

## God Nodes (most connected - your core abstractions)
1. `Renderer` - 21 edges
2. `GameState` - 15 edges
3. `compilerOptions` - 12 edges
4. `main()` - 11 edges
5. `Tower` - 10 edges
6. `step()` - 9 edges
7. `run()` - 9 edges
8. `createGame()` - 8 edges
9. `placeTower()` - 8 edges
10. `createPlacementInput()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `createHud()` --shares_data_with--> `index.html #app shell (HUD DOM, board host, dock buttons)`  [INFERRED]
  src/ui/hud.ts → index.html
- `index.html #app shell (HUD DOM, board host, dock buttons)` --references--> `main()`  [EXTRACTED]
  index.html → src/main.ts
- `run()` --semantically_similar_to--> `main()`  [INFERRED] [semantically similar]
  scripts/simulate.ts → src/main.ts
- `towerdefense package manifest` --conceptually_related_to--> `Renderer`  [INFERRED]
  package.json → src/render/renderer.ts
- `run()` --calls--> `createGame()`  [EXTRACTED]
  scripts/simulate.ts → src/game/state.ts

## Hyperedges (group relationships)
- **Per-tick simulation update pipeline** — game_state_step, game_enemies_updatespawner, game_enemies_updateenemies, game_towers_updatetowers, game_waves_checkwaveend [EXTRACTED 1.00]
- **Deterministic seeded simulation (fixed timestep + seeded RNG, verified headlessly)** — core_loop_startloop, core_rng_createrng, game_state_step, scripts_simulate_run [INFERRED 0.85]
- **Drag-to-place tower flow (input validates via game rules, renderer draws ghost)** — ui_input_createplacementinput, game_state_canplacetower, game_state_placetower, render_renderer_renderer, render_renderer_placementpreview [INFERRED 0.85]

## Communities (6 total, 0 thin omitted)

### Community 0 - "App Bootstrap & Wave Flow"
Cohesion: 0.16
Nodes (20): Fixed-timestep accumulator loop, LoopStats, startLoop(), Seeded deterministic randomness, LEVEL_01, LevelDef, WaveDef, canStartWave() (+12 more)

### Community 1 - "Placement Input & Rendering"
Cohesion: 0.16
Nodes (9): cellKey(), canPlaceTower(), placeTower(), towerdefense package manifest, COLORS, PlacementPreview, Renderer, createPlacementInput() (+1 more)

### Community 2 - "Core Simulation & Grid"
Cohesion: 0.20
Nodes (17): buildTrack(), Cell, cellCenter(), expandPathCells(), PathTrack, Point, pointAtDistance(), TICK_DT tick duration constant (+9 more)

### Community 3 - "Package Manifest"
Cohesion: 0.11
Nodes (18): author, dependencies, pixi.js, description, devDependencies, typescript, vite, keywords (+10 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 5 - "Tower Combat System"
Cohesion: 0.42
Nodes (8): Enemy, GameState, Tower, acquireTarget(), fireTowers(), First-enemy targeting policy, moveProjectiles(), updateTowers()

## Knowledge Gaps
- **38 isolated node(s):** `target`, `module`, `moduleResolution`, `lib`, `strict` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Renderer` connect `Placement Input & Rendering` to `App Bootstrap & Wave Flow`, `Core Simulation & Grid`, `Tower Combat System`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Why does `Tower` connect `Tower Combat System` to `App Bootstrap & Wave Flow`, `Placement Input & Rendering`, `Core Simulation & Grid`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `GameState` connect `Tower Combat System` to `App Bootstrap & Wave Flow`, `Placement Input & Rendering`, `Core Simulation & Grid`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `target`, `module`, `moduleResolution` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._