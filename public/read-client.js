/**
 * read-client.js: the browser side of POST /api/read. One job: call the server, return a plain result.
 * No DOM. No innerHTML. try/catch on every fetch.
 */
(function () {
  'use strict';

  const CLIENT_TIMEOUT_MS = 35000; // server gives up at 30 s
  const DEVICE_KEY = 'tst:device:v1';

  function getDeviceId() {
    try {
      let id = window.localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
        window.localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch (e) {
      return '';
    }
  }

  // Resolves to { ok: true, data } or { ok: false, reason }.
  // reasons: ratelimit, daily, timeout, offline, toolong, generic, unreadable
  async function read(request, signal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    if (signal) signal.addEventListener('abort', () => controller.abort());
    try {
      const res = await fetch('/api/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-Id': getDeviceId() },
        body: JSON.stringify(request),
        signal: controller.signal
      });
      let body = null;
      try { body = await res.json(); } catch (e) { body = null; }
      if (res.ok && body && typeof body === 'object') return { ok: true, data: body };
      const err = body && body.error;
      if (res.status === 429) return { ok: false, reason: err === 'daily_cap' ? 'daily' : 'ratelimit' };
      if (res.status === 413) return { ok: false, reason: 'toolong' };
      if (res.status === 504) return { ok: false, reason: 'timeout' };
      return { ok: false, reason: 'generic' };
    } catch (e) {
      if (signal && signal.aborted) return { ok: false, reason: 'cancelled' };
      if (e && e.name === 'AbortError') return { ok: false, reason: 'timeout' };
      return { ok: false, reason: navigator.onLine === false ? 'offline' : 'generic' };
    } finally {
      clearTimeout(timer);
    }
  }

  window.ReadClient = {
    read
  };
})();
