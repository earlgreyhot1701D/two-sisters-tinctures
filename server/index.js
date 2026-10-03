const http = require('http');
const fs = require('fs');
const path = require('path');
const rules = require('../public/rules.json');
const limits = require('./limits');
const { validateModelOutput } = require('./validate');
const { readProduct } = require('./gemma');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

const limiter = limits.createLimiter();

function sendJson(res, status, obj, extra) {
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }, SECURITY_HEADERS, extra || {}));
  res.end(JSON.stringify(obj));
}

function clientIp(req) {
  // Render puts the real client first in X-Forwarded-For.
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => reject(new Error('bad_request')));
  });
}

// POST /api/read. Order: rate limits and daily caps, body checks, model, validation.
async function handleRead(req, res) {
  try {
    const gate = limiter.check({ ip: clientIp(req), deviceId: req.headers['x-device-id'] });
    if (!gate.ok) {
      return sendJson(res, 429, { error: gate.reason === 'rate' ? 'slow_down' : 'daily_cap' },
        { 'Retry-After': String(gate.retryAfterSec) });
    }
    let body;
    try {
      body = JSON.parse(await readBody(req, limits.MAX_BODY_BYTES));
    } catch (err) {
      return sendJson(res, err.message === 'too_large' ? 413 : 400, { error: err.message === 'too_large' ? 'too_large' : 'bad_request' });
    }
    const checked = limits.checkRequestBody(body);
    if (!checked.ok) return sendJson(res, checked.error === 'too_large' ? 413 : 400, { error: checked.error });
    const request = checked.value;
    if (request.mode === 'photo') return sendJson(res, 501, { error: 'photo_not_ready' }); // Block 5 STUB

    let raw;
    const startedAt = Date.now();
    try {
      raw = await readProduct(request);
      console.log('model ok in', Date.now() - startedAt, 'ms');
    } catch (err) {
      const code = err && err.message;
      console.error('model call failed:', code, 'after', Date.now() - startedAt, 'ms'); // code only, never the body or key
      if (code === 'model_off') return sendJson(res, 503, { error: 'model_off' });
      if (code === 'model_timeout') return sendJson(res, 504, { error: 'model_timeout' });
      return sendJson(res, 502, { error: 'unreadable' });
    }
    const result = validateModelOutput(raw, request, rules);
    if (!result.ok) {
      console.error('model output rejected:', result.why); // reason code only, never the content
      return sendJson(res, 502, { error: 'unreadable' });
    }
    return sendJson(res, 200, result.value);
  } catch (err) {
    console.error('read handler error:', err && err.message);
    return sendJson(res, 500, { error: 'server_error' });
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Health check endpoint: zero side effects, no model call, no storage
  if (pathname === '/healthz' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS
    });
    res.end('OK');
    return;
  }

  if (pathname === '/api/read') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method' }, { Allow: 'POST' });
    handleRead(req, res);
    return;
  }

  // Handle static assets
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Prevent directory traversal outside public
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      ...SECURITY_HEADERS
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
