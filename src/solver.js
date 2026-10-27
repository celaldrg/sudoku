/**
 * Backtracking Sudoku solver using digit bitmasks per row, column and box,
 * always branching on the empty cell with the fewest candidates (MRV).
 */
import { ALL_DIGITS_MASK, CELL_COUNT, boxOf, colOf, maskToDigits, popcount, rowOf } from './board.js';
import { shuffle } from './rng.js';

const ROW = Array.from({ length: CELL_COUNT }, (_, i) => rowOf(i));
const COL = Array.from({ length: CELL_COUNT }, (_, i) => colOf(i));
const BOX = Array.from({ length: CELL_COUNT }, (_, i) => boxOf(i));

/**
 * Solves a puzzle. With an RNG, candidate digits are tried in random order,
 * which turns the solver into a random full-grid generator.
 * @param {ArrayLike<number>} grid 81-cell grid (0 = empty). Not modified.
 * @param {() => number} [rng] Optional random source.
 * @returns {number[] | null} A solved grid, or null when there is none.
 */
export function solve(grid, rng) {
  const state = createState(grid);
  if (!state) return null;
  let solution = null;
  search(state, 1, rng, (cells) => {
    solution = cells.slice();
  });
  return solution;
}

/**
 * Counts solutions, stopping early once `limit` is reached.
 * @param {ArrayLike<number>} grid 81-cell grid (0 = empty). Not modified.
 * @param {number} [limit=2] Upper bound on the count (2 is enough to test uniqueness).
 * @returns {number} Number of solutions found, at most `limit`; 0 for invalid grids.
 */
export function countSolutions(grid, limit = 2) {
  const state = createState(grid);
  if (!state || limit < 1) return 0;
  return search(state, limit, undefined, () => {});
}

function createState(grid) {
  if (!grid || grid.length !== CELL_COUNT) return null;
  const state = {
    cells: Array.from(grid),
    rows: new Array(9).fill(0),
    cols: new Array(9).fill(0),
    boxes: new Array(9).fill(0),
  };
  for (let i = 0; i < CELL_COUNT; i++) {
    const digit = state.cells[i];
    if (digit === 0) continue;
    if (!Number.isInteger(digit) || digit < 1 || digit > 9) return null;
    const bit = 1 << digit;
    if ((state.rows[ROW[i]] | state.cols[COL[i]] | state.boxes[BOX[i]]) & bit) return null;
    place(state, i, digit);
  }
  return state;
}

function place(state, index, digit) {
  const bit = 1 << digit;
  state.cells[index] = digit;
  state.rows[ROW[index]] |= bit;
  state.cols[COL[index]] |= bit;
  state.boxes[BOX[index]] |= bit;
}

function unplace(state, index, digit) {
  const keep = ~(1 << digit);
  state.cells[index] = 0;
  state.rows[ROW[index]] &= keep;
  state.cols[COL[index]] &= keep;
  state.boxes[BOX[index]] &= keep;
}

/** Finds the empty cell with the fewest candidates; index -1 means solved. */
function pickCell(state) {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (state.cells[i] !== 0) continue;
    const mask = ALL_DIGITS_MASK & ~(state.rows[ROW[i]] | state.cols[COL[i]] | state.boxes[BOX[i]]);
    const count = popcount(mask);
    if (count < bestCount) {
      best = i;
      bestMask = mask;
      bestCount = count;
      if (count < 2) break;
    }
  }
  return { index: best, mask: bestMask };
}

function search(state, limit, rng, onSolution) {
  const { index, mask } = pickCell(state);
  if (index === -1) {
    onSolution(state.cells);
    return 1;
  }
  const digits = maskToDigits(mask);
  if (rng) shuffle(digits, rng);
  let found = 0;
  for (const digit of digits) {
    place(state, index, digit);
    found += search(state, limit - found, rng, onSolution);
    unplace(state, index, digit);
    if (found >= limit) break;
  }
  return found;
}
