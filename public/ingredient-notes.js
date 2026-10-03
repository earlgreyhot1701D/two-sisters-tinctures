/**
 * ingredient-notes.js: finds the plain-language note for an ingredient. One job, no DOM.
 * Notes and spelling aliases live in rules.json (facts, not model output).
 * Works in the browser (window.IngredientNotes) and in Node tests (module.exports).
 */
(function (root) {
  'use strict';

  // Lowercase, drop role tags like "(Skin-Conditioner)", squash spaces, drop trailing punctuation.
  function normalize(name) {
    let s = String(name == null ? '' : name).toLowerCase();
    s = s.replace(/\([^)]*\)/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/[.,;:]+$/, '').trim();
    return s;
  }

  // Returns the note text, or null when there is no note.
  function lookup(name, rules) {
    if (!rules || !rules.ingredientNotes) return null;
    const notes = rules.ingredientNotes;
    const aliases = rules.ingredientAliases || {};
    const n = normalize(name);
    if (!n) return null;
    const tries = [n, n + '.', aliases[n], aliases[n + '.']];
    for (const key of tries) {
      if (key && Object.prototype.hasOwnProperty.call(notes, key)) return notes[key];
    }
    return null;
  }

  const api = { normalize, lookup };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.IngredientNotes = api;
})(typeof window !== 'undefined' ? window : globalThis);
