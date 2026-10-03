import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rules from '../public/rules.json' with { type: 'json' };
import { validateModelOutput } from '../server/validate.js';
import { readProduct } from '../server/gemma.js';

try {
  process.loadEnvFile();
} catch {
  // .env is optional or already in environment
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures', 'gold');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --bare runs ingredients only, like pasting with no name. Default sends the name too.
const bare = process.argv.includes('--bare');

// Same format as the Paste screen in public/app.js.
function buildText(fixture) {
  if (bare || !fixture.name) return fixture.text;
  return 'Product name: ' + fixture.name + '\nIngredients: ' + fixture.text;
}

async function runGoldSet() {
  console.log(bare ? 'Mode: ingredients only\n' : 'Mode: with product name\n');
  const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json')).sort();
  let passedCount = 0;
  const totalCount = files.length;

  for (let i = 0; i < totalCount; i++) {
    if (i > 0) {
      await sleep(2000);
    }

    const file = files[i];
    const rawContent = fs.readFileSync(path.join(fixturesDir, file), 'utf8');
    const fixture = JSON.parse(rawContent);

    const startedAt = Date.now();
    let pass = false;
    let failReason = '';

    try {
      const text = buildText(fixture);
      const modelRaw = await readProduct({ mode: fixture.mode, text });
      const validated = validateModelOutput(modelRaw, { mode: fixture.mode, text }, rules);

      if (!validated.ok) {
        failReason = 'validation failed (' + validated.error + (validated.why ? ': ' + validated.why : '') + ')';
      } else {
        const val = validated.value;
        const okTypes = [].concat(fixture.expect.type);
        const typeMatch = okTypes.includes(val.type);

        const listed = (val.ingredients || []).map(item => item.toLowerCase());
        const mustIncludeMatch = (fixture.expect.mustInclude || []).every(req =>
          listed.some(item => item.includes(req.toLowerCase()) || req.toLowerCase().includes(item))
        );
        const mustNotIncludeMatch = !(fixture.expect.mustNotInclude || []).some(bad =>
          listed.some(item => item.includes(bad.toLowerCase()) || bad.toLowerCase().includes(item))
        );

        if (!typeMatch) {
          failReason = 'type mismatch (expected ' + okTypes.join(' or ') + ', got ' + val.type + ')';
        } else if (!mustIncludeMatch) {
          failReason = 'missing required ingredient';
        } else if (!mustNotIncludeMatch) {
          failReason = 'included forbidden ingredient';
        } else {
          pass = true;
        }
      }
    } catch (err) {
      failReason = err && err.message ? err.message : 'error';
    }

    const durationMs = Date.now() - startedAt;

    if (pass) {
      passedCount++;
      console.log(`${fixture.id}: PASS (${durationMs} ms)`);
    } else {
      console.log(`${fixture.id}: FAIL [${failReason}] (${durationMs} ms)`);
    }
  }

  console.log(`\nResult: ${passedCount} of ${totalCount}`);
}

runGoldSet().catch(err => {
  console.error('Gold set runner error:', err && err.message);
  process.exit(1);
});
