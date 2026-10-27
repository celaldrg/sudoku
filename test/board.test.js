import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  boxOf,
  candidateMask,
  colOf,
  emptyGrid,
  indexOf,
  maskToDigits,
  peersOf,
  popcount,
  rowOf,
  units,
} from '../src/board.js';
import { parseGrid } from '../test-support/grid.js';

// A classic easy puzzle.
const EASY = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';

test('index helpers map rows, columns and boxes', () => {
  assert.equal(indexOf(4, 7), 43);
  assert.equal(rowOf(43), 4);
  assert.equal(colOf(43), 7);
  assert.equal(boxOf(0), 0);
  assert.equal(boxOf(indexOf(4, 4)), 4);
  assert.equal(boxOf(80), 8);
  assert.equal(boxOf(indexOf(2, 6)), 2);
});

test('there are 27 units of 9 cells and every cell has 20 peers', () => {
  assert.equal(units().length, 27);
  assert.ok(units().every((unit) => unit.length === 9));
  for (let i = 0; i < 81; i++) {
    const peers = peersOf(i);
    assert.equal(peers.length, 20);
    assert.ok(!peers.includes(i));
  }
});

test('bitmask helpers', () => {
  const mask = (1 << 2) | (1 << 5) | (1 << 9);
  assert.equal(popcount(mask), 3);
  assert.deepEqual(maskToDigits(mask), [2, 5, 9]);
});

test('candidateMask excludes digits used by peers', () => {
  const grid = parseGrid(EASY);
  // Cell (0,2): row has 5,3,7; column has 8; box adds 6,9 -> candidates 1,2,4.
  assert.deepEqual(maskToDigits(candidateMask(grid, indexOf(0, 2))), [1, 2, 4]);
  assert.deepEqual(maskToDigits(candidateMask(emptyGrid(), 40)), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
