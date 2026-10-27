import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, countGivens, generatePuzzle } from '../src/generator.js';
import { countSolutions, solve } from '../src/solver.js';
import { isComplete } from '../src/validate.js';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

for (const difficulty of Object.keys(DIFFICULTIES)) {
  test(`every generated ${difficulty} puzzle has exactly one solution`, () => {
    const { min, max } = DIFFICULTIES[difficulty];
    for (const seed of SEEDS) {
      const { puzzle, solution, givens } = generatePuzzle({ difficulty, seed });
      const label = `${difficulty} seed ${seed}`;
      assert.equal(countSolutions(puzzle, 2), 1, `${label}: not unique`);
      assert.ok(isComplete(solution), `${label}: solution is not a valid full grid`);
      assert.ok(
        puzzle.every((v, i) => v === 0 || v === solution[i]),
        `${label}: givens do not match the solution`,
      );
      assert.deepEqual(solve(puzzle), solution, `${label}: solver disagrees with the solution`);
      assert.equal(givens, countGivens(puzzle));
      assert.ok(givens >= min && givens <= max, `${label}: ${givens} givens outside ${min}-${max}`);
    }
  });
}

test('difficulties are ordered by number of givens', () => {
  assert.ok(DIFFICULTIES.easy.min > DIFFICULTIES.medium.max);
  assert.ok(DIFFICULTIES.medium.min > DIFFICULTIES.hard.max);
});

test('the same seed and difficulty give the same puzzle', () => {
  assert.deepEqual(generatePuzzle({ difficulty: 'hard', seed: 77 }), generatePuzzle({ difficulty: 'hard', seed: 77 }));
});

test('different seeds give different puzzles', () => {
  const a = generatePuzzle({ difficulty: 'medium', seed: 100 });
  const b = generatePuzzle({ difficulty: 'medium', seed: 101 });
  assert.notDeepEqual(a.puzzle, b.puzzle);
});

test('defaults to a unique medium puzzle with a random seed', () => {
  const result = generatePuzzle();
  assert.equal(result.difficulty, 'medium');
  assert.ok(Number.isInteger(result.seed));
  assert.equal(countSolutions(result.puzzle), 1);
});

test('rejects unknown difficulties', () => {
  assert.throws(() => generatePuzzle({ difficulty: 'expert', seed: 1 }), RangeError);
  assert.throws(() => generatePuzzle({ difficulty: 'toString', seed: 1 }), RangeError);
});

test('countGivens counts filled cells', () => {
  const grid = new Array(81).fill(0);
  grid[3] = 4;
  grid[80] = 9;
  assert.equal(countGivens(grid), 2);
});
