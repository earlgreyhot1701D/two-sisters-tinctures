'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { computeShelfGap } = require('../public/shelf-gaps');

test('empty shelf returns no gap hint', () => {
  assert.strictEqual(computeShelfGap([], () => false), null);
  assert.strictEqual(computeShelfGap(null, () => false), null);
});

test('shelf with only moisturizer shows sunscreen gap first (priority)', () => {
  const prods = [{ type: 'Moisturizer', name: 'Cream' }];
  const gap = computeShelfGap(prods, () => false);
  assert.notStrictEqual(gap, null);
  assert.strictEqual(gap.type, 'Sunscreen');
  assert.strictEqual(gap.text, 'No sunscreen in your morning routine yet.');
});

test('dismissed sunscreen falls back to cleanser gap', () => {
  const prods = [{ type: 'Moisturizer', name: 'Cream' }];
  const gap = computeShelfGap(prods, type => type === 'Sunscreen');
  assert.notStrictEqual(gap, null);
  assert.strictEqual(gap.type, 'Cleanser');
  assert.strictEqual(gap.text, 'No cleanser on your shelf yet to wash the day off.');
});

test('dismissed sunscreen and cleanser falls back to moisturizer gap', () => {
  const prods = [{ type: 'Serum', name: 'Niacinamide' }];
  const gap = computeShelfGap(prods, type => type === 'Sunscreen' || type === 'Cleanser');
  assert.notStrictEqual(gap, null);
  assert.strictEqual(gap.type, 'Moisturizer');
  assert.strictEqual(gap.text, 'No moisturizer on your shelf yet to seal in hydration.');
});

test('complete shelf (sunscreen, cleanser, moisturizer) returns no gap', () => {
  const prods = [
    { type: 'Sunscreen', name: 'SPF' },
    { type: 'Cleanser', name: 'Wash' },
    { type: 'Moisturizer', name: 'Lotion' }
  ];
  assert.strictEqual(computeShelfGap(prods, () => false), null);
});
