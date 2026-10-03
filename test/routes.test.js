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
});
