'use strict';
// validate.js: deterministic checks on what the model returns. The model can't talk its way past these.
// Pure functions. No network. Takes rules.json as an argument.

// Limits. Real labels run longer than the first PRD numbers (gold set, Oct 3): one 70-character ingredient
// name made a whole read fail. Ingredients now allow 50 items of 100 characters, which matches shelf-store.js.
// Too-long name, brand, does or extra ingredients are trimmed or replaced, never fatal. Wrong shape or type still fails.
const LIMITS = { name: 60, brand: 40, ingredients: 50, ingredient: 100, does: 240 };

// Returns a clean string, or null if it isn't a usable string. With trim=true, over-long text is cut to max.
function cleanString(v, max, trim) {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  const s = v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length === 0) return null;
  if (s.length > max) return trim ? s.slice(0, max).trim() : null;
  return s;
}

// Known ingredient names from rules.json (lowercase).
function knownIngredients(rules) {
  const names = new Set(Object.keys((rules && rules.ingredientNotes) || {}));
  return Array.from(names);
}

// Does `does` mention a known ingredient that is not in the returned ingredient list?
function doesMentionsUnlistedIngredient(does, ingredients, rules) {
  const text = does.toLowerCase();
  const listed = ingredients.map(i => i.toLowerCase());
  for (const name of knownIngredients(rules)) {
    if (!text.includes(name)) continue;
    const covered = listed.some(l => l.includes(name) || name.includes(l));
    if (!covered) return true;
  }
  return false;
}

// Returns { ok: true, value } or { ok: false, error: 'unreadable' }.
// raw: parsed model JSON. request: { mode, text }. rules: parsed rules.json.
function validateModelOutput(raw, request, rules) {
  const bad = (why) => ({ ok: false, error: 'unreadable', why });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('not_object:' + (raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw));

  if (raw.kind === 'not_skincare') {
    return { ok: true, value: { kind: 'not_skincare', name: null, brand: null, type: null, ingredients: [], does: '' } };
  }
  if (raw.kind !== 'skincare') return bad('kind');

  // Schema and length checks. A bad field means "Couldn't read this", not a partial guess.
  let name = null;
  if (raw.name != null && raw.name !== '') { name = cleanString(raw.name, LIMITS.name, true); if (name === null) return bad('name'); }
  let brand = null;
  if (raw.brand != null && raw.brand !== '') { brand = cleanString(raw.brand, LIMITS.brand, true); if (brand === null) return bad('brand'); }

  let type = null;
  if (raw.type != null) {
    if (typeof raw.type !== 'string' || !rules.types.includes(raw.type)) return bad('type');
    type = raw.type;
  }

  if (!Array.isArray(raw.ingredients)) return bad('ingredients_shape');
  let ingredients = [];
  for (const item of raw.ingredients.slice(0, LIMITS.ingredients)) {
    const s = cleanString(item, LIMITS.ingredient);
    if (s !== null) ingredients.push(s); // skip blanks and absurdly long junk
  }

  // Guard: typed path never gets ingredients.
  if (request.mode === 'typed') ingredients = [];

  // Guard: paste path keeps only ingredients that appear verbatim (case-insensitive) in the pasted text.
  if (request.mode === 'paste') {
    const source = String(request.text || '').toLowerCase();
    ingredients = ingredients.filter(i => source.includes(i.toLowerCase()));
  }

  // De-dupe, keep order.
  const seen = new Set();
  ingredients = ingredients.filter(i => {
    const k = i.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let does = typeof raw.does === 'string' ? cleanString(raw.does, LIMITS.does) : '';
  if (does === null) does = ''; // too long or blank: the general line below takes over

  // Guard: `does` may only mention ingredients that are in the list. Else use the general line for the type.
  const general = rules.generalDoes && rules.generalDoes[type || 'Other'];
  if (!does || doesMentionsUnlistedIngredient(does, ingredients, rules)) {
    does = general || '';
  }

  return { ok: true, value: { kind: 'skincare', name, brand, type, ingredients, does } };
}

module.exports = { LIMITS, validateModelOutput, doesMentionsUnlistedIngredient };
