/**
 * Maps keyboard keys to game commands. Pure, so it can be unit tested.
 */

const ARROWS = Object.freeze({
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
});

/**
 * @typedef {{ type: 'move', dRow: number, dCol: number }
 *   | { type: 'digit', digit: number }
 *   | { type: 'erase' }
 *   | { type: 'notes' }
 *   | { type: 'undo' }} Command
 */

/**
 * Translates a key press into a command.
 * Browser shortcuts (Ctrl/Cmd/Alt combinations) are left alone, except Ctrl/Cmd+Z.
 * @param {string} key KeyboardEvent.key.
 * @param {{ ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean }} [modifiers]
 * @returns {Command | null} null when the key has no meaning in the game.
 */
export function keyToCommand(key, { ctrlKey = false, metaKey = false, altKey = false } = {}) {
  if (altKey) return null;
  if (ctrlKey || metaKey) return key === 'z' || key === 'Z' ? { type: 'undo' } : null;
  if (Object.hasOwn(ARROWS, key)) {
    const [dRow, dCol] = ARROWS[key];
    return { type: 'move', dRow, dCol };
  }
  if (/^[1-9]$/.test(key)) return { type: 'digit', digit: Number(key) };
  if (key === 'Backspace' || key === 'Delete' || key === '0') return { type: 'erase' };
  if (key === 'n' || key === 'N') return { type: 'notes' };
  return null;
}
