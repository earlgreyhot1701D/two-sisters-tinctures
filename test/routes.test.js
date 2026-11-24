'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const cp = require('child_process');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(err => (err ? reject(err) : resolve(port)));
    });
  });
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const child = cp.spawn(process.execPath, ['server/index.js'], {
      env: Object.assign({}, process.env, {
        PORT: String(port),
        GEMINI_API_KEY: '' // Explicitly no key
      }),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    const onData = chunk => {
      stdout += chunk.toString();
      if (stdout.includes(`Server listening on http://0.0.0.0:${port}`)) {
        child.stdout.removeListener('data', onData);
        resolve(child);
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      reject(new Error(`Server exited unexpectedly with code ${code} / signal ${signal}: ${stderr}`));
    });
  });
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          // not json
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          text,
          json
        });
      });
    });
    req.on('error', reject);
    if (body !== undefined && body !== null) {
      req.write(body);
    }
    req.end();
  });
}

test('POST /api/read and static file containment routes', async t => {
  const port = await getFreePort();
  const child = await startServer(port);

  t.after(() => {
    child.kill('SIGTERM');
  });

  await t.test('foreign Origin header -> 403', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port,
      path: '/api/read',
      method: 'POST',
      headers: {
        'Host': `127.0.0.1:${port}`,
        'Origin': 'https://evil.com',
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ mode: 'typed', text: 'cleanser' }));

    assert.strictEqual(res.statusCode, 403);
    assert.deepStrictEqual(res.json, { error: 'origin' });
  });

  await t.test('wrong method (GET) -> 405 with an Allow header', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port,
      path: '/api/read',
      method: 'GET'
    });

    assert.strictEqual(res.statusCode, 405);
    assert.strictEqual(res.headers.allow, 'POST');
    assert.deepStrictEqual(res.json, { error: 'method' });
  });

  await t.test('malformed JSON -> 400', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port,
      path: '/api/read',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, '{"mode": "paste", unclosed_json');

    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.json, { error: 'bad_request' });
  });

  await t.test('body over the limit -> 413', async () => {
    const oversizedBody = JSON.stringify({
      mode: 'paste',
      text: 'a'.repeat(4005)
    });
    const res = await request({
      hostname: '127.0.0.1',
      port,
      path: '/api/read',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(oversizedBody)
      }
    }, oversizedBody);

    assert.strictEqual(res.statusCode, 413);
    assert.deepStrictEqual(res.json, { error: 'too_large' });
  });

  await t.test('photo mode -> 501 photo_not_ready', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port,
      path: '/api/read',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      mode: 'photo',
      image: 'AAAA'
    }));

    assert.strictEqual(res.statusCode, 501);
    assert.deepStrictEqual(res.json, { error: 'photo_not_ready' });
  });

  await t.test('rate limit -> 429 with Retry-After', async () => {
    const uniqueIp = '198.51.100.99';
    let hitRateLimit = false;
    let rateRes = null;

    // Default perIpPerWindow is 6 requests per 60 seconds
    for (let i = 0; i < 10; i++) {
      const res = await request({
        hostname: '127.0.0.1',
        port,
        path: '/api/read',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': uniqueIp
        }
      }, JSON.stringify({ mode: 'photo', image: 'AAAA' }));

      if (res.statusCode === 429) {
        hitRateLimit = true;
        rateRes = res;
        break;
      }
    }

    assert.strictEqual(hitRateLimit, true, 'Rate limit should be tripped');
    assert.strictEqual(rateRes.statusCode, 429);
    assert.ok(rateRes.headers['retry-after'], 'Should include Retry-After header');
    assert.deepStrictEqual(rateRes.json, { error: 'slow_down' });
  });

  await t.test('static file containment rejects /../package.json -> 403', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port,
      path: '/../package.json',
      method: 'GET'
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.text, 'Forbidden');
  });

  await t.test('malformed Host header -> 400 with security headers and server keeps running', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port,
      path: '/healthz',
      method: 'GET',
      headers: {
        'Host': 'bad:host:80'
      }
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.text, 'Bad Request');
    assert.ok(res.headers['content-security-policy'], 'Should include CSP header');
    assert.ok(res.headers['strict-transport-security'], 'Should include HSTS header');
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY');

    const health = await request({
      hostname: '127.0.0.1',
      port,
      path: '/healthz',
      method: 'GET'
    });
    assert.strictEqual(health.statusCode, 200);
    assert.strictEqual(health.text, 'OK');
  });
});

test('static file stream errors do not crash the server', async t => {
  const port = await getFreePort();
  const bootstrap = `
    const fs = require('fs');
    const { PassThrough } = require('stream');
    const orig = fs.createReadStream;
    fs.createReadStream = function(filePath, ...args) {
      if (String(filePath).endsWith('index.html')) {
        const s = new PassThrough();
        process.nextTick(() => s.destroy(Object.assign(new Error('open failed'), { code: 'EACCES' })));
        return s;
      }
      if (String(filePath).endsWith('rules.json')) {
        const s = new PassThrough();
        process.nextTick(() => {
          s.emit('open', 1);
          s.write('partial');
          process.nextTick(() => s.destroy(Object.assign(new Error('read failed'), { code: 'EIO' })));
        });
        return s;
      }
      return orig.call(this, filePath, ...args);
    };
    require('./server/index.js');
  `;

  const child = await new Promise((resolve, reject) => {
    const proc = cp.spawn(process.execPath, ['-e', bootstrap], {
      env: Object.assign({}, process.env, {
        PORT: String(port),
        GEMINI_API_KEY: ''
      }),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    const onData = chunk => {
      stdout += chunk.toString();
      if (stdout.includes(`Server listening on http://0.0.0.0:${port}`)) {
        proc.stdout.removeListener('data', onData);
        resolve(proc);
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('exit', (code, signal) => {
      reject(new Error(`Server exited unexpectedly with code ${code} / signal ${signal}: ${stderr}`));
    });
  });

  t.after(() => {
    child.kill('SIGTERM');
  });

  await t.test('failed file open -> 500 with security headers and server keeps running', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port,
      path: '/index.html',
      method: 'GET'
    });

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.text, 'Internal Server Error');
    assert.ok(res.headers['content-security-policy'], 'Should include CSP header');
    assert.ok(res.headers['strict-transport-security'], 'Should include HSTS header');
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY');

    const health = await request({
      hostname: '127.0.0.1',
      port,
      path: '/healthz',
      method: 'GET'
    });
    assert.strictEqual(health.statusCode, 200);
    assert.strictEqual(health.text, 'OK');
  });

  await t.test('stream error after headers sent -> ends cleanly and server keeps running', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port,
      path: '/rules.json',
      method: 'GET'
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.text, 'partial');

    const health = await request({
      hostname: '127.0.0.1',
      port,
      path: '/healthz',
      method: 'GET'
    });
    assert.strictEqual(health.statusCode, 200);
    assert.strictEqual(health.text, 'OK');
  });
});

test('daily cap is only charged for valid non-photo requests', async t => {
  const port = await getFreePort();
  const child = await new Promise((resolve, reject) => {
    const proc = cp.spawn(process.execPath, ['server/index.js'], {
      env: Object.assign({}, process.env, {
        PORT: String(port),
        DAILY_CAP: '1',
        IP_DAILY_CAP: '1',
        GEMINI_API_KEY: ''
      }),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    const onData = chunk => {
      stdout += chunk.toString();
      if (stdout.includes(`Server listening on http://0.0.0.0:${port}`)) {
        proc.stdout.removeListener('data', onData);
        resolve(proc);
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('exit', (code, signal) => {
      reject(new Error(`Server exited unexpectedly with code ${code} / signal ${signal}: ${stderr}`));
    });
  });

  t.after(() => {
    child.kill('SIGTERM');
  });

  await t.test('junk (400/413) and photo (501) do not consume daily cap, valid request does', async () => {
    const post = (ip, body) => request({
      hostname: '127.0.0.1',
      port,
      path: '/api/read',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip
      }
    }, body);

    const badJson = await post('198.51.100.1', '{"mode": "typed", broken');
    assert.strictEqual(badJson.statusCode, 400);
    assert.deepStrictEqual(badJson.json, { error: 'bad_request' });

    const badMode = await post('198.51.100.1', JSON.stringify({ mode: 'nope', text: 'cleanser' }));
    assert.strictEqual(badMode.statusCode, 400);
    assert.deepStrictEqual(badMode.json, { error: 'bad_request' });

    const tooLarge = await post('198.51.100.1', JSON.stringify({ mode: 'paste', text: 'a'.repeat(4005) }));
    assert.strictEqual(tooLarge.statusCode, 413);
    assert.deepStrictEqual(tooLarge.json, { error: 'too_large' });

    const photo = await post('198.51.100.1', JSON.stringify({ mode: 'photo', image: 'AAAA' }));
    assert.strictEqual(photo.statusCode, 501);
    assert.deepStrictEqual(photo.json, { error: 'photo_not_ready' });

    // Valid request still passes daily cap (1/1) and reaches model_off (503)
    const firstValid = await post('198.51.100.2', JSON.stringify({ mode: 'typed', text: 'gentle cleanser' }));
    assert.strictEqual(firstValid.statusCode, 503);
    assert.deepStrictEqual(firstValid.json, { error: 'model_off' });

    // Second valid request is blocked by daily cap (429 daily_cap with Retry-After)
    const secondValid = await post('198.51.100.3', JSON.stringify({ mode: 'paste', text: 'Water, Glycerin' }));
    assert.strictEqual(secondValid.statusCode, 429);
    assert.deepStrictEqual(secondValid.json, { error: 'daily_cap' });
    assert.ok(secondValid.headers['retry-after'], 'Should include Retry-After header');
  });

  await t.test('flooding malformed requests still triggers per-minute 429 slow_down before body read', async () => {
    const floodIp = '198.51.100.55';
    let rateRes = null;
    for (let i = 0; i < 10; i++) {
      const res = await request({
        hostname: '127.0.0.1',
        port,
        path: '/api/read',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': floodIp
        }
      }, '{bad_json');
      if (res.statusCode === 429) {
        rateRes = res;
        break;
      }
    }
    assert.ok(rateRes, 'Per-minute rate limit should trigger on malformed flood');
    assert.strictEqual(rateRes.statusCode, 429);
    assert.deepStrictEqual(rateRes.json, { error: 'slow_down' });
    assert.ok(rateRes.headers['retry-after'], 'Should include Retry-After header');
  });
});
