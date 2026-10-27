/**
 * Shared test helpers: turn the readable puzzle strings used as fixtures into
 * grids and back. Not part of the game itself.
 */

/**
 * Parses an 81-character puzzle string. Digits 1-9 are values; "0" or "."
 * mark empty cells; whitespace is ignored.
 * @param {string} text Puzzle text.
 * @returns {number[]} 81-cell grid.
 * @throws {Error} When the text is not a valid 81-cell puzzle (catches typos in fixtures).
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
