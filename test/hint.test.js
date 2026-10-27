import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidateMask, emptyGrid, popcount } from '../src/board.js';
import { generatePuzzle } from '../src/generator.js';
import { findHint } from '../src/hint.js';
import { parseGrid } from '../test-support/grid.js';

// A classic easy puzzle and its solution.
const EASY = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
const EASY_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

const SOLUTION = parseGrid(EASY_SOLUTION);

test('prefers a naked single with its correct value', () => {
  const grid = parseGrid(EASY);
  const hint = findHint(grid, SOLUTION);
  assert.equal(hint.reason, 'single');
  assert.equal(grid[hint.index], 0);
  assert.equal(popcount(candidateMask(grid, hint.index)), 1);
  assert.equal(hint.value, SOLUTION[hint.index]);
});

test('ignores wrong entries when looking for singles', () => {
  const grid = SOLUTION.slice();
  grid[0] = 0;
  grid[1] = SOLUTION[0]; // a wrong digit that would hide the right one
  const hint = findHint(grid, SOLUTION);
  assert.deepEqual(hint, { index: 0, value: SOLUTION[0], reason: 'single' });
});

test('points at a wrong entry when no single exists', () => {
  const grid = emptyGrid();
  grid[10] = SOLUTION[10] === 1 ? 2 : 1;
  assert.deepEqual(findHint(grid, SOLUTION), { index: 10, value: SOLUTION[10], reason: 'mistake' });
});

test('falls back to an empty cell when there are no singles or mistakes', () => {
  const hint = findHint(emptyGrid(), SOLUTION);
  assert.equal(hint.reason, 'empty');
  assert.equal(hint.value, SOLUTION[hint.index]);
});

test('returns null for a solved grid', () => {
  assert.equal(findHint(SOLUTION.slice(), SOLUTION), null);
});

test('following hints alone solves a generated puzzle', () => {
  const { puzzle, solution } = generatePuzzle({ difficulty: 'hard', seed: 3 });
  const grid = puzzle.slice();
  const empties = grid.filter((v) => v === 0).length;
  for (let step = 0; step < empties; step++) {
    const hint = findHint(grid, solution);
    assert.equal(grid[hint.index], 0);
    assert.equal(hint.value, solution[hint.index]);
    grid[hint.index] = hint.value;
  }
  assert.deepEqual(grid, solution);
  assert.equal(findHint(grid, solution), null);
});
