// Shadow Lantern — the entry program (Node 22, standard library only).
//
// It hands the game in: copies game/ and screenshots/ from beside this
// file into the output directory, then writes dossier.json there with
// buildDossier from the kit's vendored library. The grader runs it twice
// into two fresh directories and expects identical bytes, so nothing here
// depends on the clock, randomness, or anything outside
// MAKEFUN_OUTPUT_DIR (which stands in for /output outside the grader):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps for this bounty, mirrored here so a program that
// passes them here passes there.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(msg: string): never {
  throw new Error(`shadow-lantern main.ts: ${msg}`);
}

const gameDir = join(root, 'game');
const shotsDir = join(root, 'screenshots');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.'));
if (shots.length < 3 || shots.length > 4) fail(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
for (const name of shots) {
  const bytes = statSync(join(shotsDir, name)).size;
  if (bytes > 262144) fail(`screenshots/${name} is ${bytes} bytes, over the 256 KiB cap`);
}

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

let gameFiles = 0;
(function count(dir: string) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) count(join(dir, e.name));
    else gameFiles += 1;
  }
})(join(outDir, 'game'));

console.log(
  `shadow-lantern: ${gameFiles} game files, ${shots.length} screenshots (${shots.join(', ')}), ` +
    `dossier.json ${Buffer.byteLength(dossier)} bytes -> ${outDir}`,
);
