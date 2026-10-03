'use strict';
// limits.js: rate limit, daily cap, demo code check, size caps.
// Pure logic. No network, no globals except the counters passed in. Easy to test.

const crypto = require('crypto');

const MAX_TEXT_CHARS = 4000;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_BODY_BYTES = 2.2 * 1024 * 1024; // base64 inflates ~33%, plus JSON wrapper

const DEFAULTS = {
  windowMs: 60 * 1000,
  perIpPerWindow: 6,
  perDevicePerWindow: 4,
  dailyCap: 300,
  dayMs: 24 * 60 * 60 * 1000
};

// Constant-time compare so the code can't be guessed by timing.
function checkDemoCode(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string' || expected === '' || expected === 'unset') {
    return false;
  }
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// Fixed-window counter keyed by string. Memory only; resets on restart, which is fine for a demo.
function createLimiter(options) {
  const cfg = Object.assign({}, DEFAULTS, options || {});
  const windows = new Map(); // key -> { start, count }
  let day = { start: 0, count: 0 };

  function hit(key, max, now) {
    const w = windows.get(key);
    if (!w || now - w.start >= cfg.windowMs) {
      windows.set(key, { start: now, count: 1 });
      return true;
    }
    if (w.count >= max) return false;
    w.count += 1;
    return true;
  }

  function sweep(now) {
    for (const [k, w] of windows) {
      if (now - w.start >= cfg.windowMs) windows.delete(k);
    }
  }

  // Returns { ok: true } or { ok: false, reason: 'rate' | 'daily', retryAfterSec }
  function check({ ip, deviceId, now }) {
    const t = typeof now === 'number' ? now : Date.now();
    if (windows.size > 5000) sweep(t);

    if (t - day.start >= cfg.dayMs) day = { start: t, count: 0 };
    if (day.count >= cfg.dailyCap) {
      const retry = Math.ceil((day.start + cfg.dayMs - t) / 1000);
      return { ok: false, reason: 'daily', retryAfterSec: Math.max(retry, 1) };
    }

    const ipOk = hit('ip:' + String(ip || 'unknown'), cfg.perIpPerWindow, t);
    const devOk = deviceId ? hit('dev:' + String(deviceId).slice(0, 64), cfg.perDevicePerWindow, t) : true;
    if (!ipOk || !devOk) {
      return { ok: false, reason: 'rate', retryAfterSec: Math.ceil(cfg.windowMs / 1000) };
    }
    day.count += 1;
    return { ok: true };
  }

  return { check };
}

// Validates the request body shape and sizes. Returns { ok, error?, value? }.
function checkRequestBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'bad_request' };
  const mode = body.mode;
  if (mode !== 'paste' && mode !== 'typed' && mode !== 'photo') return { ok: false, error: 'bad_request' };

  if (mode === 'photo') {
    if (typeof body.image !== 'string' || body.image.length === 0) return { ok: false, error: 'bad_request' };
    if (!/^[A-Za-z0-9+/]+=*$/.test(body.image)) return { ok: false, error: 'bad_request' };
    const bytes = Math.floor(body.image.length * 3 / 4);
    if (bytes > MAX_IMAGE_BYTES) return { ok: false, error: 'too_large' };
    return { ok: true, value: { mode, image: body.image } };
  }

  if (typeof body.text !== 'string') return { ok: false, error: 'bad_request' };
  const text = body.text.trim();
  if (text.length === 0) return { ok: false, error: 'bad_request' };
  if (text.length > MAX_TEXT_CHARS) return { ok: false, error: 'too_large' };
  return { ok: true, value: { mode, text } };
}

module.exports = {
  MAX_TEXT_CHARS, MAX_IMAGE_BYTES, MAX_BODY_BYTES, DEFAULTS,
  checkDemoCode, createLimiter, checkRequestBody
};
