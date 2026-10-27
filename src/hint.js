/**
 * Hint selection. Candidates are computed from the correct entries only,
 * so a player's mistakes never lead the hint astray.
 */
import { CELL_COUNT, candidateMask, popcount } from './board.js';

/**
 * @typedef {object} Hint
 * @property {number} index Cell index 0-80.
 * @property {number} value The correct digit for that cell.
 * @property {'single' | 'mistake' | 'empty'} reason Why this cell was chosen:
 *   a naked single, a wrong entry to fix, or the empty cell with fewest candidates.
 */

/**
 * Picks the next cell to reveal: a naked single if there is one, otherwise a
 * wrong entry, otherwise the empty cell with the fewest candidates.
 * @param {ArrayLike<number>} grid Current 81-cell grid.
 * @param {ArrayLike<number>} solution Solved 81-cell grid.
 * @returns {Hint | null} null when the grid already equals the solution.
 */
export function findHint(grid, solution) {
  const known = Array.from(grid, (value, i) => (value === solution[i] ? value : 0));
  let mistake = -1;
  let fallback = -1;
  let fallbackCount = 10;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (grid[i] === solution[i]) continue;
    if (grid[i] !== 0) {
      if (mistake === -1) mistake = i;
      continue;
    }
    const count = popcount(candidateMask(known, i));
    if (count === 1) return { index: i, value: solution[i], reason: 'single' };
    if (count < fallbackCount) {
      fallback = i;
      fallbackCount = count;
    }
  }
  if (mistake !== -1) return { index: mistake, value: solution[mistake], reason: 'mistake' };
  if (fallback !== -1) return { index: fallback, value: solution[fallback], reason: 'empty' };
  return null;
}
