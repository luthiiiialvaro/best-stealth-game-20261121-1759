// Shadow Lantern — the game itself: state machine, input, loop, HUD.
// States: title -> playing -> caught | levelDone -> win.
// ?demo=1..4 starts a level mid-play with a staged scene, so screenshots
// can show the game at its best without playing through it first.

import { LEVELS, TILE, findTile } from './levels.js';
import { Player } from './player.js';
import { Guard, HEAR_RANGE } from './guards.js';
import { SoundBank } from './audio.js';
import { drawWorld, VIEW_W, VIEW_H } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const $ = (id) => document.getElementById(id);
const hud = {
  level: $('hud-level'),
  objective: $('hud-objective'),
  meter: $('hud-meter-fill'),
  meterLabel: $('hud-meter-label'),
  timer: $('hud-timer'),
  banner: $('banner'),
  bannerTitle: $('banner-title'),
  bannerText: $('banner-text'),
  hint: $('hud-hint'),
};

const sounds = new SoundBank();
const player = new Player(0, 0);
let guards = [];
let levelIndex = 0;
let grid = [];
let artifactPos = null;
let exitPos = null;
let state = 'title'; // title | playing | caught | levelDone | win
let stateTimer = 0;
let elapsed = 0;
let attempts = 0;
let totalTime = 0;
let lastTimestamp = 0;
let guardStepTimer = 0;

const input = { up: false, down: false, left: false, right: false, sneak: false };

const KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

function showBanner(title, text, showButton = false) {
  hud.bannerTitle.textContent = title;
  hud.bannerText.textContent = text;
  hud.banner.classList.remove('hidden');
  $('banner-button').classList.toggle('hidden', !showButton);
}

function hideBanner() {
  hud.banner.classList.add('hidden');
}

function loadLevel(index) {
  levelIndex = index;
  const level = LEVELS[index];
  grid = level.grid.map((row) => row.split(''));
  const start = findTile(level.grid, 'P');
  player.reset(start.x, start.y);
  artifactPos = findTile(level.grid, 'A');
  exitPos = findTile(level.grid, 'X');
  guards = level.guards.map((g) => new Guard((g.x + 0.5) * TILE, (g.y + 0.5) * TILE, g.patrol));
  hud.level.textContent = level.name;
  updateObjective();
  elapsed = 0;
}

function updateObjective() {
  hud.objective.textContent = player.hasArtifact
    ? 'Lantern secured — reach the green EXIT!'
    : 'Steal the golden lantern, then reach the EXIT.';
}

function startGame() {
  sounds.ensure();
  attempts = 0;
  totalTime = 0;
  loadLevel(0);
  state = 'playing';
  hideBanner();
}

function nextLevel() {
  if (levelIndex + 1 >= LEVELS.length) {
    state = 'win';
    sounds.win();
    showBanner(
      'YOU DID IT — THE VAULT IS YOURS',
      `All three galleries cleared in ${formatTime(totalTime)}. No alarms that mattered. The Shadow Lantern is yours.`,
      true,
    );
    $('banner-button').textContent = 'Play again';
    return;
  }
  loadLevel(levelIndex + 1);
  state = 'playing';
  showBanner(LEVELS[levelIndex].name, LEVELS[levelIndex].hint);
  stateTimer = 2.2;
}

function onCaught() {
  state = 'caught';
  attempts += 1;
  sounds.caught();
  showBanner('CAUGHT!', `A guard grabbed you. Attempt ${attempts} on this gallery — watch the cones, use the bushes.`, true);
  $('banner-button').textContent = 'Try again';
}

function onAlarm(guard) {
  sounds.alarm();
  void guard;
}

// --- Demo scenes for screenshots (?demo=1..4) ---
function applyDemo(n) {
  if (n === 1) {
    // Level 1, mid-play: player in a bush, a cone sweeping across, exit visible.
    loadLevel(0);
    player.x = 9.5 * TILE;
    player.y = 3.5 * TILE;
    player.sneaking = true;
    player.dirX = 1;
    player.dirY = 0;
    guards[0].suspicion = 32;
    guards[0].state = 'suspicious';
    guards[0].lastSeen = { x: player.x, y: player.y };
  } else if (n === 2) {
    // Level 2: two guards, high suspicion, player behind a crate.
    loadLevel(1);
    player.x = 13.5 * TILE;
    player.y = 7.5 * TILE;
    player.sneaking = true;
    guards[0].suspicion = 58;
    guards[0].state = 'suspicious';
    guards[0].lastSeen = { x: player.x, y: player.y };
    guards[1].suspicion = 20;
  } else if (n === 3) {
    // Level 3: lantern already stolen, player one dash from the exit.
    loadLevel(2);
    player.hasArtifact = true;
    player.x = 24.5 * TILE;
    player.y = 16.5 * TILE;
    player.dirX = 0;
    player.dirY = 1;
    updateObjective();
  } else if (n === 4) {
    // Alarm moment: guard chasing, red cone, full suspicion.
    loadLevel(0);
    player.x = 17.5 * TILE;
    player.y = 4.5 * TILE;
    player.dirX = -1;
    player.dirY = 0;
    guards[0].x = 9.5 * TILE;
    guards[0].y = 4.5 * TILE;
    guards[0].facing = 0;
    guards[0].state = 'chase';
    guards[0].suspicion = 100;
    guards[0].lastSeen = { x: player.x, y: player.y };
    // Chasing from ~9 tiles away: at the screenshot moment the guard is
    // still closing in, red cone and "!" visible, player not yet caught.
  }
  state = 'playing';
  hideBanner();
}

// --- Input ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter' || e.code === 'Space') {
    if (state === 'title') startGame();
    else if (state === 'caught') loadLevel(levelIndex), (state = 'playing'), hideBanner();
    else if (state === 'levelDone') nextLevel();
    else if (state === 'win') startGame();
    e.preventDefault();
    return;
  }
  if (KEYS[e.code]) {
    input[KEYS[e.code]] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  }
  if (e.code === 'KeyR' && state === 'playing') loadLevel(levelIndex);
  if (e.code === 'KeyH' && state === 'playing') flashPatrols();
  if (e.code === 'KeyM') {
    sounds.ensure();
    hud.meterLabel.textContent = sounds.toggleMute() ? 'sound off (M)' : 'sound on (M)';
  }
});

window.addEventListener('keyup', (e) => {
  if (KEYS[e.code]) input[KEYS[e.code]] = false;
});

canvas.addEventListener('mousedown', (e) => {
  sounds.ensure();
  if (state !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = VIEW_W / rect.width;
  const scaleY = VIEW_H / rect.height;
  player.clickTarget = {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
});

$('banner-button').addEventListener('click', () => {
  sounds.ensure();
  if (state === 'title') startGame();
  else if (state === 'caught') loadLevel(levelIndex), (state = 'playing'), hideBanner();
  else if (state === 'levelDone') nextLevel();
  else if (state === 'win') startGame();
});

let patrolFlash = 0;
function flashPatrols() {
  patrolFlash = 2.5; // seconds the patrol routes stay drawn
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// --- Main loop ---
function frame(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000 || 0.016);
  lastTimestamp = timestamp;

  if (state === 'playing') {
    elapsed += dt;
    totalTime += dt;
    if (stateTimer > 0) {
      stateTimer -= dt;
      if (stateTimer <= 0) hideBanner();
    }

    const step = player.update(dt, grid, input);
    if (step === 'step') {
      sounds.footstep();
      // Guards in earshot turn toward the noise.
      for (const g of guards) {
        if (Math.hypot(g.x - player.x, g.y - player.y) < HEAR_RANGE && g.state === 'patrol') {
          g.heard = { x: player.x, y: player.y };
        }
      }
    }

    // Guard footsteps, faint, so you can track patrols by ear.
    guardStepTimer -= dt;
    if (guardStepTimer <= 0) {
      guardStepTimer = 0.9;
      sounds.guardStep();
    }

    let caught = false;
    let wasSuspicious = false;
    for (const g of guards) {
      if (g.state === 'suspicious' || g.state === 'search') wasSuspicious = true;
      if (g.update(dt, grid, player, onAlarm) === 'caught') caught = true;
    }
    if (wasSuspicious && Math.random() < dt * 0.5) sounds.suspicious();
    if (caught) {
      onCaught();
    } else {
      // Pick up the artifact.
      if (artifactPos && !player.hasArtifact && Math.hypot(player.x - artifactPos.x, player.y - artifactPos.y) < 24) {
        player.hasArtifact = true;
        artifactPos = null;
        sounds.pickup();
        updateObjective();
      }
      // Reach the exit with the lantern.
      if (player.hasArtifact && exitPos && Math.hypot(player.x - exitPos.x, player.y - exitPos.y) < 22) {
        state = 'levelDone';
        sounds.win();
        if (levelIndex + 1 >= LEVELS.length) {
          nextLevel();
        } else {
          showBanner(
            `${LEVELS[levelIndex].name} — CLEAR`,
            `Lantern stolen, unseen enough. ${formatTime(elapsed)} on this gallery.`,
            true,
          );
          $('banner-button').textContent = 'Next gallery';
        }
      }
    }

    // HUD
    const maxSuspicion = Math.max(0, ...guards.map((g) => g.suspicion));
    hud.meter.style.width = `${maxSuspicion}%`;
    hud.meter.style.background = maxSuspicion >= 100 ? '#e74c3c' : maxSuspicion >= 50 ? '#f39c12' : '#f7dc6f';
    hud.timer.textContent = formatTime(elapsed);
    if (patrolFlash > 0) patrolFlash -= dt;
  }

  // --- Draw ---
  if (state === 'title') {
    drawTitle();
  } else {
    drawWorld(ctx, grid, player, guards, artifactPos, exitPos, timestamp / 1000);
    if (patrolFlash > 0) drawPatrols();
  }
  requestAnimationFrame(frame);
}

function drawPatrols() {
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(52, 152, 219, 0.9)';
  ctx.lineWidth = 2;
  for (const g of guards) {
    ctx.beginPath();
    g.patrol.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawTitle() {
  ctx.fillStyle = '#141830';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
  ctx.beginPath();
  ctx.arc(VIEW_W / 2, 150, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SHADOW LANTERN', VIEW_W / 2, 170);
  ctx.fillStyle = '#d8d2c4';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('A top-down stealth heist in three galleries', VIEW_W / 2, 215);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = '#9aa0b5';
  ctx.fillText('WASD / arrows — move      Shift — sneak      Click — walk there', VIEW_W / 2, 300);
  ctx.fillText('H — show patrol routes      R — restart gallery      M — mute', VIEW_W / 2, 330);
  ctx.fillStyle = '#f7dc6f';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Steal the golden lantern, dodge the cones, reach the green EXIT.', VIEW_W / 2, 390);
  ctx.fillText('Bushes hide you. Shadows slow their eyes. Running is loud.', VIEW_W / 2, 420);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Press ENTER or click START to play', VIEW_W / 2, 490);
}

// --- Boot ---
const demo = new URLSearchParams(location.search).get('demo');
if (demo) {
  applyDemo(Number(demo));
} else {
  showBanner(
    'SHADOW LANTERN',
    'A top-down stealth heist. Steal the golden lantern from three guarded galleries and slip out the green exit — unseen.',
    true,
  );
  $('banner-button').textContent = 'START';
}
requestAnimationFrame(frame);
