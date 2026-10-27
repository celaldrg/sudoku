/**
 * Works out how each cell should be highlighted. Pure: the view turns the
 * flags into CSS classes.
 */
import { CELL_COUNT, boxOf, colOf, rowOf } from './board.js';
import { findConflicts } from './validate.js';

/**
 * @typedef {object} CellFlags
 * @property {boolean} selected The selected cell.
 * @property {boolean} peer Shares a row, column or box with the selected cell.
 * @property {boolean} same Holds the same digit as the selected cell.
 * @property {boolean} given Part of the puzzle (locked).
 * @property {boolean} conflict Breaks a row, column or box rule.
 * @property {boolean} mistake Marked wrong by the last check.
 * @property {boolean} hinted Filled by the most recent hint.
 */

/**
 * Highlight flags for all 81 cells.
 * @param {{ puzzle: number[], values: number[], selected: number, mistakes: number[], lastHint: number }} state
 * @returns {CellFlags[]}
 */
export function cellFlags(state) {
  const { puzzle, values, selected } = state;
  const conflicts = new Set(findConflicts(values));
  const mistakes = new Set(state.mistakes);
  const hasSelection = selected >= 0 && selected < CELL_COUNT;
  const selectedDigit = hasSelection ? values[selected] : 0;
  const flags = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    flags.push({
      selected: i === selected,
      peer: hasSelection && i !== selected && sharesUnit(i, selected),
      same: selectedDigit !== 0 && i !== selected && values[i] === selectedDigit,
      given: puzzle[i] !== 0,
      conflict: conflicts.has(i),
      mistake: mistakes.has(i),
      hinted: i === state.lastHint,
    });
  }
  return flags;
}

function sharesUnit(a, b) {
  return rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b);
}
