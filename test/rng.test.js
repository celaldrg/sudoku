import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, randomSeed, shuffle } from '../src/rng.js';

test('same seed gives the same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('different seeds give different sequences', () => {
  const a = createRng(1);
  const b = createRng(2);
  const seqA = Array.from({ length: 5 }, a);
  const seqB = Array.from({ length: 5 }, b);
  assert.notDeepEqual(seqA, seqB);
});

test('values are floats in [0, 1)', () => {
  const rng = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test('shuffle is a deterministic permutation', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  const once = shuffle(items.slice(), createRng(5));
  const twice = shuffle(items.slice(), createRng(5));
  assert.deepEqual(once, twice);
  assert.deepEqual(once.slice().sort((x, y) => x - y), items);
  assert.notDeepEqual(once, items);
});

test('randomSeed returns an unsigned 32-bit integer', () => {
  const seed = randomSeed();
  assert.ok(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 32);
});
