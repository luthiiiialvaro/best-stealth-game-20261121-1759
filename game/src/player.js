// Shadow Lantern — the player: a hooded thief.
// Moves with WASD/arrows or by clicking a destination. Shift = sneak:
// slower and silent, and guards spot a sneaking player half as fast.
// Running is loud: every step leaves a visible footstep ring that guards
// within earshot turn toward.

import { TILE, isSolidTile, tileAt } from './levels.js';

export const PLAYER_RADIUS = 11;
export const RUN_SPEED = 132; // px per second
export const SNEAK_SPEED = 68;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dirX = 0;
    this.dirY = 1; // facing down at spawn
    this.sneaking = false;
    this.moving = false;
    this.stepTimer = 0;
    this.clickTarget = null; // {x, y} from a mouse click, or null
    this.rings = []; // footstep rings: {x, y, age}
    this.hasArtifact = false;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.dirX = 0;
    this.dirY = 1;
    this.sneaking = false;
    this.moving = false;
    this.clickTarget = null;
    this.rings = [];
    this.hasArtifact = false;
  }

  // Move one axis at a time so the player slides along walls instead of
  // sticking on corners.
  tryMove(grid, dx, dy) {
    const nx = this.x + dx;
    if (!this.hitsSolid(grid, nx, this.y)) this.x = nx;
    const ny = this.y + dy;
    if (!this.hitsSolid(grid, this.x, ny)) this.y = ny;
  }

  hitsSolid(grid, px, py) {
    const r = PLAYER_RADIUS - 1;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      if (isSolidTile(grid, Math.floor((px + ox) / TILE), Math.floor((py + oy) / TILE))) return true;
    }
    return false;
  }

  update(dt, grid, input) {
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;

    // A mouse click sets a destination; keyboard input overrides it.
    if (mx === 0 && my === 0 && this.clickTarget) {
      const dx = this.clickTarget.x - this.x;
      const dy = this.clickTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        this.clickTarget = null;
      } else {
        mx = dx / dist;
        my = dy / dist;
      }
    } else if (mx !== 0 || my !== 0) {
      this.clickTarget = null;
    }

    this.moving = mx !== 0 || my !== 0;
    this.sneaking = !!input.sneak;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.dirX = mx;
      this.dirY = my;
      const speed = this.sneaking ? SNEAK_SPEED : RUN_SPEED;
      this.tryMove(grid, mx * speed * dt, my * speed * dt);
      // Loud steps only while running: a ring every 0.35 s.
      if (!this.sneaking) {
        this.stepTimer -= dt;
        if (this.stepTimer <= 0) {
          this.stepTimer = 0.35;
          this.rings.push({ x: this.x, y: this.y, age: 0 });
          return 'step';
        }
      }
    }
    for (const ring of this.rings) ring.age += dt;
    this.rings = this.rings.filter((ring) => ring.age < 0.9);
    return null;
  }

  // Where the player stands: open floor, shadow, or inside a bush?
  ground(grid) {
    return tileAt(grid, this.x, this.y);
  }
}
