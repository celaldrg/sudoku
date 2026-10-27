import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyGrid, indexOf } from '../src/board.js';
import { generateSolvedGrid } from '../src/generator.js';
import { createRng } from '../src/rng.js';
import { countSolutions, solve } from '../src/solver.js';
import { isComplete } from '../src/validate.js';
import { formatGrid, parseGrid } from '../test-support/grid.js';

// A classic easy puzzle and its solution.
const EASY = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
const EASY_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
// A notoriously hard puzzle and its solution.
const HARD = '8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..';
const HARD_SOLUTION = '812753649943682175675491283154237896369845721287169534521974368438526917796318452';
// Only 17 givens, the minimum for a unique solution.
const SEVENTEEN = '000000010400000000020000000000050407008000300001090000300400200050100000000806000';

function keepsGivens(puzzle, solution) {
  return puzzle.every((v, i) => v === 0 || v === solution[i]);
}

/** Finds four cells forming a swappable a/b rectangle across exactly two boxes. */
function findSwappableRectangle(solution) {
  for (let r1 = 0; r1 < 9; r1++) {
    for (let r2 = r1 + 1; r2 < 9; r2++) {
      for (let c1 = 0; c1 < 9; c1++) {
        for (let c2 = c1 + 1; c2 < 9; c2++) {
          const sameBand = Math.floor(r1 / 3) === Math.floor(r2 / 3);
          const sameStack = Math.floor(c1 / 3) === Math.floor(c2 / 3);
          if (sameBand === sameStack) continue;
          const cells = [indexOf(r1, c1), indexOf(r1, c2), indexOf(r2, c1), indexOf(r2, c2)];
          const [a, b, c, d] = cells.map((i) => solution[i]);
          if (a === d && b === c) return cells;
        }
      }
    }
  }
  return null;
}

test('solves a classic easy puzzle', () => {
  assert.equal(formatGrid(solve(parseGrid(EASY))), EASY_SOLUTION);
});

test('solves a hard puzzle', () => {
  const puzzle = parseGrid(HARD);
  const solution = solve(puzzle);
  assert.equal(formatGrid(solution), HARD_SOLUTION);
  assert.equal(countSolutions(puzzle), 1);
});

test('solves a 17-given puzzle with a unique, valid solution', () => {
  const puzzle = parseGrid(SEVENTEEN);
  const solution = solve(puzzle);
  assert.ok(isComplete(solution));
  assert.ok(keepsGivens(puzzle, solution));
  assert.equal(countSolutions(puzzle), 1);
});

test('does not modify the input grid', () => {
  const puzzle = parseGrid(HARD);
  const copy = puzzle.slice();
  solve(puzzle);
  countSolutions(puzzle);
  assert.deepEqual(puzzle, copy);
});

test('countSolutions detects multiple solutions on an empty grid', () => {
  assert.equal(countSolutions(emptyGrid()), 2);
  assert.equal(countSolutions(emptyGrid(), 5), 5);
  assert.equal(countSolutions(emptyGrid(), 1), 1);
});

test('countSolutions finds exactly two solutions for a swappable rectangle', () => {
  let cells = null;
  let solution = null;
  for (let seed = 1; seed <= 50 && !cells; seed++) {
    solution = generateSolvedGrid(createRng(seed));
    cells = findSwappableRectangle(solution);
  }
  assert.ok(cells, 'expected a swappable rectangle in one of the grids');
  const grid = solution.slice();
  for (const i of cells) grid[i] = 0;
  assert.equal(countSolutions(grid, 10), 2);
});

test('countSolutions detects an under-constrained grid', () => {
  const grid = parseGrid(EASY_SOLUTION);
  for (let i = 27; i < 81; i++) grid[i] = 0; // keep only the top band
  assert.equal(countSolutions(grid), 2);
});

test('invalid or contradictory grids have no solution', () => {
  const duplicate = parseGrid(EASY);
  duplicate[1] = 5; // second 5 in row 0
  assert.equal(countSolutions(duplicate), 0);
  assert.equal(solve(duplicate), null);

  const deadEnd = emptyGrid();
  for (let c = 0; c < 8; c++) deadEnd[c] = c + 1; // row 0: 1-8, last cell must be 9
  deadEnd[indexOf(1, 8)] = 9; // ...but column 8 already has a 9
  assert.equal(countSolutions(deadEnd), 0);
  assert.equal(solve(deadEnd), null);

  assert.equal(countSolutions([1, 2, 3]), 0);
  const outOfRange = emptyGrid();
  outOfRange[0] = 12;
  assert.equal(solve(outOfRange), null);
});

test('a seeded solver produces valid, reproducible random grids', () => {
  const a = solve(emptyGrid(), createRng(9));
  const b = solve(emptyGrid(), createRng(9));
  const c = solve(emptyGrid(), createRng(10));
  assert.ok(isComplete(a));
  assert.ok(isComplete(c));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});
