/**
 * Tiny, crash-proof wrapper around localStorage. Every access is guarded,
 * because storage can be missing or throw (private mode, blocked cookies,
 * full quota). Nothing touches storage at import time.
 */

/**
 * The browser's localStorage, or null when it is unavailable.
 * @returns {Storage | null}
 */
function defaultBackend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads a JSON value.
 * @param {string} key Storage key.
 * @param {*} [fallback=null] Returned when the key is missing, unreadable or not valid JSON.
 * @param {Pick<Storage, 'getItem'> | null} [backend] Storage to use (defaults to localStorage).
 * @returns {*}
 */
export function readJSON(key, fallback = null, backend = defaultBackend()) {
  try {
    const raw = backend?.getItem(key);
    return raw === null || raw === undefined ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Writes a value as JSON.
 * @param {string} key Storage key.
 * @param {*} value Any JSON-serialisable value.
 * @param {Pick<Storage, 'setItem'> | null} [backend] Storage to use (defaults to localStorage).
 * @returns {boolean} True when the value was stored.
 */
export function writeJSON(key, value, backend = defaultBackend()) {
  try {
    if (!backend) return false;
    backend.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
