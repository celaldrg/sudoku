import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexOf, peersOf } from '../src/board.js';
import {
  DEMO_SEED,
  HINTS_PER_GAME,
  canUndo,
  checkBoard,
  createDemoGame,
  createGame,
  erase,
  formatTime,
  getRemainingCounts,
  inputDigit,
  moveSelection,
  restartGame,
  restoreGame,
  selectCell,
  serializeGame,
  setValue,
  tick,
  toggleNote,
  toggleNotesMode,
  undo,
  useHint,
} from '../src/game.js';
import { countSolutions } from '../src/solver.js';
import { findConflicts } from '../src/validate.js';

const BASE = createGame({ difficulty: 'easy', seed: 11 });
const firstEmpty = (state) => state.puzzle.indexOf(0);
const firstGiven = (state) => state.puzzle.findIndex((v) => v !== 0);
const wrongDigit = (state, i) => (state.solution[i] % 9) + 1;

function solveAll(state) {
  let s = state;
  s.puzzle.forEach((v, i) => {
    if (v === 0) s = setValue(s, i, s.solution[i]);
  });
  return s;
}

test('createGame starts a fresh, deterministic game', () => {
  assert.deepEqual(createGame({ difficulty: 'easy', seed: 11 }), BASE);
  assert.equal(BASE.status, 'playing');
  assert.equal(BASE.hintsLeft, HINTS_PER_GAME);
  assert.deepEqual(BASE.values, BASE.puzzle);
  assert.equal(BASE.selected, -1);
  assert.equal(countSolutions(BASE.puzzle), 1);
});

test('givens are locked', () => {
  const given = firstGiven(BASE);
  assert.equal(setValue(BASE, given, wrongDigit(BASE, given)), BASE);
  assert.equal(toggleNote(BASE, given, 1), BASE);
  assert.equal(erase(BASE, given), BASE);
});

test('invalid digits and cells are ignored', () => {
  const i = firstEmpty(BASE);
  assert.equal(setValue(BASE, i, 0), BASE);
  assert.equal(setValue(BASE, i, 10), BASE);
  assert.equal(setValue(BASE, 81, 1), BASE);
  assert.equal(selectCell(BASE, 99), BASE);
});

test('placing a digit clears that digit from peer notes, and undo restores everything', () => {
  const i = firstEmpty(BASE);
  const digit = BASE.solution[i];
  const peer = peersOf(i).find((p) => BASE.puzzle[p] === 0);
  let s = toggleNote(BASE, peer, digit);
  s = toggleNote(s, peer, digit === 1 ? 2 : 1);
  const notesBefore = s.notes[peer];
  s = setValue(s, i, digit);
  assert.equal(s.values[i], digit);
  assert.equal(s.notes[peer] & (1 << digit), 0);
  assert.notEqual(s.notes[peer], 0);
  assert.ok(canUndo(s));
  s = undo(s);
  assert.equal(s.values[i], 0);
  assert.equal(s.notes[peer], notesBefore);
});

test('notes toggle on and off only in empty cells', () => {
  const i = firstEmpty(BASE);
  let s = toggleNote(BASE, i, 4);
  assert.equal(s.notes[i], 1 << 4);
  s = toggleNote(s, i, 4);
  assert.equal(s.notes[i], 0);
  s = setValue(s, i, BASE.solution[i]);
  assert.equal(toggleNote(s, i, 3), s);
});

test('inputDigit follows notes mode and needs a selection', () => {
  const i = firstEmpty(BASE);
  assert.equal(inputDigit(BASE, 5), BASE);
  let s = selectCell(BASE, i);
  s = inputDigit(s, 5);
  assert.equal(s.values[i], 5);
  s = erase(s);
  s = toggleNotesMode(s);
  assert.equal(s.notesMode, true);
  s = inputDigit(s, 5);
  assert.equal(s.values[i], 0);
  assert.equal(s.notes[i], 1 << 5);
});

test('erase clears value and notes of the selected cell', () => {
  const i = firstEmpty(BASE);
  let s = selectCell(setValue(BASE, i, wrongDigit(BASE, i)), i);
  s = erase(s);
  assert.equal(s.values[i], 0);
  assert.equal(erase(s), s, 'erasing an empty cell changes nothing');
});

test('arrow movement wraps around the board', () => {
  let s = moveSelection(BASE, 0, 1);
  assert.equal(s.selected, 0, 'first move selects the top-left cell');
  s = moveSelection(s, -1, 0);
  assert.equal(s.selected, indexOf(8, 0));
  s = moveSelection(s, 0, -1);
  assert.equal(s.selected, indexOf(8, 8));
  s = moveSelection(s, 1, 1);
  assert.equal(s.selected, indexOf(0, 0));
});

test('hints fill correct digits, select the cell and run out after three', () => {
  let s = BASE;
  for (let n = 0; n < HINTS_PER_GAME; n++) {
    const next = useHint(s);
    assert.equal(next.hintsLeft, HINTS_PER_GAME - n - 1);
    assert.equal(next.selected, next.lastHint);
    assert.equal(s.values[next.lastHint], 0);
    assert.equal(next.values[next.lastHint], next.solution[next.lastHint]);
    s = next;
  }
  assert.equal(useHint(s), s);
});

test('check marks wrong entries until they are edited', () => {
  const i = firstEmpty(BASE);
  let s = setValue(BASE, i, wrongDigit(BASE, i));
  s = checkBoard(s);
  assert.deepEqual(s.mistakes, [i]);
  s = setValue(s, i, BASE.solution[i]);
  assert.deepEqual(s.mistakes, []);
});

test('conflicts and remaining counts reflect the board', () => {
  const i = firstEmpty(BASE);
  const clash = peersOf(i).map((p) => BASE.puzzle[p]).find((v) => v !== 0);
  const s = setValue(BASE, i, clash);
  assert.ok(findConflicts(s.values).includes(i));
  assert.deepEqual(findConflicts(BASE.values), []);

  const remaining = getRemainingCounts(BASE);
  const empties = BASE.puzzle.filter((v) => v === 0).length;
  assert.equal(remaining.length, 10);
  assert.equal(remaining.reduce((a, b) => a + b, 0), empties);
});

test('filling every cell correctly wins and freezes the game', () => {
  const won = solveAll(BASE);
  assert.equal(won.status, 'won');
  assert.deepEqual(getRemainingCounts(won), new Array(10).fill(0));
  assert.equal(tick(won, 1000), won);
  assert.equal(undo(won), won);
  assert.equal(useHint(won), won);
  assert.equal(canUndo(won), false);
});

test('the timer only advances with positive time while playing', () => {
  let s = tick(BASE, 1500);
  s = tick(s, 500);
  assert.equal(s.elapsedMs, 2000);
  assert.equal(tick(s, -5), s);
  assert.equal(tick(s, Number.NaN), s);
});

test('formatTime', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65_000), '1:05');
  assert.equal(formatTime(3_725_000), '1:02:05');
  assert.equal(formatTime(-10), '0:00');
});

test('restart keeps the puzzle and clears progress', () => {
  const i = firstEmpty(BASE);
  const played = tick(useHint(setValue(BASE, i, wrongDigit(BASE, i))), 9000);
  const restarted = restartGame(played);
  assert.deepEqual(restarted, BASE);
});

test('a saved game survives a JSON round trip', () => {
  const i = firstEmpty(BASE);
  let s = selectCell(BASE, i);
  s = toggleNote(s, i, 2);
  s = useHint(s);
  s = setValue(s, firstEmpty(s), 9);
  s = checkBoard(tick(toggleNotesMode(s), 4321));
  const restored = restoreGame(JSON.parse(JSON.stringify(serializeGame(s))));
  assert.deepEqual(restored, { ...s, lastHint: -1 });
  assert.deepEqual(undo(restored).values, undo(s).values);
});

test('a won game restores as won', () => {
  const restored = restoreGame(serializeGame(solveAll(BASE)));
  assert.equal(restored.status, 'won');
});

test('restoreGame rejects missing, outdated or corrupt data', () => {
  const saved = serializeGame(BASE);
  const given = firstGiven(BASE);
  assert.equal(restoreGame(null), null);
  assert.equal(restoreGame('nope'), null);
  assert.equal(restoreGame({ ...saved, version: 0 }), null);
  assert.equal(restoreGame({ ...saved, difficulty: 'expert' }), null);
  assert.equal(restoreGame({ ...saved, values: saved.values.slice(1) }), null);
  const tampered = saved.values.slice();
  tampered[given] = wrongDigit(BASE, given);
  assert.equal(restoreGame({ ...saved, values: tampered }), null);
  const badSolution = saved.solution.slice();
  [badSolution[0], badSolution[1]] = [badSolution[1], badSolution[0]];
  assert.equal(restoreGame({ ...saved, solution: badSolution }), null);
});

test('restoreGame sanitises optional fields', () => {
  const saved = serializeGame(BASE);
  const s = restoreGame({
    ...saved,
    selected: 500,
    hintsLeft: 99,
    elapsedMs: -3,
    history: [[{ index: firstGiven(BASE), value: 0, notes: 0 }]],
    mistakes: 'x',
  });
  assert.equal(s.selected, -1);
  assert.equal(s.hintsLeft, HINTS_PER_GAME);
  assert.equal(s.elapsedMs, 0);
  assert.deepEqual(s.history, []);
  assert.deepEqual(s.mistakes, []);
});

test('the demo state is a deterministic, good-looking medium mid-game', () => {
  const demo = createDemoGame();
  assert.deepEqual(createDemoGame(), demo);
  assert.equal(demo.difficulty, 'medium');
  assert.equal(demo.seed, DEMO_SEED);
  assert.equal(demo.status, 'playing');
  assert.deepEqual(findConflicts(demo.values), []);
  assert.ok(demo.values.every((v, i) => v === 0 || v === demo.solution[i]), 'entries are correct');
  const filled = demo.values.filter((v) => v !== 0).length;
  assert.ok(filled > 45 && filled < 70, `filled cells: ${filled}`);
  const noted = demo.notes.map((mask, i) => [mask, i]).filter(([mask]) => mask !== 0);
  assert.ok(noted.length >= 3, 'has some notes');
  for (const [mask, i] of noted) {
    assert.equal(demo.values[i], 0);
    assert.ok(mask & (1 << demo.solution[i]), 'notes include the right digit');
  }
  assert.ok(demo.selected >= 0);
  assert.equal(demo.puzzle[demo.selected], 0, 'selected cell is a player entry');
  assert.notEqual(demo.values[demo.selected], 0);
});

test('the demo has a genuine undo history back to the bare puzzle', () => {
  let s = createDemoGame();
  assert.ok(canUndo(s), 'Undo is available in the demo');
  while (canUndo(s)) s = undo(s);
  assert.deepEqual(s.values, s.puzzle);
  assert.deepEqual(s.notes, new Array(81).fill(0));
});
