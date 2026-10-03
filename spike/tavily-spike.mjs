// SPIKE (throwaway, read-only). Question: does Tavily return a correct ingredient
// list for our 5 gold products? Run by hand: node spike/tavily-spike.mjs
// Key comes from .env as TAVILY_API_KEY. Never printed, never sent anywhere but Tavily.
import fs from 'node:fs';
import path from 'node:path';

try { process.loadEnvFile('.env'); } catch { /* .env optional */ }
const KEY = process.env.TAVILY_API_KEY;
if (!KEY) { console.error('Set TAVILY_API_KEY in .env first.'); process.exit(1); }

const dir = path.join('test', 'fixtures', 'gold');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
let passed = 0;

for (const file of files) {
  const fx = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const name = fx.name || fx.id;
  // First 8 ingredient names from the verified fixture, parentheses stripped.
  const expected = String(fx.text || '').split(',').slice(0, 8)
    .map((s) => s.replace(/\(.*?\)/g, '').trim().toLowerCase()).filter(Boolean);
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ query: `${name} full ingredients list INCI`, max_results: 5, search_depth: 'basic' }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) { console.log(`${name}: HTTP ${res.status}`); continue; }
    const data = await res.json();
    let best = { hits: 0, url: '(none)' };
    for (const r of data.results || []) {
      const body = String(r.content || '').toLowerCase();
      const hits = expected.filter((e) => body.includes(e)).length;
      if (hits > best.hits) best = { hits, url: r.url };
    }
    const ok = best.hits >= 6;
    if (ok) passed += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: best result matched ${best.hits} of ${expected.length}  ${best.url}  (${data.response_time}s)`);
  } catch (e) {
    console.log(`${name}: error ${e.name}`);
  }
}
console.log(`\n${passed} of ${files.length} products passed. Bar: 4 of 5.`);
