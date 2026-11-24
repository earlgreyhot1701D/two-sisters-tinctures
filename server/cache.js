'use strict';
// cache.js: in-memory cache for validated /api/read results.
// Bounded by maxEntries (LRU eviction) and 24-hour TTL from initial store. Memory only.
const crypto = require('node:crypto');

const DEFAULTS = {
  maxEntries: 500,
  ttlMs: 24 * 60 * 60 * 1000
};

function cacheKey(mode, text) {
  const normalized = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(`${String(mode || '')}\0${normalized}`, 'utf8').digest('hex');
}

function createCache(options) {
  const cfg = Object.assign({}, DEFAULTS, options || {});
  const store = new Map(); // key -> { value, at }, Map order = least recently used first

  function get(key, now) {
    const t = typeof now === 'number' ? now : Date.now();
    const entry = store.get(key);
    if (!entry) return null;
    if (t - entry.at >= cfg.ttlMs) {
      store.delete(key);
      return null;
    }
    // Refresh recency for LRU eviction while preserving original stored timestamp (entry.at).
    store.delete(key);
    store.set(key, entry);
    return entry.value;
  }

  function set(key, value, now) {
    if (cfg.maxEntries <= 0) return;
    const t = typeof now === 'number' ? now : Date.now();
    if (store.has(key)) store.delete(key);
    while (store.size >= cfg.maxEntries) {
      store.delete(store.keys().next().value);
    }
    store.set(key, { value, at: t });
  }

  function size() {
    return store.size;
  }

  return { get, set, size };
}

module.exports = { DEFAULTS, cacheKey, createCache };
