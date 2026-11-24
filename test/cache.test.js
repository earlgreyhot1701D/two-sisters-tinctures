'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { DEFAULTS, cacheKey, createCache } = require('../server/cache');

test('cacheKey normalizes trim, case, and whitespace and hashes with sha256', () => {
  const k1 = cacheKey('typed', '  CeraVe   Foaming\nCleanser  ');
  const k2 = cacheKey('typed', 'cerave foaming cleanser');
  assert.strictEqual(k1, k2);
  assert.match(k1, /^[0-9a-f]{64}$/);
});

test('cacheKey separates different modes and different text', () => {
  const kTyped = cacheKey('typed', 'Water, Glycerin');
  const kPaste = cacheKey('paste', 'Water, Glycerin');
  const kOther = cacheKey('typed', 'Water, Niacinamide');
  assert.notStrictEqual(kTyped, kPaste);
  assert.notStrictEqual(kTyped, kOther);
});

test('entries expire 24 hours after initial store even if read earlier', () => {
  const cache = createCache({ maxEntries: 10, ttlMs: DEFAULTS.ttlMs });
  const k = cacheKey('typed', 'retinol serum');
  const val = { kind: 'skincare', name: 'Retinol Serum' };

  cache.set(k, val, 1000);
  // Read halfway through TTL: still hits, does NOT extend expiry
  assert.deepStrictEqual(cache.get(k, 1000 + DEFAULTS.ttlMs / 2), val);
  assert.deepStrictEqual(cache.get(k, 1000 + DEFAULTS.ttlMs - 1), val);
  // At 24 hours after original store: expired
  assert.strictEqual(cache.get(k, 1000 + DEFAULTS.ttlMs), null);
  assert.strictEqual(cache.size(), 0);
});

test('LRU eviction keeps recently read entries and drops the oldest unread entry', () => {
  const cache = createCache({ maxEntries: 2, ttlMs: DEFAULTS.ttlMs });
  const k1 = cacheKey('typed', 'product one');
  const k2 = cacheKey('typed', 'product two');
  const k3 = cacheKey('typed', 'product three');

  cache.set(k1, { name: 'One' }, 10);
  cache.set(k2, { name: 'Two' }, 20);
  assert.strictEqual(cache.size(), 2);

  // Read k1 so k2 becomes the oldest unread entry
  assert.deepStrictEqual(cache.get(k1, 30), { name: 'One' });

  // Inserting k3 should evict k2 (oldest unread), keeping k1 and k3
  cache.set(k3, { name: 'Three' }, 40);
  assert.strictEqual(cache.size(), 2);
  assert.deepStrictEqual(cache.get(k1, 50), { name: 'One' });
  assert.strictEqual(cache.get(k2, 50), null);
  assert.deepStrictEqual(cache.get(k3, 50), { name: 'Three' });
});
