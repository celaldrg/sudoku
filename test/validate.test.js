import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyGrid, indexOf } from '../src/board.js';
import { findConflicts, findMistakes, isComplete, isSolved } from '../src/validate.js';
import { parseGrid } from '../test-support/grid.js';

// A classic easy puzzle and its solution.
const EASY = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
const EASY_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

test('detects a row conflict', () => {
  const grid = emptyGrid();
  grid[indexOf(0, 0)] = 5;
  grid[indexOf(0, 8)] = 5;
  assert.deepEqual(findConflicts(grid), [indexOf(0, 0), indexOf(0, 8)]);
});

test('detects a column conflict', () => {
  const grid = emptyGrid();
  grid[indexOf(0, 4)] = 7;
  grid[indexOf(8, 4)] = 7;
  assert.deepEqual(findConflicts(grid), [indexOf(0, 4), indexOf(8, 4)]);
});

test('detects a box conflict', () => {
  const grid = emptyGrid();
  grid[indexOf(0, 0)] = 3;
  grid[indexOf(2, 2)] = 3;
  assert.deepEqual(findConflicts(grid), [indexOf(0, 0), indexOf(2, 2)]);
});

test('reports every cell of a triple clash once', () => {
  const grid = emptyGrid();
  grid[indexOf(4, 0)] = 2;
  grid[indexOf(4, 5)] = 2;
  grid[indexOf(4, 8)] = 2;
  assert.deepEqual(findConflicts(grid), [indexOf(4, 0), indexOf(4, 5), indexOf(4, 8)]);
});

test('valid grids have no conflicts', () => {
  assert.deepEqual(findConflicts(emptyGrid()), []);
  assert.deepEqual(findConflicts(parseGrid(EASY)), []);
  assert.deepEqual(findConflicts(parseGrid(EASY_SOLUTION)), []);
});

test('isComplete needs every cell filled without conflicts', () => {
  const solution = parseGrid(EASY_SOLUTION);
  assert.equal(isComplete(solution), true);

  const missing = solution.slice();
  missing[40] = 0;
  assert.equal(isComplete(missing), false);

  const swapped = solution.slice();
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]]; // row still fine, columns broken
  assert.equal(isComplete(swapped), false);

  assert.equal(isComplete([1, 2, 3]), false);
});

test('findMistakes and isSolved compare against the solution', () => {
  const solution = parseGrid(EASY_SOLUTION);
  const grid = parseGrid(EASY);
  assert.deepEqual(findMistakes(grid, solution), []);
  assert.equal(isSolved(grid, solution), false);

  grid[2] = 9; // solution has 4 here
  assert.deepEqual(findMistakes(grid, solution), [2]);

  assert.equal(isSolved(solution.slice(), solution), true);
});
