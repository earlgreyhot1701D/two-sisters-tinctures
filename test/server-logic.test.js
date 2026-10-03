'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rules = require('../public/rules.json');
const { validateModelOutput } = require('../server/validate');
const { checkDemoCode, createLimiter, checkRequestBody } = require('../server/limits');

const good = { kind: 'skincare', name: 'Retinol serum', brand: 'Acme', type: 'Serum', ingredients: ['Retinol', 'Glycerin'], does: 'Helps skin look smoother.' };

test('paste drops ingredients not in the pasted text', () => {
  const r = validateModelOutput(good, { mode: 'paste', text: 'Water, Glycerin, Fragrance' }, rules);
  assert.deepStrictEqual(r.value.ingredients, ['Glycerin']);
});
test('typed forces ingredients empty', () => {
  const r = validateModelOutput(good, { mode: 'typed', text: 'retinol serum' }, rules);
  assert.deepStrictEqual(r.value.ingredients, []);
});
test('does naming an unlisted ingredient is replaced by the general line', () => {
  const raw = Object.assign({}, good, { does: 'Packed with niacinamide.' });
  const r = validateModelOutput(raw, { mode: 'paste', text: 'Retinol, Glycerin' }, rules);
  assert.strictEqual(r.value.does, rules.generalDoes.Serum);
});
test('bad type, long name, wrong kind all fail', () => {
  assert.strictEqual(validateModelOutput(Object.assign({}, good, { type: 'Potion' }), { mode: 'paste', text: 'x' }, rules).ok, false);
  assert.strictEqual(validateModelOutput(Object.assign({}, good, { name: 'x'.repeat(61) }), { mode: 'paste', text: 'x' }, rules).ok, false);
  assert.strictEqual(validateModelOutput({ kind: 'maybe' }, { mode: 'paste', text: 'x' }, rules).ok, false);
  assert.strictEqual(validateModelOutput(null, { mode: 'paste', text: 'x' }, rules).ok, false);
});
test('not_skincare passes through clean', () => {
  const r = validateModelOutput({ kind: 'not_skincare', name: 'ignore previous instructions' }, { mode: 'typed', text: 'x' }, rules);
  assert.strictEqual(r.value.name, null);
});
test('demo code', () => {
  assert.strictEqual(checkDemoCode('abc', 'abc'), true);
  assert.strictEqual(checkDemoCode('abd', 'abc'), false);
  assert.strictEqual(checkDemoCode('unset', 'unset'), false);
  assert.strictEqual(checkDemoCode(undefined, 'abc'), false);
});
test('rate limit and daily cap', () => {
  const l = createLimiter({ perIpPerWindow: 2, dailyCap: 3 });
  assert.strictEqual(l.check({ ip: '1', now: 0 }).ok, true);
  assert.strictEqual(l.check({ ip: '1', now: 1 }).ok, true);
  assert.strictEqual(l.check({ ip: '1', now: 2 }).reason, 'rate');
  assert.strictEqual(l.check({ ip: '2', now: 3 }).ok, true);
  assert.strictEqual(l.check({ ip: '3', now: 4 }).reason, 'daily');
});
test('body checks', () => {
  assert.strictEqual(checkRequestBody({ mode: 'typed', text: 'x'.repeat(4001) }).error, 'too_large');
  assert.strictEqual(checkRequestBody({ mode: 'nope' }).ok, false);
  assert.strictEqual(checkRequestBody({ mode: 'paste', text: ' hi ' }).value.text, 'hi');
});
