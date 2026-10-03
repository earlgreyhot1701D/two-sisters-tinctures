'use strict';
const test = require('node:test');
const assert = require('node:assert');

// A tiny in-memory stand-in for the browser's localStorage.
function installFakeStorage() {
  const data = new Map();
  const fake = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); }
  };
  Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true });
  return data;
}
const storage = installFakeStorage();
require('../public/shelf-store.js');
const Store = globalThis.ShelfStore;

const good = {
  id: 'p1', name: 'Test serum', brand: 'Acme', type: 'Serum', when: ['pm'], freq: null,
  ingredients: ['Water', 'Glycerin'], does: 'Does a thing.', opened: '2026-09-01', paoMonths: 12,
  status: 'active', addedVia: 'manual', createdAt: '2026-09-01T00:00:00.000Z'
};
const NOT_A_BACKUP = 'That file isn’t a Two Sisters backup. Nothing changed.';

test('validateBackup accepts a good backup and drops unknown keys', () => {
  const r = Store.validateBackup(JSON.stringify([Object.assign({}, good, { evil: '<script>' })]));
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.items.length, 1);
  assert.strictEqual('evil' in r.items[0], false);
});

test('validateBackup rejects the whole file for a bad date', () => {
  const r = Store.validateBackup([Object.assign({}, good, { opened: '2026-13-45' })]);
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.error, NOT_A_BACKUP);
});

test('validateBackup rejects non-lists, bad JSON, and too many items', () => {
  assert.strictEqual(Store.validateBackup('not json').valid, false);
  assert.strictEqual(Store.validateBackup({ a: 1 }).valid, false);
  const many = Array.from({ length: 101 }, (_, i) => Object.assign({}, good, { id: 'p' + i }));
  assert.strictEqual(Store.validateBackup(many).valid, false);
});

test('validateBackup rejects an over-long name', () => {
  assert.strictEqual(Store.validateBackup([Object.assign({}, good, { name: 'x'.repeat(200) })]).valid, false);
});

test('validateBackup turns an unknown type into Other and dedupes ids', () => {
  const r = Store.validateBackup([Object.assign({}, good, { type: 'Potion' }), Object.assign({}, good)]);
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.items[0].type, 'Other');
  assert.notStrictEqual(r.items[0].id, r.items[1].id);
});

test('getShelf drops corrupt items and survives corrupt storage', () => {
  storage.set('tst:shelf:v1', JSON.stringify([good, { name: 5 }, null, 'junk']));
  assert.strictEqual(Store.getShelf().length, 1);
  storage.set('tst:shelf:v1', '{not json');
  assert.deepStrictEqual(Store.getShelf(), []);
  storage.delete('tst:shelf:v1');
  assert.deepStrictEqual(Store.getShelf(), []);
});

test('add, update, remove and clear round trip', () => {
  storage.delete('tst:shelf:v1');
  assert.strictEqual(Store.addProduct(good), true);
  assert.strictEqual(Store.getShelf().length, 1);
  assert.strictEqual(Store.updateProduct('p1', { status: 'finished' }), true);
  assert.strictEqual(Store.getShelf()[0].status, 'finished');
  assert.strictEqual(Store.removeProduct('p1'), true);
  assert.strictEqual(Store.getShelf().length, 0);
  Store.addProduct(good);
  assert.strictEqual(Store.clearShelf(), true);
  assert.strictEqual(Store.getShelf().length, 0);
});
