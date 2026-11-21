// Shadow Lantern — level definitions.
//
// Each level is a grid of tiles, 30 columns by 19 rows, plus the guards
// that patrol it. Legend:
//   '#' wall (blocks movement and sight)      '.' open floor
//   'S' shadow floor (dark: detection rises 3x slower there)
//   'B' bush (hides the player: unseen unless a guard is very close)
//   'C' crate (blocks movement and sight)
//   'P' player start   'A' the artifact to steal   'X' the exit
// Guard patrol waypoints are tile coordinates [col, row].

export const TILE = 32;

export const LEVELS = [
  {
    name: 'Level 1 — The Marble Hall',
    hint: 'Grab the golden lantern, then reach the green exit. Stay out of the cones — sneak with Shift.',
    grid: [
      '##############################',
      '#P......C......B......A......#',
      '#............................#',
      '#..S.....C........B.....S....#',
      '#............................#',
      '#......####......####........#',
      '#......#..#......#..#....C...#',
      '#..B...#..#..S...#..#........#',
      '#......#..#......#..#....B...#',
      '#......####......####........#',
      '#............................#',
      '#..C.......B......C......S...#',
      '#............................#',
      '#..S.....C........B......X...#',
      '#............................#',
      '#......####......####........#',
      '#......#..#......#..#........#',
      '#..B...#..#..S...#..#....C...#',
      '##############################',
    ],
    guards: [
      { x: 15, y: 2, patrol: [[15, 2], [15, 8], [22, 8], [22, 2]] },
      { x: 8, y: 13, patrol: [[8, 13], [8, 17], [20, 17], [20, 13]] },
    ],
  },
  {
    name: 'Level 2 — The Garden Wing',
    hint: 'Bushes hide you completely. Running is loud — guards hear footsteps.',
    grid: [
      '##############################',
      '#P...B.......S.......C.......#',
      '#............................#',
      '#..B....C......B......S...A..#',
      '#............................#',
      '#..S......####.....####......#',
      '#.........#..#.....#..#..B...#',
      '#..C......#..#.B...#..#......#',
      '#.........#..#.....#..#..S...#',
      '#..B......####.....####......#',
      '#............................#',
      '#.....S......C......B........#',
      '#............................#',
      '#..C......B......S......C....#',
      '#............................#',
      '#..B....####....####....B....#',
      '#......#....#..#....#........#',
      '#..S...#....#..#....#....X...#',
      '##############################',
    ],
    guards: [
      { x: 10, y: 2, patrol: [[10, 2], [10, 6], [19, 6], [19, 2]] },
      { x: 24, y: 8, patrol: [[24, 8], [24, 13], [14, 13], [14, 8]] },
      { x: 6, y: 16, patrol: [[6, 16], [6, 12], [12, 12], [12, 16]] },
    ],
  },
  {
    name: 'Level 3 — The Vault',
    hint: 'Four guards, tight patrols. Shadows are your best friend now.',
    grid: [
      '##############################',
      '#P....S....C....B....S....A..#',
      '#............................#',
      '#..C.....####...####.....C...#',
      '#.......#....#.#....#........#',
      '#..S....#....#.#....#...S....#',
      '#.......#....#.#....#........#',
      '#..B....######.######....B...#',
      '#............................#',
      '#..S.....C....B....C.....S...#',
      '#............................#',
      '#.......####...####.....C....#',
      '#......#....#.#....#.........#',
      '#..B...#....#.#....#...B.....#',
      '#......#....#.#....#.........#',
      '#..S...######.######....S....#',
      '#............................#',
      '#..C....B.....S.....C....X...#',
      '##############################',
    ],
    guards: [
      { x: 9, y: 2, patrol: [[9, 2], [9, 6], [20, 6], [20, 2]] },
      { x: 25, y: 9, patrol: [[25, 9], [25, 14], [15, 14], [15, 9]] },
      { x: 5, y: 12, patrol: [[5, 12], [5, 16], [11, 16], [11, 12]] },
      { x: 15, y: 16, patrol: [[15, 16], [15, 10], [22, 10], [22, 16]] },
    ],
  },
];

// Find the single tile of a given character in a grid, as pixel coordinates.
export function findTile(grid, ch) {
  for (let row = 0; row < grid.length; row++) {
    const col = grid[row].indexOf(ch);
    if (col >= 0) return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
  }
  return null;
}

// Is this tile solid (blocks movement and sight)?
export function isSolidTile(grid, col, row) {
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return true;
  const ch = grid[row][col];
  return ch === '#' || ch === 'C';
}

export function tileAt(grid, px, py) {
  const col = Math.floor(px / TILE);
  const row = Math.floor(py / TILE);
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return '#';
  return grid[row][col];
}
