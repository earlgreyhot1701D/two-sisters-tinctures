'use strict';
// validate.js: deterministic checks on what the model returns. The model can't talk its way past these.
// Pure functions. No network. Takes rules.json as an argument.

const LIMITS = { name: 60, brand: 40, ingredients: 40, ingredient: 60, does: 240 };

function cleanString(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length === 0) return null;
  return s.length > max ? null : s;
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
  const fail = { ok: false, error: 'unreadable' };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail;

  if (raw.kind === 'not_skincare') {
    return { ok: true, value: { kind: 'not_skincare', name: null, brand: null, type: null, ingredients: [], does: '' } };
  }
  if (raw.kind !== 'skincare') return fail;

  // Schema and length checks. A bad field means "Couldn't read this", not a partial guess.
  let name = null;
  if (raw.name != null) { name = cleanString(raw.name, LIMITS.name); if (name === null) return fail; }
  let brand = null;
  if (raw.brand != null) { brand = cleanString(raw.brand, LIMITS.brand); if (brand === null) return fail; }

  let type = null;
  if (raw.type != null) {
    if (typeof raw.type !== 'string' || !rules.types.includes(raw.type)) return fail;
    type = raw.type;
  }

  if (!Array.isArray(raw.ingredients) || raw.ingredients.length > LIMITS.ingredients) return fail;
  let ingredients = [];
  for (const item of raw.ingredients) {
    const s = cleanString(item, LIMITS.ingredient);
    if (s === null) return fail;
    ingredients.push(s);
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

  let does = raw.does == null ? '' : cleanString(raw.does, LIMITS.does);
  if (does === null) return fail;

  // Guard: `does` may only mention ingredients that are in the list. Else use the general line for the type.
  const general = rules.generalDoes && rules.generalDoes[type || 'Other'];
  if (does === '' || doesMentionsUnlistedIngredient(does, ingredients, rules)) {
    does = general || '';
  }

  return { ok: true, value: { kind: 'skincare', name, brand, type, ingredients, does } };
}

module.exports = { LIMITS, validateModelOutput, doesMentionsUnlistedIngredient };
