import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexOf, peersOf } from '../src/board.js';
import { createDemoGame, createGame, selectCell, setValue } from '../src/game.js';
import { cellFlags } from '../src/highlight.js';
import { DEFAULT_LANG, LANGUAGES, STRINGS, normalizeLang, otherLang, translate } from '../src/i18n.js';
import { keyToCommand } from '../src/keys.js';
import { readJSON, writeJSON } from '../src/storage.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

const throwingStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

test('storage round-trips JSON values', () => {
  const store = memoryStorage();
  assert.equal(writeJSON('k', { a: [1, 2] }, store), true);
  assert.deepEqual(readJSON('k', null, store), { a: [1, 2] });
  assert.equal(readJSON('missing', 'fallback', store), 'fallback');
});

test('storage never throws when storage is broken or missing', () => {
  assert.equal(writeJSON('k', 1, throwingStorage), false);
  assert.equal(readJSON('k', 'fallback', throwingStorage), 'fallback');
  assert.equal(writeJSON('k', 1, null), false);
  assert.equal(readJSON('k', 'fallback', null), 'fallback');
  const store = memoryStorage();
  store.setItem('bad', '{not json');
  assert.equal(readJSON('bad', 'fallback', store), 'fallback');
});

test('every language has exactly the same message ids', () => {
  const english = Object.keys(STRINGS.en).sort();
  for (const lang of LANGUAGES) {
    assert.deepEqual(Object.keys(STRINGS[lang]).sort(), english, lang);
    for (const key of english) assert.ok(STRINGS[lang][key].length > 0, `${lang}.${key}`);
  }
});

test('placeholders match between languages', () => {
  const names = (text) => (text.match(/\{\w+\}/g) ?? []).sort();
  for (const key of Object.keys(STRINGS.en)) {
    assert.deepEqual(names(STRINGS.tr[key]), names(STRINGS.en[key]), key);
  }
});

test('translate fills placeholders and falls back sensibly', () => {
  assert.equal(translate('en', 'padDigit', { digit: 4, n: 2 }), '4, 2 left');
  assert.equal(translate('tr', 'padDigit', { digit: 4, n: 2 }), '4, 2 kaldı');
  assert.equal(translate('xx', 'newGame'), STRINGS[DEFAULT_LANG].newGame);
  assert.equal(translate('en', 'no-such-key'), 'no-such-key');
  assert.equal(translate('en', 'padDigit', { digit: 4 }), '4, {n} left');
});

test('language codes are normalised and toggled', () => {
  assert.equal(normalizeLang('TR'), 'tr');
  assert.equal(normalizeLang(' en '), 'en');
  assert.equal(normalizeLang('de'), null);
  assert.equal(normalizeLang(null), null);
  assert.equal(otherLang('en'), 'tr');
  assert.equal(otherLang('tr'), 'en');
});

test('keys map to game commands', () => {
  assert.deepEqual(keyToCommand('ArrowUp'), { type: 'move', dRow: -1, dCol: 0 });
  assert.deepEqual(keyToCommand('ArrowRight'), { type: 'move', dRow: 0, dCol: 1 });
  assert.deepEqual(keyToCommand('7'), { type: 'digit', digit: 7 });
  for (const key of ['Backspace', 'Delete', '0']) assert.deepEqual(keyToCommand(key), { type: 'erase' });
  assert.deepEqual(keyToCommand('n'), { type: 'notes' });
  assert.deepEqual(keyToCommand('N'), { type: 'notes' });
  assert.deepEqual(keyToCommand('z', { ctrlKey: true }), { type: 'undo' });
  assert.deepEqual(keyToCommand('z', { metaKey: true }), { type: 'undo' });
});

test('unrelated keys and browser shortcuts are ignored', () => {
  assert.equal(keyToCommand('a'), null);
  assert.equal(keyToCommand('Enter'), null);
  assert.equal(keyToCommand('r', { ctrlKey: true }), null);
  assert.equal(keyToCommand('5', { altKey: true }), null);
  assert.equal(keyToCommand('z'), null);
});

test('highlights cover the selection, its peers and matching digits', () => {
  const game = createGame({ difficulty: 'easy', seed: 5 });
  const given = game.puzzle.findIndex((v) => v !== 0);
  const flags = cellFlags(selectCell(game, given));
  assert.equal(flags[given].selected, true);
  for (const peer of peersOf(given)) assert.equal(flags[peer].peer, true);
  const digit = game.values[given];
  game.values.forEach((value, i) => {
    assert.equal(flags[i].same, i !== given && value === digit, `cell ${i}`);
    assert.equal(flags[i].given, game.puzzle[i] !== 0);
  });
  assert.equal(flags.filter((f) => f.peer).length, 20);
});

test('highlights flag conflicting cells', () => {
  const game = createGame({ difficulty: 'easy', seed: 5 });
  const row = 0;
  const givenCol = [...Array(9).keys()].find((c) => game.puzzle[indexOf(row, c)] !== 0);
  const emptyCol = [...Array(9).keys()].find((c) => game.puzzle[indexOf(row, c)] === 0);
  const clash = setValue(game, indexOf(row, emptyCol), game.puzzle[indexOf(row, givenCol)]);
  const flags = cellFlags(clash);
  assert.equal(flags[indexOf(row, emptyCol)].conflict, true);
  assert.equal(flags[indexOf(row, givenCol)].conflict, true);
  assert.equal(cellFlags(game).some((f) => f.conflict), false);
});

test('no selection means no peer or same-digit highlights', () => {
  const flags = cellFlags(createGame({ difficulty: 'easy', seed: 5 }));
  assert.equal(flags.some((f) => f.selected || f.peer || f.same), false);
});

test('the demo state highlights a selected digit with matches', () => {
  const flags = cellFlags(createDemoGame());
  assert.equal(flags.filter((f) => f.selected).length, 1);
  assert.ok(flags.some((f) => f.same));
});
