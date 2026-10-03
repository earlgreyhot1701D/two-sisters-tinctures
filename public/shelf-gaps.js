(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShelfGaps = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const GAPS = [
    {
      type: 'Sunscreen',
      id: 'gap.sunscreen',
      text: 'No sunscreen in your morning routine yet.'
    },
    {
      type: 'Cleanser',
      id: 'gap.cleanser',
      text: 'No cleanser on your shelf yet to wash the day off.'
    },
    {
      type: 'Moisturizer',
      id: 'gap.moisturizer',
      text: 'No moisturizer on your shelf yet to seal in hydration.'
    }
  ];

  /**
   * Evaluates active products against priority gaps: Sunscreen > Cleanser > Moisturizer.
   * At most one hint is returned. Empty shelves or shelves with all three return null.
   * @param {Array} activeProducts - List of active shelf products
   * @param {Function} isDismissed - fn(type) returning boolean
   * @returns {Object|null} { type, id, text } or null
   */
  function computeShelfGap(activeProducts, isDismissed) {
    if (!Array.isArray(activeProducts) || activeProducts.length === 0) {
      return null;
    }

    const typesPresent = new Set(activeProducts.map(p => p.type));

    for (let i = 0; i < GAPS.length; i++) {
      const g = GAPS[i];
      if (!typesPresent.has(g.type)) {
        if (typeof isDismissed === 'function' && isDismissed(g.type)) {
          continue;
        }
        return g;
      }
    }

    return null;
  }

  return { GAPS, computeShelfGap };
});
