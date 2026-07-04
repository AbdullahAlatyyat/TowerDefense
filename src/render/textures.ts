import { Container, Graphics, Renderer as PixiRenderer, Texture } from "pixi.js";
import type { EnemyTypeId } from "../data/enemies";
import { ENEMIES } from "../data/enemies";
import { TOWERS, type TowerTypeId } from "../data/towers";

/**
 * All art is generated once at startup from vector draws into textures —
 * zero asset files, crisp at any DPI, and sprites are far cheaper per frame
 * than re-tessellated Graphics. Everything is authored at T px per world
 * cell; sprites get scaled back to world units by the renderer.
 */
export const T = 128;

export interface TextureAtlas {
  enemies: Record<EnemyTypeId, Texture>;
  towerBase: Texture;
  turrets: Record<TowerTypeId, Texture>;
  projectiles: Record<TowerTypeId, Texture>;
  shadow: Texture;
  glow: Texture;
  spark: Texture;
  ring: Texture;
}

function toTexture(renderer: PixiRenderer, g: Container): Texture {
  const tex = renderer.generateTexture({ target: g, resolution: 1 });
  g.destroy(true);
  return tex;
}

function shade(color: number, f: number): number {
  const r = Math.min(255, Math.round((((color >> 16) & 0xff) * f)));
  const g = Math.min(255, Math.round((((color >> 8) & 0xff) * f)));
  const b = Math.min(255, Math.round(((color & 0xff) * f)));
  return (r << 16) | (g << 8) | b;
}

/** Two eyes looking toward +x (the direction of travel). */
function drawEyes(g: Graphics, r: number, spread: number, size: number): void {
  for (const sy of [-1, 1]) {
    g.circle(r * 0.45, sy * r * spread, size).fill(0xffffff);
    g.circle(r * 0.55, sy * r * spread, size * 0.55).fill(0x1a1420);
  }
}

function enemyTexture(renderer: PixiRenderer, type: EnemyTypeId): Texture {
  const def = ENEMIES[type];
  const r = def.radius * T;
  const g = new Graphics();
  const dark = shade(def.color, 0.55);
  const light = shade(def.color, 1.35);

  switch (type) {
    case "grunt":
      g.circle(0, 0, r).fill(def.color).stroke({ width: r * 0.16, color: dark });
      g.circle(-r * 0.25, -r * 0.25, r * 0.5).fill({ color: light, alpha: 0.35 });
      drawEyes(g, r, 0.42, r * 0.2);
      // angry brow
      g.moveTo(r * 0.2, -r * 0.62).lineTo(r * 0.68, -r * 0.34)
        .moveTo(r * 0.2, r * 0.62).lineTo(r * 0.68, r * 0.34)
        .stroke({ width: r * 0.12, color: dark });
      break;
    case "runner": {
      // teardrop: pointed nose +x, round tail
      g.moveTo(r * 1.25, 0)
        .quadraticCurveTo(r * 0.4, -r, -r * 0.7, -r * 0.62)
        .quadraticCurveTo(-r * 1.15, 0, -r * 0.7, r * 0.62)
        .quadraticCurveTo(r * 0.4, r, r * 1.25, 0)
        .fill(def.color)
        .stroke({ width: r * 0.15, color: dark });
      g.circle(-r * 0.1, -r * 0.3, r * 0.35).fill({ color: light, alpha: 0.35 });
      drawEyes(g, r, 0.3, r * 0.17);
      break;
    }
    case "brute": {
      g.roundRect(-r * 0.95, -r * 0.85, r * 1.9, r * 1.7, r * 0.5)
        .fill(def.color)
        .stroke({ width: r * 0.14, color: dark });
      // horns
      for (const sy of [-1, 1]) {
        g.moveTo(-r * 0.15, sy * r * 0.8)
          .lineTo(r * 0.25, sy * r * 1.25)
          .lineTo(r * 0.45, sy * r * 0.7)
          .closePath()
          .fill(0xe8e3d5);
      }
      g.roundRect(-r * 0.8, -r * 0.35, r * 0.7, r * 0.7, r * 0.2)
        .fill({ color: light, alpha: 0.3 });
      drawEyes(g, r, 0.32, r * 0.16);
      g.moveTo(r * 0.14, -r * 0.52).lineTo(r * 0.6, -r * 0.26)
        .moveTo(r * 0.14, r * 0.52).lineTo(r * 0.6, r * 0.26)
        .stroke({ width: r * 0.12, color: dark });
      break;
    }
    case "swarm":
      // little cyclops with wing nubs
      for (const sy of [-1, 1]) {
        g.ellipse(-r * 0.7, sy * r * 0.7, r * 0.55, r * 0.3)
          .fill({ color: light, alpha: 0.55 });
      }
      g.circle(0, 0, r).fill(def.color).stroke({ width: r * 0.18, color: dark });
      g.circle(r * 0.35, 0, r * 0.34).fill(0xffffff);
      g.circle(r * 0.48, 0, r * 0.18).fill(0x1a1420);
      break;
    case "golem": {
      // armored octagon boulder with plate seams
      const sides = 8;
      g.moveTo(r, 0);
      for (let i = 1; i <= sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.fill(def.color).stroke({ width: r * 0.16, color: dark });
      g.moveTo(-r * 0.5, -r * 0.2).lineTo(r * 0.5, -r * 0.1)
        .moveTo(-r * 0.4, r * 0.3).lineTo(r * 0.4, r * 0.35)
        .stroke({ width: r * 0.05, color: dark });
      g.circle(-r * 0.2, -r * 0.2, r * 0.4).fill({ color: light, alpha: 0.3 });
      drawEyes(g, r, 0.3, r * 0.15);
      break;
    }
    case "wisp": {
      // ghostly orb trailing a wavy translucent tail
      g.moveTo(-r * 0.6, r * 0.4)
        .quadraticCurveTo(-r * 0.3, r * 0.75, 0, r * 0.4)
        .quadraticCurveTo(r * 0.3, r * 0.75, r * 0.6, r * 0.4)
        .stroke({ width: r * 0.2, color: def.color, alpha: 0.55, cap: "round" });
      g.circle(0, -r * 0.15, r * 0.8)
        .fill({ color: def.color, alpha: 0.85 })
        .stroke({ width: r * 0.1, color: dark, alpha: 0.7 });
      g.circle(-r * 0.15, -r * 0.4, r * 0.3).fill({ color: light, alpha: 0.5 });
      drawEyes(g, r * 0.8, 0.35, r * 0.14);
      break;
    }
    case "troll": {
      // stocky healer silhouette with a glowing cross on its chest
      g.roundRect(-r * 0.75, -r * 0.9, r * 1.5, r * 1.8, r * 0.6)
        .fill(def.color)
        .stroke({ width: r * 0.15, color: dark });
      g.roundRect(-r * 0.09, -r * 0.05, r * 0.18, r * 0.5, r * 0.05).fill({ color: 0xffffff, alpha: 0.75 });
      g.roundRect(-r * 0.25, r * 0.1, r * 0.5, r * 0.18, r * 0.05).fill({ color: 0xffffff, alpha: 0.75 });
      g.circle(-r * 0.2, -r * 0.5, r * 0.35).fill({ color: light, alpha: 0.3 });
      drawEyes(g, r, 0.35, r * 0.17);
      break;
    }
    case "warden": {
      // shield emblem on a stout body, hinting at its damage-absorbing shield
      g.circle(0, 0, r).fill(def.color).stroke({ width: r * 0.16, color: dark });
      g.moveTo(0, -r * 0.55)
        .lineTo(r * 0.45, -r * 0.25)
        .lineTo(r * 0.35, r * 0.35)
        .lineTo(0, r * 0.6)
        .lineTo(-r * 0.35, r * 0.35)
        .lineTo(-r * 0.45, -r * 0.25)
        .closePath()
        .fill({ color: 0xffffff, alpha: 0.25 })
        .stroke({ width: r * 0.05, color: 0xffffff, alpha: 0.6 });
      drawEyes(g, r, 0.4, r * 0.16);
      break;
    }
    case "blob": {
      // amoeba shape with two inner nubs foreshadowing its on-death split
      g.circle(-r * 0.35, r * 0.25, r * 0.42).fill(def.color).stroke({ width: r * 0.1, color: dark });
      g.circle(r * 0.35, r * 0.25, r * 0.42).fill(def.color).stroke({ width: r * 0.1, color: dark });
      g.circle(0, 0, r).fill(def.color).stroke({ width: r * 0.14, color: dark });
      g.circle(-r * 0.2, -r * 0.25, r * 0.35).fill({ color: light, alpha: 0.35 });
      drawEyes(g, r, 0.35, r * 0.18);
      break;
    }
    case "warlord": {
      // hulking silhouette with a spiked crown — reads as a boss at a glance
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.5 + (i - 2) * 0.32;
        const bx = Math.cos(a) * r * 0.85;
        const by = Math.sin(a) * r * 0.85;
        g.moveTo(bx - r * 0.08, by).lineTo(bx, by - r * 0.5).lineTo(bx + r * 0.08, by)
          .closePath()
          .fill(0xe8d9a0)
          .stroke({ width: r * 0.03, color: dark });
      }
      g.circle(0, 0, r).fill(def.color).stroke({ width: r * 0.18, color: dark });
      g.circle(-r * 0.25, -r * 0.25, r * 0.5).fill({ color: light, alpha: 0.3 });
      g.moveTo(r * 0.15, -r * 0.68).lineTo(r * 0.7, -r * 0.36)
        .moveTo(r * 0.15, r * 0.68).lineTo(r * 0.7, r * 0.36)
        .stroke({ width: r * 0.13, color: dark });
      drawEyes(g, r, 0.4, r * 0.22);
      g.circle(r * 0.45, -r * 0.4, r * 0.22).fill({ color: 0xf87171, alpha: 0.6 });
      g.circle(r * 0.45, r * 0.4, r * 0.22).fill({ color: 0xf87171, alpha: 0.6 });
      break;
    }
  }
  return toTexture(renderer, g);
}

function towerBaseTexture(renderer: PixiRenderer): Texture {
  const g = new Graphics();
  const s = T * 0.82;
  // stone plate with bevel
  g.roundRect(-s / 2, -s / 2, s, s, s * 0.18).fill(0x2a3646);
  g.roundRect(-s / 2, -s / 2, s, s, s * 0.18)
    .stroke({ width: s * 0.05, color: 0x1a2330 });
  g.roundRect(-s / 2 + s * 0.07, -s / 2 + s * 0.07, s * 0.86, s * 0.4, s * 0.12)
    .fill({ color: 0x455a75, alpha: 0.35 });
  // corner bolts
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      g.circle(sx * s * 0.33, sy * s * 0.33, s * 0.05).fill(0x55708f);
    }
  }
  return toTexture(renderer, g);
}

/** Turrets are drawn facing +x and rotated by the renderer. */
function turretTexture(renderer: PixiRenderer, type: TowerTypeId): Texture {
  const def = TOWERS[type];
  const g = new Graphics();
  const c = def.color;
  const dark = shade(c, 0.55);
  const light = shade(c, 1.4);
  const u = T;

  switch (type) {
    case "gunner":
      for (const sy of [-1, 1]) {
        g.roundRect(0, sy * u * 0.11 - u * 0.045, u * 0.42, u * 0.09, u * 0.03)
          .fill(0xb8c8de)
          .stroke({ width: u * 0.02, color: 0x5a6a80 });
        g.rect(u * 0.36, sy * u * 0.11 - u * 0.055, u * 0.07, u * 0.11).fill(0x5a6a80);
      }
      g.circle(0, 0, u * 0.19).fill(c).stroke({ width: u * 0.035, color: dark });
      g.circle(-u * 0.04, -u * 0.04, u * 0.08).fill({ color: light, alpha: 0.6 });
      break;
    case "cannon":
      g.roundRect(-u * 0.05, -u * 0.11, u * 0.5, u * 0.22, u * 0.08)
        .fill(0x4a4038)
        .stroke({ width: u * 0.03, color: 0x2e2822 });
      g.rect(u * 0.16, -u * 0.13, u * 0.06, u * 0.26).fill(0x2e2822);
      g.circle(u * 0.45, 0, u * 0.1).fill(0x1a1512);
      g.circle(0, 0, u * 0.21).fill(c).stroke({ width: u * 0.04, color: dark });
      g.circle(-u * 0.05, -u * 0.05, u * 0.08).fill({ color: light, alpha: 0.5 });
      break;
    case "frost": {
      // six-point ice crystal (spins slowly instead of aiming)
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        g.moveTo(ca * u * 0.08, sa * u * 0.08)
          .lineTo(ca * u * 0.34, sa * u * 0.34)
          .stroke({ width: u * 0.07, color: light });
        g.circle(ca * u * 0.34, sa * u * 0.34, u * 0.05).fill(0xffffff);
      }
      g.circle(0, 0, u * 0.13).fill(0xffffff).stroke({ width: u * 0.035, color: c });
      break;
    }
    case "sniper":
      g.roundRect(-u * 0.18, -u * 0.05, u * 0.75, u * 0.1, u * 0.04)
        .fill(0xd8e0ea)
        .stroke({ width: u * 0.02, color: 0x707d8f });
      g.rect(u * 0.5, -u * 0.065, u * 0.07, u * 0.13).fill(0x707d8f);
      g.circle(u * 0.1, -u * 0.11, u * 0.07).fill(0x2b3648)
        .stroke({ width: u * 0.025, color: 0x9fb2c8 });
      g.circle(0, 0, u * 0.16).fill(c).stroke({ width: u * 0.035, color: shade(c, 0.6) });
      break;
  }
  return toTexture(renderer, g);
}

function projectileTexture(renderer: PixiRenderer, type: TowerTypeId): Texture {
  const def = TOWERS[type];
  const g = new Graphics();
  const u = T;
  switch (type) {
    case "gunner":
      g.roundRect(-u * 0.09, -u * 0.035, u * 0.18, u * 0.07, u * 0.035)
        .fill(def.projectileColor);
      g.roundRect(0, -u * 0.02, u * 0.09, u * 0.04, u * 0.02).fill(0xffffff);
      break;
    case "cannon":
      g.circle(0, 0, u * 0.11).fill(0x3a332c).stroke({ width: u * 0.03, color: 0x211c17 });
      g.circle(-u * 0.035, -u * 0.035, u * 0.035).fill({ color: 0xfda869, alpha: 0.9 });
      break;
    case "frost":
      for (const [w, h] of [
        [u * 0.22, u * 0.06],
        [u * 0.06, u * 0.22],
      ] as const) {
        g.moveTo(-w / 2, 0).lineTo(0, -h / 2).lineTo(w / 2, 0).lineTo(0, h / 2)
          .closePath()
          .fill(def.projectileColor);
      }
      g.circle(0, 0, u * 0.045).fill(0xffffff);
      break;
    case "sniper":
      g.roundRect(-u * 0.16, -u * 0.02, u * 0.32, u * 0.04, u * 0.02)
        .fill(0xffffff);
      g.roundRect(-u * 0.16, -u * 0.02, u * 0.14, u * 0.04, u * 0.02)
        .fill({ color: 0xffffff, alpha: 0.4 });
      break;
  }
  return toTexture(renderer, g);
}

function softCircle(renderer: PixiRenderer, radius: number, color: number, steps = 6): Texture {
  const g = new Graphics();
  for (let i = steps; i >= 1; i--) {
    g.circle(0, 0, (radius * i) / steps).fill({ color, alpha: 0.16 });
  }
  return toTexture(renderer, g);
}

export function buildAtlas(renderer: PixiRenderer): TextureAtlas {
  const enemies = {} as Record<EnemyTypeId, Texture>;
  for (const id of Object.keys(ENEMIES) as EnemyTypeId[]) {
    enemies[id] = enemyTexture(renderer, id);
  }
  const turrets = {} as Record<TowerTypeId, Texture>;
  const projectiles = {} as Record<TowerTypeId, Texture>;
  for (const id of Object.keys(TOWERS) as TowerTypeId[]) {
    turrets[id] = turretTexture(renderer, id);
    projectiles[id] = projectileTexture(renderer, id);
  }

  const spark = (() => {
    const g = new Graphics();
    g.circle(0, 0, T * 0.05).fill(0xffffff);
    return toTexture(renderer, g);
  })();

  const ring = (() => {
    const g = new Graphics();
    g.circle(0, 0, T * 0.5).stroke({ width: T * 0.06, color: 0xffffff });
    return toTexture(renderer, g);
  })();

  return {
    enemies,
    towerBase: towerBaseTexture(renderer),
    turrets,
    projectiles,
    shadow: softCircle(renderer, T * 0.34, 0x000000, 5),
    glow: softCircle(renderer, T * 0.5, 0xffffff, 7),
    spark,
    ring,
  };
}
