'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rules = require('../public/rules.json');
const byoma = require('./fixtures/gold/byoma-serum.json');
const loreal = require('./fixtures/gold/loreal-spf.json');
const {
  normalize,
  splitIngredients,
  computeWhen,
  findConflictPartner,
  findShelfMixAlert
} = require('../public/ingredient-match');

test('splitIngredients handles standard comma-separated lists and preserves 1,2-Hexanediol', () => {
  const input = 'Water, Glycerin, 1,2-Hexanediol, Squalane';
  const result = splitIngredients(input);
  assert.deepStrictEqual(result, ['Water', 'Glycerin', '1,2-Hexanediol', 'Squalane']);
});

test('splitIngredients handles empty or non-string inputs cleanly', () => {
  assert.deepStrictEqual(splitIngredients(''), []);
  assert.deepStrictEqual(splitIngredients(null), []);
  assert.deepStrictEqual(splitIngredients(undefined), []);
});

test('normalize strips parenthetical text, strengths/percentages, normalizes dashes and lowercases', () => {
  assert.strictEqual(normalize('Salicylic Acid 2%'), 'salicylic acid');
  assert.strictEqual(normalize('Retinol 0.3%'), 'retinol');
  assert.strictEqual(normalize('Aqua (Carrier)'), 'aqua');
  assert.strictEqual(normalize('L\u2010Ascorbic Acid 15%'), 'l-ascorbic acid');
});

test('gold fixture BYOMA Hydrating Serum with Tri-Ceramide Complex has computeWhen = [both]', () => {
  const ings = splitIngredients(byoma.text);
  assert.ok(ings.length > 10, 'fixture ingredients parsed');
  // BYOMA has Lactic Acid at position 20 (index 19), past the top 10 limit
  const when = computeWhen({ name: byoma.name, type: 'Serum', ingredients: ings }, 'Serum', rules);
  assert.deepStrictEqual(when, ['both']);
});

test('gold fixture L\'Oreal Age Perfect with SPF 30 has computeWhen = [am]', () => {
  const ings = splitIngredients(loreal.text);
  assert.ok(ings.length > 10, 'fixture ingredients parsed');
  // L'Oreal has Capryloyl Salicylic Acid (not an exact match for salicylic acid) and SPF 30 in name
  const when = computeWhen({ name: loreal.name, type: 'Moisturizer', ingredients: ings }, 'Moisturizer', rules);
  assert.deepStrictEqual(when, ['am']);
});

test('product with Salicylic Acid 2% in top 10 ingredients gets pm override', () => {
  const ings = splitIngredients('Water, Glycerin, Salicylic Acid 2%, Butylene Glycol');
  const when = computeWhen({ name: 'BHA Exfoliant', type: 'Serum', ingredients: ings }, 'Serum', rules);
  assert.deepStrictEqual(when, ['pm']);
});

test('Cleanser with Glycolic Acid in top 10 stays [both] because cleansers wash off', () => {
  const ings = splitIngredients('Water, Glycolic Acid, Glycerin');
  const when = computeWhen({ name: 'Acid Wash', type: 'Cleanser', ingredients: ings }, 'Cleanser', rules);
  assert.deepStrictEqual(when, ['both']);
});

test('findConflictPartner only pairs products that can both be used at night', () => {
  const nightRetinol = {
    id: 'p1',
    name: 'Retinol Serum',
    type: 'Serum',
    when: ['pm'],
    ingredients: ['Water', 'Retinol', 'Glycerin']
  };
  const nightAcid = {
    id: 'p2',
    name: 'Glycolic Toner',
    type: 'Toner',
    when: ['pm'],
    ingredients: ['Water', 'Glycolic Acid', 'Glycerin']
  };
  const amOnlyAcid = {
    id: 'p3',
    name: 'Vitamin C Day Glow with SPF 30',
    type: 'Sunscreen',
    when: ['am'],
    ingredients: ['Water', 'Glycolic Acid', 'Glycerin']
  };

  // Retinol + Night Acid -> partner found
  assert.strictEqual(findConflictPartner(nightRetinol, [nightRetinol, nightAcid], rules), nightAcid);
  assert.strictEqual(findConflictPartner(nightAcid, [nightRetinol, nightAcid], rules), nightRetinol);

  // Retinol + Day-only Acid -> NO conflict partner
  assert.strictEqual(findConflictPartner(nightRetinol, [nightRetinol, amOnlyAcid], rules), null);
  assert.strictEqual(findConflictPartner(amOnlyAcid, [nightRetinol, amOnlyAcid], rules), null);
});

test('findShelfMixAlert finds Retinoid and Acid conflict on active night products', () => {
  const shelf = [
    {
      id: 'p1',
      name: 'Retinol 0.3%',
      type: 'Serum',
      when: ['pm'],
      ingredients: ['Water', 'Retinol 0.3%']
    },
    {
      id: 'p2',
      name: 'Lactic Acid 5%',
      type: 'Treatment',
      when: ['pm'],
      ingredients: ['Water', 'Lactic Acid 5%']
    }
  ];
  const alert = findShelfMixAlert(shelf, rules);
  assert.notStrictEqual(alert, null);
  assert.strictEqual(alert.a, 'Lactic acid');
  assert.strictEqual(alert.b, 'Retinol');
});
