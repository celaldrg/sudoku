/**
 * Game state and actions for the UI. Every action is a pure function that
 * takes a GameState and returns a new one (or the same object when nothing
 * changes), so the UI can do `state = action(state, ...)` and re-render.
 * The state is plain JSON data, ready to be saved and restored.
 */
import { ALL_DIGITS_MASK, CELL_COUNT, candidateMask, colOf, indexOf, peersOf, popcount, rowOf } from './board.js';
import { DIFFICULTIES, generatePuzzle } from './generator.js';
import { findHint } from './hint.js';
import { createRng, randomSeed, shuffle } from './rng.js';
import { findConflicts, findMistakes, isComplete, isSolved } from './validate.js';

/** Hints available in every new game. */
export const HINTS_PER_GAME = 3;

/** Format version of saved games; other versions are rejected on restore. */
export const SAVE_VERSION = 1;

/** Seed of the fixed puzzle used by the ?demo state. */
export const DEMO_SEED = 20261027;

const HISTORY_LIMIT = 200;
const DEMO_FILL_RATIO = 0.45;
const DEMO_NOTE_CELLS = 7;
const DEMO_ELAPSED_MS = 277000;

/**
 * @typedef {object} Change
 * @property {number} index Cell index.
 * @property {number} value Digit before the change (0 = empty).
 * @property {number} notes Notes bitmask before the change.
 */

/**
 * @typedef {object} GameState
 * @property {number} version Save format version.
 * @property {'easy' | 'medium' | 'hard'} difficulty
 * @property {number} seed Seed the puzzle was generated from.
 * @property {number[]} puzzle Givens (0 = empty); these cells are locked.
 * @property {number[]} solution The unique solution.
 * @property {number[]} values Current digits, givens included (0 = empty).
 * @property {number[]} notes Pencil marks per cell as digit bitmasks (bit d = digit d).
 * @property {number} selected Selected cell index, or -1.
 * @property {boolean} notesMode Whether digit input toggles notes instead of values.
 * @property {number} hintsLeft Remaining hints.
 * @property {number} elapsedMs Play time in milliseconds.
 * @property {'playing' | 'won'} status
 * @property {number[]} mistakes Wrong cells revealed by the last check.
 * @property {number} lastHint Cell filled by the most recent hint, or -1.
 * @property {Change[][]} history Undo stack; each entry restores one action.
 */

/**
 * Starts a new game with a freshly generated puzzle.
 * @param {{ difficulty?: 'easy' | 'medium' | 'hard', seed?: number }} [options]
 * @returns {GameState}
 */
export function createGame({ difficulty = 'medium', seed = randomSeed() } = {}) {
  const { puzzle, solution } = generatePuzzle({ difficulty, seed });
  return freshState(difficulty, seed, puzzle, solution);
}

/**
 * Restarts the same puzzle: clears entries, notes, hints used, history and time.
 * @param {GameState} state
 * @returns {GameState}
 */
export function restartGame(state) {
  return freshState(state.difficulty, state.seed, state.puzzle, state.solution);
}

/**
 * Selects a cell (or clears the selection with -1).
 * @param {GameState} state
 * @param {number} index Cell index 0-80, or -1.
 * @returns {GameState}
 */
export function selectCell(state, index) {
  if (!Number.isInteger(index) || index < -1 || index >= CELL_COUNT) return state;
  if (index === state.selected) return state;
  return { ...state, selected: index };
}

/**
 * Moves the selection by whole rows/columns, wrapping around the edges.
 * With nothing selected, the top-left cell is selected.
 * @param {GameState} state
 * @param {number} dRow Row offset (e.g. -1 for up).
 * @param {number} dCol Column offset (e.g. 1 for right).
 * @returns {GameState}
 */
export function moveSelection(state, dRow, dCol) {
  if (state.selected < 0) return selectCell(state, 0);
  const row = (((rowOf(state.selected) + dRow) % 9) + 9) % 9;
  const col = (((colOf(state.selected) + dCol) % 9) + 9) % 9;
  return selectCell(state, indexOf(row, col));
}

/**
 * Switches between entering values and entering notes.
 * @param {GameState} state
 * @returns {GameState}
 */
export function toggleNotesMode(state) {
  return { ...state, notesMode: !state.notesMode };
}

/**
 * Enters a digit in the selected cell, as a value or a note depending on notesMode.
 * @param {GameState} state
 * @param {number} digit 1-9.
 * @returns {GameState}
 */
export function inputDigit(state, digit) {
  if (state.selected < 0) return state;
  return state.notesMode
    ? toggleNote(state, state.selected, digit)
    : setValue(state, state.selected, digit);
}

/**
 * Places a digit in an editable cell and removes that digit from the notes of
 * its peers. Givens, unknown digits and finished games are ignored.
 * @param {GameState} state
 * @param {number} index Cell index 0-80.
 * @param {number} digit 1-9.
 * @returns {GameState}
 */
export function setValue(state, index, digit) {
  if (!canEdit(state, index) || !isDigit(digit) || state.values[index] === digit) return state;
  return placeDigit(state, index, digit);
}

/**
 * Toggles a pencil mark in an empty editable cell.
 * @param {GameState} state
 * @param {number} index Cell index 0-80.
 * @param {number} digit 1-9.
 * @returns {GameState}
 */
export function toggleNote(state, index, digit) {
  if (!canEdit(state, index) || !isDigit(digit) || state.values[index] !== 0) return state;
  return commit(state, [{ index, value: 0, notes: state.notes[index] ^ (1 << digit) }]);
}

/**
 * Clears the value and notes of an editable cell (the selected one by default).
 * @param {GameState} state
 * @param {number} [index] Cell index; defaults to the selection.
 * @returns {GameState}
 */
export function erase(state, index = state.selected) {
  if (!canEdit(state, index)) return state;
  return commit(state, [{ index, value: 0, notes: 0 }]);
}

/**
 * Reverts the most recent edit (values and notes, including cleared peer notes).
 * @param {GameState} state
 * @returns {GameState}
 */
export function undo(state) {
  if (state.status !== 'playing' || state.history.length === 0) return state;
  const entry = state.history[state.history.length - 1];
  const values = state.values.slice();
  const notes = state.notes.slice();
  for (const change of entry) {
    values[change.index] = change.value;
    notes[change.index] = change.notes;
  }
  const touched = new Set(entry.map((change) => change.index));
  return {
    ...state,
    values,
    notes,
    history: state.history.slice(0, -1),
    mistakes: state.mistakes.filter((i) => !touched.has(i)),
    lastHint: -1,
  };
}

/**
 * True when there is something to undo.
 * @param {GameState} state
 * @returns {boolean}
 */
export function canUndo(state) {
  return state.status === 'playing' && state.history.length > 0;
}

/**
 * Spends one hint: fills a cell with its correct digit and selects it.
 * @param {GameState} state
 * @returns {GameState} Unchanged when no hints are left or the game is over.
 */
export function useHint(state) {
  if (state.status !== 'playing' || state.hintsLeft <= 0) return state;
  const hint = findHint(state.values, state.solution);
  if (!hint) return state;
  const next = placeDigit(state, hint.index, hint.value);
  return { ...next, hintsLeft: state.hintsLeft - 1, selected: hint.index, lastHint: hint.index };
}

/**
 * Marks every wrong entry so the UI can show it; the marks clear as cells are edited.
 * @param {GameState} state
 * @returns {GameState}
 */
export function checkBoard(state) {
  return { ...state, mistakes: findMistakes(state.values, state.solution) };
}

/**
 * Advances the timer while the game is being played.
 * @param {GameState} state
 * @param {number} dtMs Elapsed milliseconds since the last tick.
 * @returns {GameState}
 */
export function tick(state, dtMs) {
  if (state.status !== 'playing' || !Number.isFinite(dtMs) || dtMs <= 0) return state;
  return { ...state, elapsedMs: state.elapsedMs + dtMs };
}

/**
 * Cells breaking a Sudoku rule in the current entries.
 * @param {GameState} state
 * @returns {number[]} Sorted cell indices.
 */
export function getConflicts(state) {
  return findConflicts(state.values);
}

/**
 * How many of each digit are still missing from the board (never below 0).
 * @param {GameState} state
 * @returns {number[]} Array of length 10; index d holds the count for digit d (index 0 unused).
 */
export function getRemainingCounts(state) {
  const remaining = new Array(10).fill(9);
  remaining[0] = 0;
  for (const value of state.values) {
    if (value !== 0) remaining[value] = Math.max(0, remaining[value] - 1);
  }
  return remaining;
}

/**
 * Formats milliseconds as m:ss, or h:mm:ss from one hour on.
 * @param {number} ms Duration in milliseconds.
 * @returns {string}
 */
export function formatTime(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/**
 * Converts a state into plain data for saving (status and lastHint are derived on restore).
 * @param {GameState} state
 * @returns {object} JSON-safe snapshot.
 */
export function serializeGame(state) {
  return {
    version: SAVE_VERSION,
    difficulty: state.difficulty,
    seed: state.seed,
    puzzle: state.puzzle.slice(),
    solution: state.solution.slice(),
    values: state.values.slice(),
    notes: state.notes.slice(),
    selected: state.selected,
    notesMode: state.notesMode,
    hintsLeft: state.hintsLeft,
    elapsedMs: state.elapsedMs,
    mistakes: state.mistakes.slice(),
    history: copyHistory(state.history),
  };
}

/**
 * Rebuilds a state from saved data, validating everything.
 * @param {unknown} data Output of serializeGame (e.g. parsed from storage).
 * @returns {GameState | null} null when the data is missing, outdated or corrupt.
 */
export function restoreGame(data) {
  if (!data || typeof data !== 'object' || data.version !== SAVE_VERSION) return null;
  if (!Object.hasOwn(DIFFICULTIES, data.difficulty) || !Number.isInteger(data.seed)) return null;
  const { puzzle, solution, values, notes } = data;
  if (!isGridOf(puzzle, isCellValue) || !isGridOf(values, isCellValue)) return null;
  if (!isGridOf(notes, isNotesMask) || !isGridOf(solution, isCellValue) || !isComplete(solution)) {
    return null;
  }
  for (let i = 0; i < CELL_COUNT; i++) {
    if (puzzle[i] !== 0 && (puzzle[i] !== solution[i] || values[i] !== puzzle[i])) return null;
  }
  const state = freshState(data.difficulty, data.seed, puzzle, solution);
  state.values = values.slice();
  state.notes = notes.map((mask, i) => (values[i] === 0 ? mask : 0));
  state.selected = isIndex(data.selected) ? data.selected : -1;
  state.notesMode = data.notesMode === true;
  state.hintsLeft = clampInt(data.hintsLeft, 0, HINTS_PER_GAME);
  state.elapsedMs = Number.isFinite(data.elapsedMs) && data.elapsedMs > 0 ? data.elapsedMs : 0;
  state.status = isSolved(state.values, solution) ? 'won' : 'playing';
  state.history = isValidHistory(data.history, puzzle) ? copyHistory(data.history) : [];
  state.mistakes = Array.isArray(data.mistakes)
    ? findMistakes(state.values, solution).filter((i) => data.mistakes.includes(i))
    : [];
  return state;
}

/**
 * Deterministic mid-game state for the ?demo screenshot: a medium puzzle about
 * half filled in correctly, a few cells with pencil marks and a selected cell.
 * @returns {GameState}
 */
export function createDemoGame() {
  const base = createGame({ difficulty: 'medium', seed: DEMO_SEED });
  const rng = createRng(DEMO_SEED + 1);
  const open = shuffle(cellsWhere(base.puzzle, (v) => v === 0), rng);
  const fillCount = Math.floor(open.length * DEMO_FILL_RATIO);
  const filled = open.slice(0, fillCount);
  const values = base.puzzle.slice();
  for (const i of filled) values[i] = base.solution[i];
  const notes = new Array(CELL_COUNT).fill(0);
  let noted = 0;
  for (const i of open.slice(fillCount)) {
    if (noted >= DEMO_NOTE_CELLS) break;
    const mask = candidateMask(values, i);
    const count = popcount(mask);
    if (count >= 2 && count <= 4) {
      notes[i] = mask;
      noted++;
    }
  }
  return {
    ...base,
    values,
    notes,
    selected: closestToCenter(filled),
    hintsLeft: HINTS_PER_GAME - 1,
    elapsedMs: DEMO_ELAPSED_MS,
  };
}

function freshState(difficulty, seed, puzzle, solution) {
  return {
    version: SAVE_VERSION,
    difficulty,
    seed,
    puzzle: puzzle.slice(),
    solution: solution.slice(),
    values: puzzle.slice(),
    notes: new Array(CELL_COUNT).fill(0),
    selected: -1,
    notesMode: false,
    hintsLeft: HINTS_PER_GAME,
    elapsedMs: 0,
    status: 'playing',
    mistakes: [],
    lastHint: -1,
    history: [],
  };
}

function placeDigit(state, index, digit) {
  const bit = 1 << digit;
  const edits = [{ index, value: digit, notes: 0 }];
  for (const peer of peersOf(index)) {
    if (state.notes[peer] & bit) {
      edits.push({ index: peer, value: state.values[peer], notes: state.notes[peer] & ~bit });
    }
  }
  return commit(state, edits);
}

/** Applies edits as one undoable action and re-evaluates the win condition. */
function commit(state, edits) {
  const values = state.values.slice();
  const notes = state.notes.slice();
  const entry = [];
  for (const edit of edits) {
    if (values[edit.index] === edit.value && notes[edit.index] === edit.notes) continue;
    entry.push({ index: edit.index, value: values[edit.index], notes: notes[edit.index] });
    values[edit.index] = edit.value;
    notes[edit.index] = edit.notes;
  }
  if (entry.length === 0) return state;
  const touched = new Set(entry.map((change) => change.index));
  return {
    ...state,
    values,
    notes,
    history: [...state.history, entry].slice(-HISTORY_LIMIT),
    mistakes: state.mistakes.filter((i) => !touched.has(i)),
    status: isSolved(values, state.solution) ? 'won' : 'playing',
    lastHint: -1,
  };
}

function canEdit(state, index) {
  return state.status === 'playing' && isIndex(index) && state.puzzle[index] === 0;
}

function isDigit(value) {
  return Number.isInteger(value) && value >= 1 && value <= 9;
}

function isIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < CELL_COUNT;
}

function isCellValue(value) {
  return Number.isInteger(value) && value >= 0 && value <= 9;
}

function isNotesMask(value) {
  return Number.isInteger(value) && (value & ~ALL_DIGITS_MASK) === 0;
}

function isGridOf(grid, check) {
  return Array.isArray(grid) && grid.length === CELL_COUNT && grid.every(check);
}

function isValidHistory(history, puzzle) {
  return (
    Array.isArray(history) &&
    history.length <= HISTORY_LIMIT &&
    history.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length > 0 &&
        entry.every(
          (change) =>
            change !== null &&
            typeof change === 'object' &&
            isIndex(change.index) &&
            puzzle[change.index] === 0 &&
            isCellValue(change.value) &&
            isNotesMask(change.notes),
        ),
    )
  );
}

function copyHistory(history) {
  return history.map((entry) => entry.map(({ index, value, notes }) => ({ index, value, notes })));
}

function clampInt(value, min, max) {
  return Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : min;
}

function cellsWhere(grid, predicate) {
  const cells = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (predicate(grid[i])) cells.push(i);
  }
  return cells;
}

function closestToCenter(cells) {
  const distance = (i) => Math.abs(rowOf(i) - 4) + Math.abs(colOf(i) - 4);
  return cells.reduce((best, i) => (distance(i) < distance(best) ? i : best), cells[0] ?? -1);
}
