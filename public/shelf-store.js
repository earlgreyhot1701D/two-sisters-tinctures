/**
 * Two Sisters Tinctures - Shelf Store
 * Storage key: tst:shelf:v1
 * Strict try/catch on every storage call.
 * Client-side schema, length, and item validation for restore.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'tst:shelf:v1';
  const MAX_SHELF_ITEMS = 100;
  const VALID_TYPES = new Set([
    'Cleanser',
    'Toner',
    'Essence',
    'Treatment',
    'Serum',
    'Eye cream',
    'Moisturizer',
    'Facial oil',
    'Sunscreen',
    'Mask',
    'Other'
  ]);
  const VALID_PAO = new Set([3, 6, 12, 24]);
  const VALID_STATUSES = new Set(['active', 'finished']);

  // Helper to validate YYYY-MM-DD format and valid calendar date
  function isValidDateString(str) {
    if (typeof str !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  // Sanitize a single product object. Returns null if invalid.
  function sanitizeProduct(raw, index, seenIds) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name || name.length > 80) return null;

    const brand = typeof raw.brand === 'string' ? raw.brand.trim() : '';
    if (brand.length > 60) return null;

    // Type fallback: if unknown or missing, treat as 'Other'
    let type = typeof raw.type === 'string' ? raw.type.trim() : 'Other';
    if (!VALID_TYPES.has(type)) {
      type = 'Other';
    }

    if (!isValidDateString(raw.opened)) return null;

    let when = raw.when;
    if (!Array.isArray(when) || when.length === 0) {
      when = ['both'];
    } else {
      when = when.filter(w => w === 'am' || w === 'pm' || w === 'both');
      if (when.length === 0) when = ['both'];
    }

    let paoMonths = Number(raw.paoMonths);
    if (!VALID_PAO.has(paoMonths)) {
      paoMonths = 12;
    }

    let status = typeof raw.status === 'string' ? raw.status.toLowerCase() : 'active';
    if (!VALID_STATUSES.has(status)) {
      status = 'active';
    }

    let ingredients = [];
    if (Array.isArray(raw.ingredients)) {
      ingredients = raw.ingredients
        .filter(ing => typeof ing === 'string' && ing.trim().length > 0 && ing.length <= 100)
        .map(ing => ing.trim())
        .slice(0, 50);
    }

    const does = typeof raw.does === 'string' ? raw.does.slice(0, 300) : '';

    // ID deduplication
    let id = typeof raw.id === 'string' && raw.id.trim().length > 0 && raw.id.length <= 50 ? raw.id.trim() : 'p_' + Date.now() + '_' + index;
    if (seenIds.has(id)) {
      id = 'p_' + Date.now() + '_' + index + '_' + Math.floor(Math.random() * 1000);
    }
    seenIds.add(id);

    return {
      id: id,
      name: name,
      brand: brand,
      type: type,
      when: when,
      freq: typeof raw.freq === 'string' ? raw.freq.slice(0, 60) : null,
      ingredients: ingredients,
      does: does,
      opened: raw.opened,
      paoMonths: paoMonths,
      status: status,
      addedVia: typeof raw.addedVia === 'string' ? raw.addedVia.slice(0, 20) : 'manual',
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt.slice(0, 40) : new Date().toISOString()
    };
  }

  const ShelfStore = {
    /**
     * Read products from localStorage. Always returns an array of sanitized items.
     * Silently drops bad items so corrupt storage never crashes a screen.
     */
    getShelf: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seenIds = new Set();
        const validItems = [];
        for (let i = 0; i < parsed.length; i++) {
          const clean = sanitizeProduct(parsed[i], i, seenIds);
          if (clean) validItems.push(clean);
        }
        return validItems;
      } catch (err) {
        console.error('ShelfStore.getShelf error:', err);
        return [];
      }
    },

    /**
     * Persist products array to localStorage.
     */
    saveShelf: function (items) {
      try {
        if (!Array.isArray(items)) {
          throw new Error('Shelf items must be an array');
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return true;
      } catch (err) {
        console.error('ShelfStore.saveShelf error:', err);
        return false;
      }
    },

    /**
     * Add a single product to shelf.
     */
    addProduct: function (product) {
      try {
        const items = this.getShelf();
        items.push(product);
        return this.saveShelf(items);
      } catch (err) {
        console.error('ShelfStore.addProduct error:', err);
        return false;
      }
    },

    /**
     * Update an existing product by id.
     */
    updateProduct: function (id, updates) {
      try {
        const items = this.getShelf();
        const idx = items.findIndex(p => p.id === id);
        if (idx !== -1) {
          items[idx] = Object.assign({}, items[idx], updates);
          return this.saveShelf(items);
        }
        return false;
      } catch (err) {
        console.error('ShelfStore.updateProduct error:', err);
        return false;
      }
    },

    /**
     * Remove a product by id.
     */
    removeProduct: function (id) {
      try {
        const items = this.getShelf();
        const filtered = items.filter(p => p.id !== id);
        return this.saveShelf(filtered);
      } catch (err) {
        console.error('ShelfStore.removeProduct error:', err);
        return false;
      }
    },

    /**
     * Clear all shelf data.
     */
    clearShelf: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
      } catch (err) {
        console.error('ShelfStore.clearShelf error:', err);
        return false;
      }
    },

    /**
     * Validate an imported JSON string or parsed object against PRD rules.
     * Rejects unknown types, invalid dates, over-long strings, and excessive items.
     * Deduplicates IDs and drops unknown keys.
     */
    validateBackup: function (data) {
      let items = data;
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch {
          return { valid: false, error: 'That file isn’t a Two Sisters backup. Nothing changed.' };
        }
      }

      if (!Array.isArray(items)) {
        return { valid: false, error: 'That file isn’t a Two Sisters backup. Nothing changed.' };
      }

      if (items.length > MAX_SHELF_ITEMS) {
        return { valid: false, error: 'That file isn’t a Two Sisters backup. Nothing changed.' };
      }

      const sanitized = [];
      const seenIds = new Set();

      for (let i = 0; i < items.length; i++) {
        const clean = sanitizeProduct(items[i], i, seenIds);
        if (!clean) {
          // If any item fails schema or date check, reject the whole backup
          return { valid: false, error: 'That file isn’t a Two Sisters backup. Nothing changed.' };
        }
        sanitized.push(clean);
      }

      return { valid: true, items: sanitized };
    },

    /**
     * Export backup file as a downloadable JSON blob.
     * Compatible with modern browsers and iOS Safari.
     */
    exportBackup: function () {
      try {
        const items = this.getShelf();
        const jsonStr = JSON.stringify(items, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = 'two-sisters-shelf-' + dateStr + '.json';

        // Standard link download pattern supported by iOS 13+ Safari and desktop
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 300);
        return true;
      } catch (err) {
        console.error('ShelfStore.exportBackup error:', err);
        return false;
      }
    }
  };

  global.ShelfStore = ShelfStore;
})(window);
