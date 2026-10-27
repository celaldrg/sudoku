/**
 * Board validation: rule conflicts, completeness and comparison with the solution.
 */
import { CELL_COUNT, units } from './board.js';

/**
 * Cells whose digit appears more than once in their row, column or box.
 * @param {ArrayLike<number>} grid 81-cell grid (0 = empty).
 * @returns {number[]} Sorted, unique cell indices in conflict.
 */
export function findConflicts(grid) {
  const conflicts = new Set();
  for (const unit of units()) {
    const seen = new Map();
    for (const index of unit) {
      const digit = grid[index];
      if (digit === 0) continue;
      const first = seen.get(digit);
      if (first === undefined) {
        seen.set(digit, index);
      } else {
        conflicts.add(first);
        conflicts.add(index);
      }
    }
  }
  return [...conflicts].sort((a, b) => a - b);
}

/**
 * True when every cell holds a digit 1-9 and no rule is broken.
 * @param {ArrayLike<number>} grid 81-cell grid.
 * @returns {boolean}
 */
export function isComplete(grid) {
  if (!grid || grid.length !== CELL_COUNT) return false;
  for (let i = 0; i < CELL_COUNT; i++) {
    const digit = grid[i];
    if (!Number.isInteger(digit) || digit < 1 || digit > 9) return false;
  }
  return findConflicts(grid).length === 0;
}

/**
 * Filled cells whose digit differs from the solution.
 * @param {ArrayLike<number>} grid Current 81-cell grid.
 * @param {ArrayLike<number>} solution Solved 81-cell grid.
 * @returns {number[]} Sorted cell indices of wrong entries.
 */
export function findMistakes(grid, solution) {
  const wrong = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (grid[i] !== 0 && grid[i] !== solution[i]) wrong.push(i);
  }
  return wrong;
}

/**
 * True when the grid matches the solution in every cell.
 * @param {ArrayLike<number>} grid Current 81-cell grid.
 * @param {ArrayLike<number>} solution Solved 81-cell grid.
 * @returns {boolean}
 */
export function isSolved(grid, solution) {
  for (let i = 0; i < CELL_COUNT; i++) {
    if (grid[i] !== solution[i]) return false;
  }
  return true;
}
