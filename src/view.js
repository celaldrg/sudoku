/**
 * DOM building and rendering for the board, the number pad and translated
 * static text. Only the textContent and attributes of elements are set,
 * never HTML strings.
 */
import { CELL_COUNT, colOf, indexOf, maskToDigits, rowOf } from './board.js';
import { getRemainingCounts } from './game.js';
import { cellFlags } from './highlight.js';

const WAVE_DELAY_MS = 28;

/**
 * @typedef {object} CellRefs
 * @property {HTMLButtonElement} cell The cell button.
 * @property {HTMLElement} value Element showing the digit.
 * @property {HTMLElement[]} notes Nine pencil-mark slots, for digits 1-9.
 */

/**
 * @typedef {object} PadRefs
 * @property {HTMLButtonElement} button The digit button.
 * @property {HTMLElement} count Element showing how many are left.
 */

/**
 * Creates the 81 cell buttons, grouped in nine 3x3 boxes.
 * @param {HTMLElement} boardEl Empty board container.
 * @returns {CellRefs[]} References indexed by cell index (row-major).
 */
export function buildBoard(boardEl) {
  const cells = new Array(CELL_COUNT);
  for (let box = 0; box < 9; box++) {
    const boxEl = document.createElement('div');
    boxEl.className = 'box';
    for (let k = 0; k < 9; k++) {
      const row = Math.floor(box / 3) * 3 + Math.floor(k / 3);
      const col = (box % 3) * 3 + (k % 3);
      const refs = createCell(indexOf(row, col));
      cells[indexOf(row, col)] = refs;
      boxEl.append(refs.cell);
    }
    boardEl.append(boxEl);
  }
  return cells;
}

/**
 * Creates the digit buttons 1-9.
 * @param {HTMLElement} padEl Empty pad container.
 * @returns {PadRefs[]} References for digits 1-9 (array index 0 = digit 1).
 */
export function buildPad(padEl) {
  const refs = [];
  for (let digit = 1; digit <= 9; digit++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pad-btn';
    button.dataset.digit = String(digit);
    const label = document.createElement('span');
    label.className = 'pad-digit';
    label.textContent = String(digit);
    const count = document.createElement('span');
    count.className = 'pad-count';
    button.append(label, count);
    padEl.append(button);
    refs.push({ button, count });
  }
  return refs;
}

/**
 * Draws values, notes and highlights for every cell.
 * @param {CellRefs[]} cells From buildBoard.
 * @param {import('./game.js').GameState} state
 * @param {(key: string, params?: object) => string} t Translate function.
 */
export function renderBoard(cells, state, t) {
  const flags = cellFlags(state);
  const selectedDigit = state.selected >= 0 ? state.values[state.selected] : 0;
  cells.forEach((refs, i) => {
    const value = state.values[i];
    const notes = value === 0 ? state.notes[i] : 0;
    refs.cell.className = cellClass(flags[i]);
    refs.value.textContent = value === 0 ? '' : String(value);
    refs.notes.forEach((slot, k) => {
      const digit = k + 1;
      const on = (notes & (1 << digit)) !== 0;
      slot.textContent = on ? String(digit) : '';
      slot.classList.toggle('match', on && digit === selectedDigit);
    });
    refs.cell.setAttribute('aria-label', cellLabel(i, value, notes, flags[i].given, t));
    if (flags[i].selected) refs.cell.setAttribute('aria-current', 'true');
    else refs.cell.removeAttribute('aria-current');
  });
}

/**
 * Updates the remaining counts and the notes-mode look of the number pad.
 * @param {PadRefs[]} pad From buildPad.
 * @param {HTMLElement} padEl Pad container.
 * @param {import('./game.js').GameState} state
 * @param {(key: string, params?: object) => string} t Translate function.
 */
export function renderPad(pad, padEl, state, t) {
  const remaining = getRemainingCounts(state);
  padEl.classList.toggle('notes-mode', state.notesMode);
  pad.forEach(({ button, count }, k) => {
    const digit = k + 1;
    count.textContent = String(remaining[digit]);
    button.classList.toggle('done', remaining[digit] === 0);
    button.setAttribute('aria-label', t('padDigit', { digit, n: remaining[digit] }));
  });
}

/**
 * Fills every element marked with data-i18n (text) or data-i18n-label
 * (aria-label and tooltip) with the current translation.
 * @param {ParentNode} root Where to look.
 * @param {(key: string) => string} t Translate function.
 */
export function applyTranslations(root, t) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-label]')) {
    const text = t(el.dataset.i18nLabel);
    el.setAttribute('aria-label', text);
    el.title = text;
  }
}

function createCell(index) {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'cell';
  cell.tabIndex = -1;
  cell.dataset.index = String(index);
  cell.style.setProperty('--wave', `${(rowOf(index) + colOf(index)) * WAVE_DELAY_MS}ms`);
  const value = document.createElement('span');
  value.className = 'value';
  const notesEl = document.createElement('span');
  notesEl.className = 'notes';
  notesEl.setAttribute('aria-hidden', 'true');
  const notes = [];
  for (let digit = 1; digit <= 9; digit++) {
    const slot = document.createElement('span');
    notesEl.append(slot);
    notes.push(slot);
  }
  cell.append(value, notesEl);
  return { cell, value, notes };
}

function cellClass(flags) {
  const names = ['cell'];
  for (const name of ['selected', 'peer', 'same', 'given', 'conflict', 'mistake', 'hinted']) {
    if (flags[name]) names.push(name);
  }
  return names.join(' ');
}

function cellLabel(index, value, notes, given, t) {
  let content = t('cellEmpty');
  if (given) content = t('cellGiven', { digit: value });
  else if (value !== 0) content = String(value);
  else if (notes !== 0) content = t('cellNotes', { digits: maskToDigits(notes).join(' ') });
  return t('cellLabel', { row: rowOf(index) + 1, col: colOf(index) + 1, content });
}
