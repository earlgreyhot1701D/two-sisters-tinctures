(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IngredientMatch = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Normalize ingredient text: strip (parentheses), percentages/strengths (e.g. 2%, 0.3%), normalize dashes and spaces, lowercase
  function normalize(str) {
    if (typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*%/g, ' ')
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Split comma-separated ingredients without splitting on commas directly followed by digits (e.g., 1,2-Hexanediol)
  function splitIngredients(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .split(/\s*,\s*(?!\d)/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function getPositionLimitedNames(rules) {
    if (rules && rules.positionLimited && Array.isArray(rules.positionLimited.names)) {
      return rules.positionLimited.names.map(s => s.toLowerCase());
    }
    return ['glycolic acid', 'lactic acid', 'salicylic acid', 'ascorbic acid', 'l-ascorbic acid'];
  }

  function getPositionLimit(rules) {
    return (rules && rules.positionLimited && typeof rules.positionLimited.limit === 'number')
      ? rules.positionLimited.limit
      : 10;
  }

  function hasIngredientMatch(ingredients, keyword, isPositionLimited, rules) {
    const limit = getPositionLimit(rules);
    const list = isPositionLimited ? ingredients.slice(0, limit) : ingredients;
    const normKey = normalize(keyword);
    return list.some(ing => normalize(ing) === normKey);
  }

  // Returns array: [defaultSlot] (e.g. ['am'] or ['pm'] or ['both'])
  function computeWhen(product, targetType, rules) {
    const pType = targetType || product.type || 'Other';
    const pName = product.name || '';

    // STUB: Saving freq ("2 to 3 nights a week") from override to be added when routine frequency scheduler is built.

    // 1. SPF Backstop: Sunscreen or name with SPF + number is strictly morning
    if (pType === 'Sunscreen' || /\bspf\s*\d+/i.test(pName)) {
      return ['am'];
    }

    if (pType === 'Mask' || pType === 'Other') {
      return Array.isArray(product.when) && product.when.length > 0 ? product.when : ['both'];
    }

    let defaultSlot = (rules && rules.defaultWhen && rules.defaultWhen[pType]) || 'both';

    if (rules && rules.ingredientOverrides && Array.isArray(product.ingredients)) {
      // Cleansers wash off; skip acid overrides
      const skipAcids = pType === 'Cleanser';
      const limitedNames = getPositionLimitedNames(rules);

      for (const override of rules.ingredientOverrides) {
        const matchesOverride = override.match.some(m => {
          const isLimited = limitedNames.includes(m.toLowerCase());
          if (isLimited && skipAcids) return false;
          return hasIngredientMatch(product.ingredients, m, isLimited, rules);
        });

        if (matchesOverride) {
          defaultSlot = override.when;
          break;
        }
      }
    }

    return [defaultSlot];
  }

  function canUseAtNight(prod) {
    const when = Array.isArray(prod.when) ? prod.when : ['both'];
    return when.includes('both') || when.includes('pm');
  }

  function productHasGroup(prod, group, rules) {
    if (!Array.isArray(prod.ingredients)) return false;
    const limitedNames = getPositionLimitedNames(rules);
    return group.some(g => {
      const isLimited = limitedNames.includes(g.toLowerCase());
      return hasIngredientMatch(prod.ingredients, g, isLimited, rules);
    });
  }

  function findMatchedIngredientInGroup(prod, group, rules) {
    if (!Array.isArray(prod.ingredients)) return null;
    const limitedNames = getPositionLimitedNames(rules);
    for (const g of group) {
      const isLimited = limitedNames.includes(g.toLowerCase());
      if (hasIngredientMatch(prod.ingredients, g, isLimited, rules)) {
        return g;
      }
    }
    return null;
  }

  function findConflictPartner(prod, allProds, rules) {
    if (!rules || !rules.conflicts || !canUseAtNight(prod)) return null;

    for (const conflict of rules.conflicts) {
      const isA = productHasGroup(prod, conflict.groupA, rules);
      const isB = productHasGroup(prod, conflict.groupB, rules);

      if (isA) {
        const partner = allProds.find(other =>
          other.id !== prod.id &&
          canUseAtNight(other) &&
          productHasGroup(other, conflict.groupB, rules)
        );
        if (partner) return partner;
      }

      if (isB) {
        const partner = allProds.find(other =>
          other.id !== prod.id &&
          canUseAtNight(other) &&
          productHasGroup(other, conflict.groupA, rules)
        );
        if (partner) return partner;
      }
    }

    return null;
  }

  function findShelfMixAlert(activeProds, rules) {
    if (!rules || !rules.conflicts) return null;
    const nightProds = activeProds.filter(canUseAtNight);

    for (const conflict of rules.conflicts) {
      const prodA = nightProds.find(p => productHasGroup(p, conflict.groupA, rules));
      if (!prodA) continue;
      const prodB = nightProds.find(p => p.id !== prodA.id && productHasGroup(p, conflict.groupB, rules));
      if (!prodB) continue;

      const ingA = findMatchedIngredientInGroup(prodA, conflict.groupA, rules) || 'Retinoids';
      const ingB = findMatchedIngredientInGroup(prodB, conflict.groupB, rules) || 'Acids';
      const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

      return {
        a: cap(ingB),
        b: cap(ingA),
        title: `Don't mix tonight: ${cap(ingB)} and ${cap(ingA)}`,
        desc: "Pick one, or your moisture barrier will send me angry texts."
      };
    }
    return null;
  }

  return {
    normalize,
    splitIngredients,
    computeWhen,
    findConflictPartner,
    findShelfMixAlert
  };
});
