/**
 * Puzzle generator: builds a random full grid from a seeded RNG, then removes
 * cells in random order, keeping a removal only while the puzzle still has
 * exactly one solution.
 */
import { CELL_COUNT, emptyGrid } from './board.js';
import { createRng, randomSeed, shuffle } from './rng.js';
import { countSolutions, solve } from './solver.js';

/** Target number of givens (inclusive range) for each difficulty. */
export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ min: 38, max: 40 }),
  medium: Object.freeze({ min: 31, max: 33 }),
  hard: Object.freeze({ min: 26, max: 28 }),
});

const MAX_ATTEMPTS = 8;

/**
 * Builds a random, completely filled valid grid.
 * @param {() => number} rng Random source.
 * @returns {number[]} 81-cell solved grid.
 */
export function generateSolvedGrid(rng) {
  return solve(emptyGrid(), rng);
}

/**
 * Generates a puzzle with exactly one solution.
 * The same seed and difficulty always give the same puzzle.
 * @param {{ difficulty?: 'easy' | 'medium' | 'hard', seed?: number }} [options]
 * @returns {{ difficulty: string, seed: number, puzzle: number[], solution: number[], givens: number }}
 * @throws {RangeError} For an unknown difficulty.
 */
export function generatePuzzle({ difficulty = 'medium', seed = randomSeed() } = {}) {
  if (!Object.hasOwn(DIFFICULTIES, difficulty)) {
    throw new RangeError(`Unknown difficulty: ${difficulty}`);
  }
  const range = DIFFICULTIES[difficulty];
  const rng = createRng(seed);
  const target = range.min + Math.floor(rng() * (range.max - range.min + 1));
  let best = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const solution = generateSolvedGrid(rng);
    const puzzle = removeCells(solution, target, rng);
    const givens = countGivens(puzzle);
    if (!best || givens < best.givens) best = { puzzle, solution, givens };
    if (givens <= target) break;
  }
  return { difficulty, seed, ...best };
}

/**
 * Number of filled cells in a grid.
 * @param {ArrayLike<number>} grid 81-cell grid.
 * @returns {number}
 */
export function countGivens(grid) {
  let count = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (grid[i] !== 0) count++;
  }
  return count;
}

function removeCells(solution, target, rng) {
  const puzzle = solution.slice();
  let givens = CELL_COUNT;
  const order = shuffle(Array.from({ length: CELL_COUNT }, (_, i) => i), rng);
  for (const index of order) {
    if (givens <= target) break;
    const value = puzzle[index];
    puzzle[index] = 0;
    if (countSolutions(puzzle, 2) === 1) givens--;
    else puzzle[index] = value;
  }
  return puzzle;
}
