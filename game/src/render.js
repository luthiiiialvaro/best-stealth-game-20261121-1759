// Shadow Lantern — rendering: draws the whole level on one canvas.
// Floor reads at a glance: pale marble, dark shadow pools, green bushes,
// brown crates, a glowing green exit, a golden artifact. Guards are dark
// blue figures with pale vision cones that turn red when alarmed.

import { TILE } from './levels.js';

const VIEW_W = 960;
const VIEW_H = 608;

export function drawWorld(ctx, grid, player, guards, artifact, exitPos, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  // --- Floor, walls, cover ---
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      const ch = grid[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (ch === '#') {
        ctx.fillStyle = '#2c2f45';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#3d4160';
        ctx.fillRect(x, y, TILE, 5);
        continue;
      }
      // Marble floor with a faint checker.
      ctx.fillStyle = (col + row) % 2 === 0 ? '#d8d2c4' : '#cfc8b8';
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === 'S') {
        ctx.fillStyle = 'rgba(20, 24, 48, 0.55)';
        ctx.fillRect(x, y, TILE, TILE);
      } else if (ch === 'B') {
        ctx.fillStyle = '#3e7d44';
        ctx.beginPath();
        ctx.arc(x + 9, y + 11, 8, 0, Math.PI * 2);
        ctx.arc(x + 22, y + 9, 9, 0, Math.PI * 2);
        ctx.arc(x + 16, y + 22, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#57a05e';
        ctx.beginPath();
        ctx.arc(x + 13, y + 14, 5, 0, Math.PI * 2);
        ctx.arc(x + 22, y + 19, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (ch === 'C') {
        ctx.fillStyle = '#8a6b45';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = '#6b4f31';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2);
        ctx.lineTo(x + TILE - 2, y + TILE - 2);
        ctx.moveTo(x + TILE - 2, y + 2);
        ctx.lineTo(x + 2, y + TILE - 2);
        ctx.stroke();
      }
    }
  }

  // --- Exit: a glowing green doorway ---
  if (exitPos) {
    const pulse = 0.6 + 0.25 * Math.sin(time * 3);
    ctx.fillStyle = `rgba(46, 204, 113, ${pulse})`;
    ctx.fillRect(exitPos.x - 14, exitPos.y - 14, 28, 28);
    ctx.fillStyle = '#1e7d46';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', exitPos.x, exitPos.y - 20);
  }

  // --- Artifact: the golden lantern, gently bobbing ---
  if (artifact) {
    const bob = Math.sin(time * 2) * 3;
    const glow = ctx.createRadialGradient(artifact.x, artifact.y + bob, 2, artifact.x, artifact.y + bob, 30);
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.85)');
    glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(artifact.x, artifact.y + bob, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(artifact.x - 6, artifact.y - 10 + bob, 12, 16);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(artifact.x - 4, artifact.y - 7 + bob, 8, 10);
    ctx.fillStyle = '#8a6508';
    ctx.fillRect(artifact.x - 8, artifact.y - 12 + bob, 16, 3);
  }

  // --- Footstep rings (noise you made while running) ---
  for (const ring of player.rings) {
    const alpha = 1 - ring.age / 0.9;
    ctx.strokeStyle = `rgba(200, 60, 60, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, 6 + ring.age * 40, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Guards: vision cone first, then the body ---
  for (const guard of guards) {
    const alarmed = guard.state === 'chase';
    const suspicious = guard.state === 'suspicious' || guard.state === 'search';
    const poly = guard.conePolygon(grid);
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (const p of poly.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = alarmed
      ? 'rgba(231, 76, 60, 0.34)'
      : suspicious
        ? 'rgba(243, 156, 18, 0.30)'
        : 'rgba(247, 220, 111, 0.26)';
    ctx.fill();

    // Body: dark blue guard with a cap, facing the cone.
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.rotate(guard.facing);
    ctx.fillStyle = '#1f2a44';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#31406b';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7dc6f';
    ctx.beginPath();
    ctx.moveTo(10, -5);
    ctx.lineTo(18, 0);
    ctx.lineTo(10, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // "?" while suspicious, "!" while chasing.
    if (alarmed || suspicious) {
      ctx.fillStyle = alarmed ? '#e74c3c' : '#f39c12';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(alarmed ? '!' : '?', guard.x, guard.y - 20);
    }
  }

  // --- Player: hooded thief, darker when sneaking ---
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.atan2(player.dirY, player.dirX));
  ctx.fillStyle = player.sneaking ? '#4a2c6d' : '#6c3483';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8e44ad';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7dc6f';
  ctx.beginPath();
  ctx.moveTo(9, -4);
  ctx.lineTo(16, 0);
  ctx.lineTo(9, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (player.hasArtifact) {
    // Dark pill behind the label so it reads over bright cones.
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const label = '★ lantern';
    const w = ctx.measureText(label).width + 10;
    ctx.fillStyle = 'rgba(20, 24, 48, 0.85)';
    ctx.beginPath();
    ctx.roundRect(player.x - w / 2, player.y - 30, w, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.fillText(label, player.x, player.y - 18);
  }

  // --- Suspicion flash at the screen edge while any guard is alarmed ---
  const maxSuspicion = Math.max(0, ...guards.map((g) => g.suspicion));
  if (maxSuspicion > 55) {
    ctx.strokeStyle = `rgba(231, 76, 60, ${((maxSuspicion - 55) / 45) * 0.55})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, VIEW_W - 10, VIEW_H - 10);
  }
}

export { VIEW_W, VIEW_H };
