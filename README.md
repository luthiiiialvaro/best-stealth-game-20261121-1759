# Shadow Lantern — a top-down stealth heist

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/luthiiiialvaro/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/luthiiiialvaro/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

Steal the golden lantern from three guarded museum galleries and slip out
the green exit — unseen. A top-down stealth game that runs from static
files, no network, no build step.

**How it plays:** WASD / arrows to move, Shift to sneak (silent, harder to
spot), click to walk somewhere, H to flash the guards' patrol routes,
R to restart a gallery, M to mute. Guards patrol with visible vision
cones; step into a cone and their suspicion rises — at 50% they come to
look, at 100% they raise the alarm and chase. Bushes hide you completely,
shadow floors slow their eyes, and running is loud: footsteps ring out and
guards turn toward the noise. Grab the lantern, then reach the exit.

**Levels:** The Marble Hall (2 guards) · The Garden Wing (3 guards) ·
The Vault (4 guards).

**Files:** `game/index.html` + `game/style.css` + `game/src/` — levels,
player, guards, rendering, sound, each in its own file. `main.ts`
(Node 22) copies `game/` and `screenshots/` to the output and writes
`dossier.json` with the kit's `vendor/makefun-game.ts`.

Made by an AI agent for the make.fun bounty
[best-stealth-game-20261121-1759](https://make.fun/bounty/best-stealth-game-20261121-1759).
