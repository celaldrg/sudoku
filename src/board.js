/**
 * Board geometry and digit-bitmask helpers.
 * A grid is a flat array of 81 numbers in row-major order; 0 means empty.
 * Digit sets are bitmasks where bit d (1 << d) stands for digit d (1-9).
 */

/** Number of cells on the board. */
export const CELL_COUNT = 81;

/** Bitmask containing every digit 1-9. */
export const ALL_DIGITS_MASK = 0x3fe;

const UNIT_LIST = buildUnits();
const PEER_LIST = buildPeers();

/**
 * Row (0-8) of a cell index.
 * @param {number} index Cell index 0-80.
 * @returns {number}
 */
export function rowOf(index) {
  return Math.floor(index / 9);
}

/**
 * Column (0-8) of a cell index.
 * @param {number} index Cell index 0-80.
 * @returns {number}
 */
export function colOf(index) {
  return index % 9;
}

/**
 * 3x3 box (0-8, row-major) of a cell index.
 * @param {number} index Cell index 0-80.
 * @returns {number}
 */
export function boxOf(index) {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
}

/**
 * Cell index for a row and column.
 * @param {number} row 0-8.
 * @param {number} col 0-8.
 * @returns {number}
 */
export function indexOf(row, col) {
  return row * 9 + col;
}

/**
 * All 27 units (9 rows, 9 columns, 9 boxes), each a list of 9 cell indices.
 * @returns {readonly (readonly number[])[]}
 */
export function units() {
  return UNIT_LIST;
}

/**
 * The 20 cells sharing a row, column or box with the given cell.
 * @param {number} index Cell index 0-80.
 * @returns {readonly number[]}
 */
export function peersOf(index) {
  return PEER_LIST[index];
}

/**
 * A new grid with every cell empty.
 * @returns {number[]}
 */
export function emptyGrid() {
  return new Array(CELL_COUNT).fill(0);
}

/**
 * Number of set bits in a digit mask.
 * @param {number} mask Digit bitmask.
 * @returns {number}
 */
export function popcount(mask) {
  let count = 0;
  for (let m = mask; m; m &= m - 1) count++;
  return count;
}

/**
 * Digits contained in a bitmask, ascending.
 * @param {number} mask Digit bitmask.
 * @returns {number[]}
 */
export function maskToDigits(mask) {
  const digits = [];
  for (let d = 1; d <= 9; d++) {
    if (mask & (1 << d)) digits.push(d);
  }
  return digits;
}

/**
 * Digits that could go into a cell without clashing with its peers.
 * The cell's own value is ignored.
 * @param {ArrayLike<number>} grid 81-cell grid.
 * @param {number} index Cell index 0-80.
 * @returns {number} Digit bitmask of allowed values.
 */
export function candidateMask(grid, index) {
  let used = 0;
  for (const peer of PEER_LIST[index]) used |= 1 << grid[peer];
  return ALL_DIGITS_MASK & ~used;
}

/**
 * Parses an 81-character puzzle string. Digits 1-9 are values; "0" or "."
 * mark empty cells; whitespace is ignored.
 * @param {string} text Puzzle text.
 * @returns {number[]} 81-cell grid.
 * @throws {Error} When the text is not a valid 81-cell puzzle.
 */
export function parseGrid(text) {
  const compact = String(text).replace(/\s+/g, '');
  if (!/^[0-9.]{81}$/.test(compact)) {
    throw new Error('A puzzle needs exactly 81 cells of 1-9, 0 or "."');
  }
  return Array.from(compact, (ch) => (ch === '.' ? 0 : Number(ch)));
}

/**
 * Formats a grid as an 81-character string ("." for empty cells).
 * @param {ArrayLike<number>} grid 81-cell grid.
 * @returns {string}
 */
export function formatGrid(grid) {
  return Array.from(grid, (v) => (v === 0 ? '.' : String(v))).join('');
}

function buildUnits() {
  const list = [];
  for (let n = 0; n < 9; n++) {
    const row = [];
    const col = [];
    const box = [];
    for (let k = 0; k < 9; k++) {
      row.push(indexOf(n, k));
      col.push(indexOf(k, n));
      box.push(indexOf(Math.floor(n / 3) * 3 + Math.floor(k / 3), (n % 3) * 3 + (k % 3)));
    }
    list.push(row, col, box);
  }
  return Object.freeze(list.map((unit) => Object.freeze(unit)));
}

function buildPeers() {
  const peers = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const set = new Set();
    for (const unit of UNIT_LIST) {
      if (unit.includes(i)) unit.forEach((cell) => set.add(cell));
    }
    set.delete(i);
    peers.push(Object.freeze([...set].sort((a, b) => a - b)));
  }
  return Object.freeze(peers);
}
