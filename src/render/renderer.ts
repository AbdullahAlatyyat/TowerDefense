import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import { cellCenter, cellKey } from "../core/grid";
import { createRng } from "../core/rng";
import { ENEMIES } from "../data/enemies";
import { HERO, heroLevelIndex, heroStatsForXp } from "../data/hero";
import { TOWERS, type TowerTypeId } from "../data/towers";
import { hashString } from "../game/daily";
import { effectiveTowerStats, type GameState } from "../game/state";
import type { LevelDef } from "../data/level01";
import type { UiState } from "../ui/input";
import { buildAtlas, T, type TextureAtlas } from "./textures";

/** Overlay geometry (ghost/selection) still draws at S px per cell. */
const S = 64;

const COLORS = {
  boardFrame: 0x2c3a4d,
  cellTones: [0x1c2531, 0x1e2836, 0x1a232e],
  tuft: 0x2b3f43,
  pebble: 0x39485c,
  roadEdge: 0x1f2937,
  road: 0x39465c,
  portalIn: 0x7f5af0,
  portalOut: 0xd95c5c,
  hpBack: 0x101720,
  hpFill: 0x4ade80,
  ghostValid: 0x4ade80,
  ghostInvalid: 0xef4444,
  select: 0xfbbf24,
  pathA: 0xfbbf24,
  pathB: 0x22d3ee,
  gold: 0xfbbf24,
};

/** Worn-centerline tint per lane, for levels with more than one path. */
const LANE_WEAR_TINTS = [0x4b5b74, 0xfbbf24, 0x67e8f9];

/** Per-frame gameplay events the renderer detected by diffing state — the
 * app layer uses these to drive sound. */
export interface RenderEvents {
  shots: number;
  deaths: number;
  leaks: number;
  impacts: number;
  splashes: number;
  bossSpawns: number;
}

interface EnemyView {
  c: Container;
  body: Sprite;
  shieldRing: Sprite;
  hpBack: Sprite;
  hpFill: Sprite;
  born: number;
  angle: number;
  lastHitSeq: number;
  snap: {
    x: number;
    y: number;
    dist: number;
    laneIndex: number;
    color: number;
    bounty: number;
    isBoss: boolean;
  };
}

interface TowerView {
  c: Container;
  turret: Sprite;
  pips: Graphics;
  key: string;
  lastCooldown: number;
  firedAt: number;
  type: TowerTypeId;
}

interface HeroView {
  c: Container;
  turret: Sprite;
  pips: Graphics;
  levelKey: number;
  lastCooldown: number;
  firedAt: number;
}

interface ProjView {
  s: Sprite;
  last: { x: number; y: number };
  type: TowerTypeId | "hero";
  splash: number;
}

interface Particle {
  s: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  /** for rings: world-unit radius to grow to; 0 = normal spark */
  growTo: number;
}

const MAX_PARTICLES = 160;

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export class Renderer {
  readonly app = new Application();
  private atlas!: TextureAtlas;
  private world = new Container();
  private staticLayer = new Graphics();
  private towerLayer = new Container();
  private enemyLayer = new Container();
  private projectileLayer = new Container();
  private fxLayer = new Container();
  private ghostLayer = new Graphics();

  private towerViews = new Map<number, TowerView>();
  private heroView: HeroView | null = null;
  private enemyViews = new Map<number, EnemyView>();
  private projViews = new Map<number, ProjView>();
  private particles: Particle[] = [];
  private textPool: Text[] = [];
  private lastNow = 0;

  private level!: LevelDef;
  /** pixels per world cell */
  cellPx = 1;

  /** world.position sans shake, so input math and re-centering stay stable. */
  private basePos = { x: 0, y: 0 };
  private shakeTime = 0;
  private shakeMag = 0;
  private readonly SHAKE_DURATION = 0.15;
  private readonly reducedMotion =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  async init(host: HTMLElement, level: LevelDef): Promise<void> {
    this.level = level;
    await this.app.init({
      resizeTo: host,
      background: "#141a22",
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.canvas);
    this.atlas = buildAtlas(this.app.renderer);

    this.ghostLayer.scale.set(1 / S);
    this.world.addChild(
      this.staticLayer,
      this.towerLayer,
      this.enemyLayer,
      this.projectileLayer,
      this.fxLayer,
      this.ghostLayer,
    );
    this.app.stage.addChild(this.world);

    this.drawBoard();
    this.layout();
    this.app.renderer.on("resize", () => this.layout());
  }

  private layout(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.cellPx = Math.min(w / this.level.cols, h / this.level.rows);
    this.world.scale.set(this.cellPx);
    this.basePos = {
      x: (w - this.cellPx * this.level.cols) / 2,
      y: (h - this.cellPx * this.level.rows) / 2,
    };
    this.world.position.set(this.basePos.x, this.basePos.y);
  }

  worldFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.basePos.x) / this.cellPx,
      y: (clientY - rect.top - this.basePos.y) / this.cellPx,
    };
  }

  /** Brief camera shake, e.g. on splash impacts, leaks, or a boss dying. */
  triggerShake(magnitude: number): void {
    if (this.reducedMotion) return;
    if (this.shakeTime <= 0 || magnitude >= this.shakeMag) this.shakeMag = magnitude;
    this.shakeTime = this.SHAKE_DURATION;
  }

  private applyShake(dt: number): void {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const amp = this.shakeMag * (this.shakeTime / this.SHAKE_DURATION);
      this.world.position.set(
        this.basePos.x + (Math.random() * 2 - 1) * amp,
        this.basePos.y + (Math.random() * 2 - 1) * amp,
      );
    } else if (this.world.position.x !== this.basePos.x || this.world.position.y !== this.basePos.y) {
      this.world.position.set(this.basePos.x, this.basePos.y);
    }
  }

  /** Terrain: tile tones, scattered props, a worn road, and portals. */
  private drawBoard(): void {
    const g = this.staticLayer;
    g.clear();
    const { cols, rows, paths } = this.level;
    const rng = createRng(hashString(`board:${this.level.id}`));
    const pathCells = new Set<number>();
    for (const path of paths) {
      for (const [a, b] of path.map((p, i) => [p, path[i + 1]] as const)) {
        if (!b) break;
        const steps = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
        const dx = Math.sign(b[0] - a[0]);
        const dy = Math.sign(b[1] - a[1]);
        for (let s = 0; s <= steps; s++) pathCells.add(cellKey(a[0] + dx * s, a[1] + dy * s));
      }
    }

    // Tiles with subtle tone variation and a hairline inset.
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const tone = COLORS.cellTones[Math.floor(rng.range(0, 3))]!;
        g.roundRect(cx + 0.02, cy + 0.02, 0.96, 0.96, 0.08).fill(tone);
        // sparse props on buildable land
        if (!pathCells.has(cellKey(cx, cy))) {
          const roll = rng.next();
          if (roll < 0.1) {
            // grass tuft
            const bx = cx + rng.range(0.25, 0.75);
            const by = cy + rng.range(0.3, 0.8);
            for (const dxi of [-0.06, 0, 0.06]) {
              g.moveTo(bx + dxi, by).lineTo(bx + dxi * 1.6, by - 0.14)
                .stroke({ width: 0.035, color: COLORS.tuft });
            }
          } else if (roll < 0.16) {
            const bx = cx + rng.range(0.25, 0.75);
            const by = cy + rng.range(0.25, 0.75);
            g.circle(bx, by, 0.07).fill(COLORS.pebble);
            g.circle(bx + 0.11, by + 0.05, 0.045).fill(COLORS.pebble);
          }
        } else {
          rng.next(); // keep prop rolls aligned regardless of path shape
        }
      }
    }

    // Road: edge, bed, and a worn center line (tinted per lane), rounded corners.
    for (const [laneIndex, path] of paths.entries()) {
      const pts = path.map(cellCenter);
      const drawPoly = (width: number, color: number, alpha = 1) => {
        const first = pts[0]!;
        g.moveTo(first.x, first.y);
        for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
        g.stroke({ width, color, alpha, cap: "round", join: "round" });
      };
      drawPoly(0.94, COLORS.roadEdge);
      drawPoly(0.8, COLORS.road);
      const wearColor = LANE_WEAR_TINTS[laneIndex % LANE_WEAR_TINTS.length]!;
      drawPoly(0.42, wearColor, 0.35);

      // Portals (static part; the pulse is animated in the overlay).
      const start = pts[0]!;
      const end = pts[pts.length - 1]!;
      g.circle(start.x, start.y, 0.34).fill(0x241d3d)
        .stroke({ width: 0.07, color: COLORS.portalIn });
      g.circle(end.x, end.y, 0.34).fill(0x3d1d1d)
        .stroke({ width: 0.07, color: COLORS.portalOut });
    }

    // Board frame.
    g.roundRect(-0.06, -0.06, cols + 0.12, rows + 0.12, 0.15)
      .stroke({ width: 0.1, color: COLORS.boardFrame });
  }

  render(state: GameState, ui: UiState, now: number): RenderEvents {
    const dt = this.lastNow ? Math.min(now - this.lastNow, 0.1) : 0.016;
    this.lastNow = now;
    const events: RenderEvents = {
      shots: 0,
      deaths: 0,
      leaks: 0,
      impacts: 0,
      splashes: 0,
      bossSpawns: 0,
    };
    this.syncTowers(state, now);
    this.syncHero(state, now);
    this.syncEnemies(state, now, events);
    this.syncProjectiles(state, events);
    this.updateParticles(dt);
    this.applyShake(dt);
    this.drawOverlay(state, ui, now);
    return events;
  }

  // ---------- towers ----------

  private makeTowerView(type: TowerTypeId): TowerView {
    const c = new Container();
    const shadow = new Sprite(this.atlas.shadow);
    shadow.anchor.set(0.5);
    shadow.scale.set(1.3 / T);
    shadow.position.set(0.04, 0.07);
    const base = new Sprite(this.atlas.towerBase);
    base.anchor.set(0.5);
    base.scale.set(1 / T);
    const pips = new Graphics();
    pips.scale.set(1 / S);
    const turret = new Sprite(this.atlas.turrets[type]);
    turret.anchor.set(0.5);
    turret.scale.set(1 / T);
    c.addChild(shadow, base, pips, turret);
    return { c, turret, pips, key: "", lastCooldown: 0, firedAt: -10, type };
  }

  private syncTowers(state: GameState, now: number): void {
    const seen = new Set<number>();
    for (const tower of state.towers) {
      seen.add(tower.id);
      let view = this.towerViews.get(tower.id);
      if (!view) {
        view = this.makeTowerView(tower.type);
        view.c.position.set(tower.x, tower.y);
        this.towerViews.set(tower.id, view);
        this.towerLayer.addChild(view.c);
      }
      // Tier styling: pips + slightly larger turret.
      const key = `${tower.tier}:${tower.path}`;
      if (view.key !== key) {
        view.key = key;
        view.pips.clear();
        if (tower.tier > 0 && tower.path !== null) {
          const pipColor = tower.path === 0 ? COLORS.pathA : COLORS.pathB;
          for (let i = 0; i < tower.tier; i++) {
            const offset = (i - (tower.tier - 1) / 2) * 0.18;
            view.pips
              .circle(offset * S, 0.3 * S, 0.05 * S)
              .fill(pipColor)
              .stroke({ width: 0.018 * S, color: 0x1a2330 });
          }
        }
      }
      // Fire detection → recoil start.
      if (tower.cooldown > view.lastCooldown) view.firedAt = now;
      view.lastCooldown = tower.cooldown;

      const aim = Math.atan2(tower.aimY, tower.aimX);
      const recoil = Math.max(0, 1 - (now - view.firedAt) / 0.12);
      const tierScale = (1 + tower.tier * 0.09) / T;
      if (tower.type === "frost") {
        view.turret.rotation = now * 0.7;
        view.turret.scale.set(tierScale * (1 + recoil * 0.15));
      } else {
        view.turret.rotation = aim;
        view.turret.scale.set(tierScale);
        view.turret.position.set(
          -Math.cos(aim) * 0.07 * recoil,
          -Math.sin(aim) * 0.07 * recoil,
        );
      }
    }
    for (const [id, view] of this.towerViews) {
      if (!seen.has(id)) {
        view.c.destroy({ children: true });
        this.towerViews.delete(id);
      }
    }
  }

  // ---------- hero ----------

  private makeHeroView(): HeroView {
    const c = new Container();
    const shadow = new Sprite(this.atlas.shadow);
    shadow.anchor.set(0.5);
    shadow.scale.set(1.3 / T);
    shadow.position.set(0.04, 0.07);
    const base = new Sprite(this.atlas.towerBase);
    base.anchor.set(0.5);
    base.scale.set(1 / T);
    const pips = new Graphics();
    pips.scale.set(1 / S);
    const turret = new Sprite(this.atlas.heroTurret);
    turret.anchor.set(0.5);
    turret.scale.set(1 / T);
    c.addChild(shadow, base, pips, turret);
    return { c, turret, pips, levelKey: -1, lastCooldown: 0, firedAt: -10 };
  }

  private syncHero(state: GameState, now: number): void {
    const hero = state.hero;
    if (!hero) {
      if (this.heroView) {
        this.heroView.c.destroy({ children: true });
        this.heroView = null;
      }
      return;
    }
    let view = this.heroView;
    if (!view) {
      view = this.makeHeroView();
      view.c.position.set(hero.x, hero.y);
      this.heroView = view;
      this.towerLayer.addChild(view.c);
    }
    const level = heroLevelIndex(state.heroXp);
    if (view.levelKey !== level) {
      view.levelKey = level;
      view.pips.clear();
      for (let i = 0; i < level; i++) {
        const offset = (i - (level - 1) / 2) * 0.18;
        view.pips
          .circle(offset * S, 0.3 * S, 0.05 * S)
          .fill(0xfbbf24)
          .stroke({ width: 0.018 * S, color: 0x1a2330 });
      }
    }
    if (hero.cooldown > view.lastCooldown) view.firedAt = now;
    view.lastCooldown = hero.cooldown;
    const aim = Math.atan2(hero.aimY, hero.aimX);
    const recoil = Math.max(0, 1 - (now - view.firedAt) / 0.12);
    view.turret.rotation = aim;
    view.turret.scale.set((1 + level * 0.06) / T);
    view.turret.position.set(-Math.cos(aim) * 0.07 * recoil, -Math.sin(aim) * 0.07 * recoil);
  }

  // ---------- enemies ----------

  private makeEnemyView(type: keyof typeof ENEMIES, now: number): EnemyView {
    const def = ENEMIES[type];
    const c = new Container();
    const shadow = new Sprite(this.atlas.shadow);
    shadow.anchor.set(0.5);
    shadow.scale.set((def.radius * 3.4) / T);
    shadow.position.set(0.02, 0.06);
    const body = new Sprite(this.atlas.enemies[type]);
    body.anchor.set(0.5);
    body.scale.set(1 / T);
    body.alpha = def.flying ? 0.82 : 1;
    const shieldRing = new Sprite(this.atlas.ring);
    shieldRing.anchor.set(0.5);
    shieldRing.tint = 0x93c5fd;
    shieldRing.scale.set((def.radius * 2.6) / T);
    shieldRing.visible = false;
    const hpBack = new Sprite(Texture.WHITE);
    hpBack.tint = COLORS.hpBack;
    const hpFill = new Sprite(Texture.WHITE);
    hpFill.tint = COLORS.hpFill;
    const w = Math.max(0.5, def.radius * 2.2);
    for (const bar of [hpBack, hpFill]) {
      bar.anchor.set(0, 0.5);
      bar.position.set(-w / 2, -def.radius - 0.24);
      bar.height = 0.09;
      bar.visible = false;
    }
    hpBack.width = w;
    c.addChild(shadow, body, shieldRing, hpBack, hpFill);
    return {
      c,
      body,
      shieldRing,
      hpBack,
      hpFill,
      born: now,
      angle: 0,
      lastHitSeq: 0,
      snap: { x: 0, y: 0, dist: 0, laneIndex: 0, color: def.color, bounty: def.bounty, isBoss: !!def.isBoss },
    };
  }

  private syncEnemies(state: GameState, now: number, events: RenderEvents): void {
    const seen = new Set<number>();
    for (const enemy of state.enemies) {
      seen.add(enemy.id);
      let view = this.enemyViews.get(enemy.id);
      const def = ENEMIES[enemy.type];
      if (!view) {
        view = this.makeEnemyView(enemy.type, now);
        this.enemyViews.set(enemy.id, view);
        this.enemyLayer.addChild(view.c);
        if (def.isBoss) {
          events.bossSpawns++;
          this.spawnRing(enemy.x, enemy.y, 0.9, def.color);
          this.triggerShake(5);
        }
      }
      if (enemy.hitSeq !== view.lastHitSeq) {
        view.lastHitSeq = enemy.hitSeq;
        this.hitFlash(enemy.x, enemy.y, def.radius);
      }
      // Face direction of travel (smoothed).
      const dx = enemy.x - view.snap.x;
      const dy = enemy.y - view.snap.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.001) {
        const target = Math.atan2(dy, dx);
        let delta = target - view.angle;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        view.angle += delta * 0.25;
      }
      view.snap = {
        x: enemy.x,
        y: enemy.y,
        dist: enemy.dist,
        laneIndex: enemy.laneIndex,
        color: def.color,
        bounty: enemy.bounty,
        isBoss: !!def.isBoss,
      };
      view.c.position.set(enemy.x, enemy.y);
      view.body.rotation = view.angle;

      // Spawn pop + walk bob.
      const age = now - view.born;
      const pop = age < 0.28 ? easeOutBack(age / 0.28) : 1;
      const bob = 1 + Math.sin(now * 9 + enemy.id * 1.7) * 0.05;
      view.body.scale.set((pop * bob) / T, (pop * (2 - bob)) / T);

      // Debuff tinting (stun/poison take priority over the older slow/brittle combos).
      const stunned = state.tick < enemy.stunUntilTick;
      const poisoned = state.tick < enemy.poisonUntilTick;
      const slowed = state.tick < enemy.slowUntilTick;
      const brittle = state.tick < enemy.brittleUntilTick;
      view.body.tint = stunned
        ? 0xfde68a
        : poisoned
          ? 0x84cc16
          : slowed && brittle
            ? 0xa9c0ff
            : slowed
              ? 0x9fd4ff
              : brittle
                ? 0xd7c5ff
                : 0xffffff;

      // Shield ring: visible and fading with remaining shield pool.
      view.shieldRing.visible = enemy.shieldHp > 0;
      if (enemy.shieldHp > 0) {
        view.shieldRing.alpha = 0.4 + 0.5 * (enemy.shieldHp / enemy.shieldMax);
      }

      const frac = Math.max(0, enemy.hp / enemy.maxHp);
      const showHp = frac < 1;
      view.hpBack.visible = showHp;
      view.hpFill.visible = showHp;
      if (showHp) view.hpFill.width = view.hpBack.width * frac;
    }
    // Departed enemies: near the exit → leak, otherwise death.
    for (const [id, view] of this.enemyViews) {
      if (seen.has(id)) continue;
      const leaked = view.snap.dist >= state.tracks[view.snap.laneIndex]!.length - 0.6;
      if (leaked) {
        events.leaks++;
        this.spawnRing(view.snap.x, view.snap.y, 0.55, COLORS.portalOut);
        this.triggerShake(3);
      } else {
        events.deaths++;
        this.burst(view.snap.x, view.snap.y, view.snap.color, 8);
        this.floatText(view.snap.x, view.snap.y - 0.3, `+${view.snap.bounty}`);
        if (view.snap.isBoss) this.triggerShake(9);
      }
      view.c.destroy({ children: true });
      this.enemyViews.delete(id);
    }
  }

  // ---------- projectiles ----------

  private syncProjectiles(state: GameState, events: RenderEvents): void {
    const seen = new Set<number>();
    for (const proj of state.projectiles) {
      seen.add(proj.id);
      let view = this.projViews.get(proj.id);
      if (!view) {
        const tex =
          proj.towerType === "hero"
            ? this.atlas.heroProjectile
            : this.atlas.projectiles[proj.towerType];
        const s = new Sprite(tex);
        s.anchor.set(0.5);
        s.scale.set(1 / T);
        view = {
          s,
          last: { x: proj.x, y: proj.y },
          type: proj.towerType,
          splash: proj.splashRadius,
        };
        this.projViews.set(proj.id, view);
        this.projectileLayer.addChild(s);
        events.shots++;
        this.muzzleFlash(proj.x, proj.y);
      }
      view.s.rotation = Math.atan2(proj.y - view.last.y, proj.x - view.last.x);
      view.last = { x: proj.x, y: proj.y };
      view.s.position.set(proj.x, proj.y);
    }
    for (const [id, view] of this.projViews) {
      if (seen.has(id)) continue;
      const color = view.type === "hero" ? HERO.projectileColor : TOWERS[view.type].projectileColor;
      if (view.splash > 0) {
        events.splashes++;
        this.spawnRing(view.last.x, view.last.y, view.splash, color);
        this.burst(view.last.x, view.last.y, color, 8);
        this.triggerShake(4);
      } else {
        events.impacts++;
        this.burst(view.last.x, view.last.y, color, 3);
      }
      view.s.destroy();
      this.projViews.delete(id);
    }
  }

  // ---------- particles & floating text ----------

  private addParticle(p: Particle): void {
    if (this.particles.length >= MAX_PARTICLES) {
      const oldest = this.particles.shift()!;
      oldest.s.destroy();
    }
    this.particles.push(p);
    this.fxLayer.addChild(p.s);
  }

  private burst(x: number, y: number, color: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.2 + Math.random() * 1.6;
      const s = new Sprite(this.atlas.spark);
      s.anchor.set(0.5);
      s.tint = color;
      s.blendMode = "add";
      s.position.set(x, y);
      s.scale.set((0.7 + Math.random() * 0.7) / T);
      this.addParticle({
        s,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.35,
        maxLife: 0.35,
        growTo: 0,
      });
    }
  }

  private muzzleFlash(x: number, y: number): void {
    const s = new Sprite(this.atlas.glow);
    s.anchor.set(0.5);
    s.tint = 0xfff3c0;
    s.blendMode = "add";
    s.position.set(x, y);
    s.scale.set(0.5 / T);
    this.addParticle({ s, vx: 0, vy: 0, life: 0.08, maxLife: 0.08, growTo: 0 });
  }

  /** Brief additive white flash on an enemy that just took damage. */
  private hitFlash(x: number, y: number, radius: number): void {
    const s = new Sprite(this.atlas.glow);
    s.anchor.set(0.5);
    s.tint = 0xffffff;
    s.blendMode = "add";
    s.position.set(x, y);
    s.scale.set((radius * 2.2) / T);
    this.addParticle({ s, vx: 0, vy: 0, life: 0.1, maxLife: 0.1, growTo: 0 });
  }

  private spawnRing(x: number, y: number, radius: number, color: number): void {
    const s = new Sprite(this.atlas.ring);
    s.anchor.set(0.5);
    s.tint = color;
    s.blendMode = "add";
    s.position.set(x, y);
    s.scale.set(0.2 / T);
    this.addParticle({ s, vx: 0, vy: 0, life: 0.35, maxLife: 0.35, growTo: radius });
  }

  private floatText(x: number, y: number, str: string): void {
    let t = this.textPool.find((p) => !p.visible);
    if (!t) {
      if (this.textPool.length >= 8) return;
      t = new Text({
        text: "",
        style: {
          fontFamily: "system-ui, sans-serif",
          fontSize: 26,
          fontWeight: "800",
          fill: COLORS.gold,
          stroke: { color: 0x141a22, width: 5 },
        },
      });
      t.anchor.set(0.5);
      t.scale.set(1 / 70);
      this.textPool.push(t);
      this.fxLayer.addChild(t);
    }
    t.text = str;
    t.position.set(x, y);
    t.alpha = 1;
    t.visible = true;
    (t as unknown as { _life: number })._life = 0.7;
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        p.s.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      const t = 1 - p.life / p.maxLife;
      if (p.growTo > 0) {
        // expanding ring: texture radius is T/2 px at scale 1/T → 0.5 world units
        p.s.scale.set(((0.2 + t * 1.8) * p.growTo) / (T * 0.5) );
        p.s.alpha = 1 - t;
      } else {
        p.s.x += p.vx * dt;
        p.s.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.s.alpha = 1 - t;
      }
    }
    for (const t of this.textPool) {
      if (!t.visible) continue;
      const rec = t as unknown as { _life: number };
      rec._life -= dt;
      if (rec._life <= 0) {
        t.visible = false;
        continue;
      }
      t.y -= dt * 0.8;
      t.alpha = Math.min(1, rec._life / 0.3);
    }
  }

  // ---------- overlay (ghost, selection, portal pulse) ----------

  private drawOverlay(state: GameState, ui: UiState, now: number): void {
    const g = this.ghostLayer;
    g.clear();

    // Animated portal pulses, one pair per lane.
    const pulse = 0.34 + 0.05 * Math.sin(now * 3);
    for (const path of state.level.paths) {
      const pts = path.map(cellCenter);
      const start = pts[0]!;
      const end = pts[pts.length - 1]!;
      g.circle(start.x * S, start.y * S, pulse * S)
        .stroke({ width: 0.045 * S, color: COLORS.portalIn, alpha: 0.5 + 0.3 * Math.sin(now * 3) });
      g.circle(end.x * S, end.y * S, pulse * S)
        .stroke({ width: 0.045 * S, color: COLORS.portalOut, alpha: 0.5 + 0.3 * Math.cos(now * 2.6) });
    }

    // Selected tower: highlight + range ring.
    if (ui.selectedTowerId !== null) {
      const tower = state.towers.find((t) => t.id === ui.selectedTowerId);
      if (tower) {
        const stats = effectiveTowerStats(state, tower);
        g.roundRect(tower.cx * S, tower.cy * S, S, S, 0.1 * S).stroke({
          width: 0.05 * S,
          color: COLORS.select,
          alpha: 0.9,
        });
        g.circle(tower.x * S, tower.y * S, stats.range * S)
          .fill({ color: COLORS.select, alpha: 0.06 })
          .stroke({ width: 0.03 * S, color: COLORS.select, alpha: 0.5 });
      }
    }

    const placement = ui.placement;
    if (!placement.active) return;
    const visual =
      placement.type === "hero"
        ? { color: HERO.color, edgeColor: HERO.edgeColor }
        : TOWERS[placement.type];
    const range = placement.type === "hero" ? HERO.base.range : TOWERS[placement.type].base.range;

    if (placement.onBoard) {
      const color = placement.valid ? COLORS.ghostValid : COLORS.ghostInvalid;
      g.roundRect(
        (placement.cx + 0.05) * S,
        (placement.cy + 0.05) * S,
        0.9 * S,
        0.9 * S,
        0.1 * S,
      )
        .fill({ color, alpha: 0.18 })
        .stroke({ width: 0.05 * S, color, alpha: 0.9 });
      g.circle((placement.cx + 0.5) * S, (placement.cy + 0.5) * S, range * S)
        .fill({ color, alpha: 0.07 })
        .stroke({ width: 0.03 * S, color, alpha: 0.5 });
    }
    g.roundRect(
      (placement.worldX - 0.36) * S,
      (placement.worldY - 0.36) * S,
      0.72 * S,
      0.72 * S,
      0.12 * S,
    )
      .fill({ color: visual.color, alpha: 0.75 })
      .stroke({ width: 0.05 * S, color: visual.edgeColor, alpha: 0.9 });
  }

  setLevel(level: LevelDef): void {
    this.level = level;
    this.drawBoard();
    this.layout();
    this.reset();
  }

  /** Drop all per-entity views and effects (used on restart). */
  reset(): void {
    this.shakeTime = 0;
    for (const view of this.towerViews.values()) view.c.destroy({ children: true });
    this.towerViews.clear();
    for (const view of this.enemyViews.values()) view.c.destroy({ children: true });
    this.enemyViews.clear();
    for (const view of this.projViews.values()) view.s.destroy();
    this.projViews.clear();
    for (const p of this.particles) p.s.destroy();
    this.particles = [];
    for (const t of this.textPool) t.visible = false;
    this.ghostLayer.clear();
  }
}
