// Shadow Lantern — guards: patrol routes, vision cones, and the
// detection system.
//
// A guard cycles patrol -> suspicious -> chase -> search -> patrol.
// Suspicion 0-100 rises while the player is inside the cone with a clear
// line of sight, and falls while hidden. At 50 the guard walks toward
// where it last saw the player; at 100 it raises the alarm and chases.
// Being caught ends the attempt. Sneaking and shadows slow the rise;
// a bush hides the player entirely unless a guard is almost on top.

import { TILE, isSolidTile } from './levels.js';

export const CONE_RANGE = 175;
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const HEAR_RANGE = 150;
export const CATCH_DIST = 17;

const PATROL_SPEED = 55;
const INVESTIGATE_SPEED = 80;
const CHASE_SPEED = 96;

export class Guard {
  constructor(x, y, patrolTiles) {
    this.x = x;
    this.y = y;
    this.patrol = patrolTiles.map(([col, row]) => ({ x: (col + 0.5) * TILE, y: (row + 0.5) * TILE }));
    this.patrolIndex = 0;
    this.facing = 0; // radians; 0 = east
    this.state = 'patrol'; // patrol | suspicious | chase | search
    this.suspicion = 0;
    this.pauseTimer = 0;
    this.lastSeen = null; // {x, y} where the player was last spotted
    this.lostTimer = 0;
    this.searchTimer = 0;
    this.heard = null; // {x, y} of a noise the guard is checking
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.patrolIndex = 0;
    this.state = 'patrol';
    this.suspicion = 0;
    this.pauseTimer = 0;
    this.lastSeen = null;
    this.lostTimer = 0;
    this.searchTimer = 0;
    this.heard = null;
  }

  // Line of sight: sample the segment; a wall or crate tile blocks it.
  canSee(grid, tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / 8);
    for (let i = 1; i < steps; i++) {
      const px = this.x + (dx * i) / steps;
      const py = this.y + (dy * i) / steps;
      if (isSolidTile(grid, Math.floor(px / TILE), Math.floor(py / TILE))) return false;
    }
    return true;
  }

  // Is the player inside this guard's cone (range + angle + sight)?
  seesPlayer(grid, player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE_RANGE) return false;
    let angle = Math.atan2(dy, dx) - this.facing;
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    if (Math.abs(angle) > CONE_HALF_ANGLE) return false;
    return this.canSee(grid, player.x, player.y);
  }

  turnToward(targetAngle, dt, rate = 5) {
    let diff = targetAngle - this.facing;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
    this.facing += step;
  }

  moveToward(tx, ty, speed, dt, grid) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) return true;
    const vx = (dx / dist) * speed * dt;
    const vy = (dy / dist) * speed * dt;
    this.facing = Math.atan2(dy, dx);
    const nx = this.x + vx;
    if (!isSolidTile(grid, Math.floor((nx + Math.sign(vx) * 10) / TILE), Math.floor(this.y / TILE))) this.x = nx;
    const ny = this.y + vy;
    if (!isSolidTile(grid, Math.floor(this.x / TILE), Math.floor((ny + Math.sign(vy) * 10) / TILE))) this.y = ny;
    return false;
  }

  update(dt, grid, player, onAlarm) {
    const visible = this.seesPlayer(grid, player);
    const ground = player.ground(grid);
    const hiddenInBush = ground === 'B' && Math.hypot(player.x - this.x, player.y - this.y) > 48;

    if (visible && !hiddenInBush) {
      // How fast suspicion rises: sneaking halves it, shadow thirds it.
      let rate = 55;
      if (player.sneaking) rate *= 0.5;
      if (ground === 'S') rate /= 3;
      this.suspicion = Math.min(100, this.suspicion + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.lostTimer = 0;
      if (this.suspicion >= 100 && this.state !== 'chase') {
        this.state = 'chase';
        onAlarm(this);
      } else if (this.suspicion >= 50 && this.state === 'patrol') {
        this.state = 'suspicious';
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - 25 * dt);
      if (this.state === 'chase') {
        this.lostTimer += dt;
        if (this.lostTimer > 4) {
          this.state = 'search';
          this.searchTimer = 3;
        }
      } else if (this.state === 'suspicious' && this.suspicion <= 0) {
        this.state = 'patrol';
      }
    }

    // A footstep ring close by: turn and go look.
    if (this.heard && this.state === 'patrol') {
      this.state = 'suspicious';
      this.suspicion = Math.max(this.suspicion, 30);
      this.lastSeen = this.heard;
      this.heard = null;
    }

    switch (this.state) {
      case 'patrol': {
        if (this.pauseTimer > 0) {
          this.pauseTimer -= dt;
          break;
        }
        const target = this.patrol[this.patrolIndex];
        if (this.moveToward(target.x, target.y, PATROL_SPEED, dt, grid)) {
          this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
          this.pauseTimer = 1.2;
        }
        break;
      }
      case 'suspicious': {
        if (this.lastSeen) {
          const arrived = this.moveToward(this.lastSeen.x, this.lastSeen.y, INVESTIGATE_SPEED, dt, grid);
          if (arrived) {
            this.state = 'search';
            this.searchTimer = 2;
          }
        }
        break;
      }
      case 'chase': {
        if (this.lastSeen) this.moveToward(this.lastSeen.x, this.lastSeen.y, CHASE_SPEED, dt, grid);
        break;
      }
      case 'search': {
        this.searchTimer -= dt;
        this.turnToward(this.facing + 2.2 * dt, dt, 2.2);
        if (this.searchTimer <= 0) {
          this.state = 'patrol';
          this.suspicion = 0;
        }
        break;
      }
    }

    // Caught: the guard is on top of the player.
    if (Math.hypot(player.x - this.x, player.y - this.y) < CATCH_DIST) return 'caught';
    return null;
  }

  // The guard's cone as a list of ray endpoints, for drawing.
  conePolygon(grid) {
    const points = [{ x: this.x, y: this.y }];
    const rays = 14;
    for (let i = 0; i <= rays; i++) {
      const angle = this.facing - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / rays;
      let len = CONE_RANGE;
      for (let d = 12; d < CONE_RANGE; d += 8) {
        const px = this.x + Math.cos(angle) * d;
        const py = this.y + Math.sin(angle) * d;
        if (isSolidTile(grid, Math.floor(px / TILE), Math.floor(py / TILE))) {
          len = d;
          break;
        }
      }
      points.push({ x: this.x + Math.cos(angle) * len, y: this.y + Math.sin(angle) * len });
    }
    return points;
  }
}
