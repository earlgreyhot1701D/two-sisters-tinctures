/**
 * Two Sisters Tinctures - Skincare Shelf Tracker
 * Source of truth: design/stitch-round3.html
 * DOM construction strictly with createElement and textContent (no innerHTML, no eval).
 */
(function () {
  'use strict';

  // Fixed demo date for demo mode so expiry states are stable for judges.
  // Real shelves will use the real date in Block 2.
  const TODAY = new Date(2026, 9, 2);

  // Application State
  let currentTab = 'shelf';
  let routineTime = 'pm';
  let addFlowStep = 'select';
  let addMethod = '';
  let products = []; // Starts empty by default
  let isDemo = false;
  let rules = null; // Loaded from rules.json
  let manualFormState = {};
  let pendingUndo = null; // { product, index, timerId }

  // Date and Calculation Helpers
  function parseDateString(str) {
    if (!str || typeof str !== 'string') return new Date();
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function isValidDateString(str) {
    if (typeof str !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  function formatDateString(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function computeUseByDate(openedStr, paoMonths) {
    const dt = parseDateString(openedStr);
    dt.setMonth(dt.getMonth() + Number(paoMonths || 12));
    return formatDateString(dt);
  }

  function computeBadge(product, refDate) {
    const useBy = parseDateString(computeUseByDate(product.opened, product.paoMonths));
    const now = refDate || (isDemo ? TODAY : new Date());
    const diffTime = useBy.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { text: 'Past its prime', type: 'past-prime' };
    }
    if (diffDays <= 30) {
      return { text: 'Use soon', type: 'use-soon' };
    }
    return null;
  }

  function getIngredientNote(ingName) {
    if (!rules || !rules.ingredientNotes) return 'No note for this one yet.';
    const key = ingName.toLowerCase().trim();
    return rules.ingredientNotes[key] || rules.defaultIngredientNote || 'No note for this one yet.';
  }

  function computeProductWarning(prod, allProds) {
    if (!rules || !rules.conflicts) return null;
    const ingList = (prod.ingredients || []).map(i => i.toLowerCase());
    const hasA = rules.conflicts.some(c => c.groupA.some(g => ingList.some(i => i.includes(g))));
    const hasB = rules.conflicts.some(c => c.groupB.some(g => ingList.some(i => i.includes(g))));

    // Check if other products on shelf conflict
    if (hasA) {
      const conflictB = allProds.find(other => 
        other.id !== prod.id && 
        (other.ingredients || []).some(i => rules.conflicts.some(c => c.groupB.some(g => i.toLowerCase().includes(g))))
      );
      if (conflictB) {
        return `Do not use on the same night as ${conflictB.name}.`;
      }
    }
    if (hasB) {
      const conflictA = allProds.find(other => 
        other.id !== prod.id && 
        (other.ingredients || []).some(i => rules.conflicts.some(c => c.groupA.some(g => i.toLowerCase().includes(g))))
      );
      if (conflictA) {
        return `Do not use on the same night as ${conflictA.name}.`;
      }
    }
    return null;
  }

  function computeStepReason(prod, timeSlot) {
    if (!rules || !rules.reasons) return '';
    const typeRule = rules.reasons[prod.type];
    if (typeof typeRule === 'object' && typeRule !== null) {
      return typeRule[timeSlot] || '';
    }
    if (typeof typeRule === 'string') {
      return typeRule;
    }
    return '';
  }

  // Recompute 'when' slot when changing category (Adjustment 5)
  // Mask and Other keep when as she set it.
  // Other types use default for the type plus ingredient overrides from rules.json.
  function recomputeWhenForType(product, newType) {
    if (newType === 'Mask' || newType === 'Other') {
      return Array.isArray(product.when) && product.when.length > 0 ? product.when : ['both'];
    }
    let defaultSlot = (rules && rules.defaultWhen && rules.defaultWhen[newType]) || 'both';
    
    // Check ingredient overrides
    if (rules && rules.ingredientOverrides && Array.isArray(product.ingredients)) {
      const ings = product.ingredients.map(i => i.toLowerCase());
      for (const override of rules.ingredientOverrides) {
        if (override.match.some(m => ings.some(i => i.includes(m)))) {
          defaultSlot = override.when;
          break;
        }
      }
    }
    return [defaultSlot];
  }

  const mainContent = document.getElementById('main-content');
  const detailBackdrop = document.getElementById('detail-sheet-backdrop');
  const detailContent = document.getElementById('detail-sheet-content');
  const toastEl = document.getElementById('app-toast');

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    setTimeout(() => {
      toastEl.classList.remove('visible');
    }, 2800);
  }

  function showToastWithUndo(msg, undoLabel, onUndo) {
    // Clear existing content safely
    while (toastEl.firstChild) { toastEl.removeChild(toastEl.firstChild); }
    toastEl.appendChild(document.createTextNode(msg + ' '));
    const undoBtn = document.createElement('button');
    undoBtn.className = 'toast-undo-btn';
    undoBtn.type = 'button';
    undoBtn.appendChild(document.createTextNode(undoLabel));
    undoBtn.addEventListener('click', () => {
      toastEl.classList.remove('visible');
      onUndo();
    });
    toastEl.appendChild(undoBtn);
    toastEl.classList.add('visible');
    return setTimeout(() => {
      toastEl.classList.remove('visible');
      while (toastEl.firstChild) { toastEl.removeChild(toastEl.firstChild); }
      pendingUndo = null; // Fix B: removal is final once timer expires
    }, 5000);
  }

  // Safe Element Helper
  function el(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'className') {
        element.className = val;
      } else if (key.startsWith('on') && typeof val === 'function') {
        element.addEventListener(key.slice(2), val);
      } else if (key === 'selected') {
        if (val) element.selected = true;
      } else if (key === 'value') {
        element.value = val;
      } else if (key.startsWith('aria-')) {
        element.setAttribute(key, val);
      } else if (val !== undefined && val !== null) {
        element.setAttribute(key, val);
      }
    }
    for (const child of children) {
      if (typeof child === 'string' || typeof child === 'number') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    }
    return element;
  }

  // Wordmark Header
  function createHeader() {
    return el('header', { className: 'app-header' }, [
      el('div', { className: 'wordmark-subtitle' }, ['Two Sisters']),
      el('h1', { className: 'wordmark-title' }, ['Tinctures'])
    ]);
  }

  // Sister Speech Bubble
  function createGreetingBubble(voiceText) {
    return el('div', { className: 'greeting-bubble' }, [
      el('div', { className: 'greeting-header' }, [
        el('div', { className: 'sister-avatar' }, ['S']),
        el('span', { className: 'sister-tag' }, ['Little sister says:'])
      ]),
      el('p', { className: 'greeting-text' }, [voiceText])
    ]);
  }

  // Tagline Strip using VOICE.md tag.1 to tag.5
  function createMarquee() {
    const lines = [
      'Thinnest to thickest.',
      'Sunscreen is always last.',
      'Don’t mix your retinol and your acids.',
      'Patch test the new stuff.',
      'Open it, date it.'
    ];
    const repeated = [...lines, ...lines];
    
    const track = el('div', { className: 'marquee-track' });
    repeated.forEach(text => {
      track.appendChild(el('span', { className: 'marquee-item' }, [`* ${text}`]));
    });

    return el('div', { className: 'marquee-container' }, [track]);
  }

  function ensureRulesLoaded() {
    if (rules) return Promise.resolve(rules);
    return fetch('rules.json')
      .then(res => {
        if (!res.ok) throw new Error('Network error loading rules');
        return res.json();
      })
      .then(data => {
        rules = data;
        return rules;
      })
      .catch(err => {
        console.error('Failed to load rules.json:', err);
        return null;
      });
  }

  function loadDemoShelf() {
    ensureRulesLoaded().then(() => {
      fetch('demo-shelf.json')
        .then(res => {
          if (!res.ok) throw new Error('Network error loading demo');
          return res.json();
        })
        .then(data => {
          products = data;
          isDemo = true;
          renderApp();
          showToast('Demo shelf loaded');
        })
        .catch(() => {
          showToast("Couldn't load demo shelf");
        });
    });
  }

  // Product Detail Card
  function openProductDetail(product) {
    detailContent.replaceChildren();

    const headerOrnament = el('div', { className: 'paper-header-ornament' }, [
      el('div', { className: 'apothecary-seal' }, ['Two Sisters Tinctures : Specimen card']),
      el('div', { className: 'label-brand-name' }, [product.brand]),
      el('h2', { className: 'label-product-title' }, [product.name]),
      el('button', {
        className: 'sheet-close-btn',
        'aria-label': 'Close detail label',
        onclick: closeProductDetail
      }, ['X'])
    ]);

    const doesSection = el('div', { className: 'label-section' }, [
      el('div', { className: 'label-heading' }, ['What it does']),
      el('p', { className: 'label-body-text' }, [product.does || ''])
    ]);

    const ingHeading = el('div', { className: 'label-heading' }, ["What's in it"]);
    const ingList = el('ul', { className: 'ingredient-list' });
    (product.ingredients || []).forEach(ingName => {
      const ingNote = getIngredientNote(ingName);
      ingList.appendChild(
        el('li', { className: 'ingredient-item' }, [
          el('span', { className: 'ingredient-name' }, [`${ingName}: `]),
          el('span', { className: 'ingredient-desc' }, [ingNote])
        ])
      );
    });

    const whenStr = (product.when && product.when.includes('both'))
      ? 'Morning and Night'
      : (product.when && product.when.includes('am'))
        ? 'Morning only'
        : 'Night only';

    const useBy = computeUseByDate(product.opened, product.paoMonths);

    const metaGrid = el('div', { className: 'label-meta-grid' }, [
      el('div', {}, [
        el('div', { className: 'label-meta-cell-label' }, ['In your routine']),
        el('div', { className: 'label-meta-cell-value' }, [whenStr])
      ]),
      el('div', {}, [
        el('div', { className: 'label-meta-cell-label' }, ['Product type']),
        el('select', {
          className: 'detail-category-select',
          'aria-label': 'Change product category',
          onchange: (e) => {
            const newType = e.target.value;
            const newWhen = recomputeWhenForType(product, newType);
            product.type = newType;
            product.when = newWhen;
            if (!isDemo && window.ShelfStore && typeof window.ShelfStore.updateProduct === 'function') {
              window.ShelfStore.updateProduct(product.id, { type: newType, when: newWhen });
            }
            showToast('Category updated');
            renderApp();
            openProductDetail(product);
          }
        }, ((rules && rules.types) || [
          'Cleanser', 'Toner', 'Essence', 'Treatment', 'Serum', 'Eye cream', 'Moisturizer', 'Facial oil', 'Sunscreen', 'Mask', 'Other'
        ]).map(t => el('option', { value: t, selected: t === product.type ? 'selected' : undefined }, [t])))
      ]),
      el('div', {}, [
        el('div', { className: 'label-meta-cell-label' }, ['Opened date']),
        el('div', { className: 'label-meta-cell-value' }, [product.opened])
      ]),
      el('div', {}, [
        el('div', { className: 'label-meta-cell-label' }, ['Shelf life']),
        el('div', { className: 'label-meta-cell-value' }, [`${product.paoMonths} mo (${useBy})`])
      ])
    ]);

    detailContent.appendChild(headerOrnament);
    detailContent.appendChild(doesSection);
    detailContent.appendChild(el('div', { className: 'label-section' }, [ingHeading, ingList]));
    detailContent.appendChild(el('div', { className: 'label-section' }, [metaGrid]));

    // Computed warning
    const warning = computeProductWarning(product, products.filter(p => p.status !== 'finished'));
    if (warning) {
      const warnBox = el('div', { className: 'label-warning-box' }, [
        el('span', {}, ['!']),
        el('div', {}, [
          el('strong', {}, ['Sister alert: ']),
          warning
        ])
      ]);
      detailContent.appendChild(warnBox);
    }

    // PRD Gate C MUST Controls: Edit, Used it up, Remove from shelf
    const actionRow = el('div', { className: 'detail-actions' }, [
      el('button', {
        className: 'detail-btn-secondary',
        onclick: () => {
          // Placeholder toast: replace in Block 2
          showToast('Editing comes in the build');
        }
      }, ['Edit details']),
      el('button', {
        className: 'detail-btn-secondary',
        onclick: () => {
          if (isDemo) {
            const idx = products.findIndex(p => p.id === product.id);
            if (idx !== -1) products[idx] = Object.assign({}, products[idx], { status: 'finished' });
            closeProductDetail();
            showToast('Finished. Look at you using things up.');
            renderApp();
          } else {
            const ok = window.ShelfStore && window.ShelfStore.updateProduct(product.id, { status: 'finished' });
            if (!ok) { showToast('Your phone couldn\'t save that. Check if storage is full.'); return; }
            products = window.ShelfStore.getShelf();
            closeProductDetail();
            showToast('Finished. Look at you using things up.');
            renderApp();
          }
        }
      }, ['Used it up']),
      el('button', {
        className: 'detail-btn-danger',
        onclick: () => {
          // Finalise any pending undo before starting a new one
          if (pendingUndo) {
            clearTimeout(pendingUndo.timerId);
            pendingUndo = null;
          }
          const idx = products.findIndex(p => p.id === product.id);
          const removed = products[idx];
          if (isDemo) {
            products.splice(idx, 1);
          } else {
            try { window.ShelfStore && window.ShelfStore.removeProduct(removed.id); } catch(e) {}
            products = (window.ShelfStore && window.ShelfStore.getShelf) ? window.ShelfStore.getShelf() : products.filter(p => p.id !== removed.id);
          }
          closeProductDetail();
          renderApp();
          const timerId = showToastWithUndo('Gone.', 'Undo', () => {
            if (!pendingUndo) return;
            clearTimeout(pendingUndo.timerId);
            if (isDemo) {
              products.splice(pendingUndo.index, 0, pendingUndo.product);
            } else {
              // Fix A: restore at original index, not appended at end
              try {
                const list = window.ShelfStore.getShelf();
                list.splice(pendingUndo.index, 0, pendingUndo.product);
                window.ShelfStore.saveShelf(list);
              } catch(e) {}
              products = window.ShelfStore.getShelf();
            }
            pendingUndo = null;
            showToast('Back on the shelf.');
            renderApp();
          });
          pendingUndo = { product: removed, index: idx, timerId };
        }
      }, ['Remove from shelf']),
      el('button', {
        className: 'detail-btn-secondary detail-btn-secondary-spaced',
        onclick: closeProductDetail
      }, ['Tuck back into cabinet'])
    ]);
    detailContent.appendChild(actionRow);

    detailBackdrop.classList.add('open');
    detailBackdrop.setAttribute('aria-hidden', 'false');
  }

  function closeProductDetail() {
    detailBackdrop.classList.remove('open');
    detailBackdrop.setAttribute('aria-hidden', 'true');
  }

  detailBackdrop.addEventListener('click', (e) => {
    if (e.target === detailBackdrop) {
      closeProductDetail();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailBackdrop.classList.contains('open')) {
      closeProductDetail();
    }
  });

  // 1. SHELF SCREEN
  function renderShelfScreen() {
    const container = el('div');
    container.appendChild(createHeader());

    // VOICE.md greet line: "Your whole skincare shelf, in one place, sis. I'll tell you what goes where, what not to mix, and when to toss it."
    container.appendChild(createGreetingBubble(
      "Your whole skincare shelf, in one place, sis. I'll tell you what goes where, what not to mix, and when to toss it."
    ));
    container.appendChild(createMarquee());

    const shelfSection = el('div', { className: 'shelf-section' });

    // Empty state: only active products count
    const activeProducts = products.filter(p => p.status !== 'finished');
    const finishedProducts = products.filter(p => p.status === 'finished');

    if (activeProducts.length === 0 && finishedProducts.length === 0) {
      const emptyBox = el('div', { className: 'empty-shelf-box' }, [
        el('p', { className: 'empty-shelf-text' }, ["Your shelf's empty, sis. Let's fix that."]),
        el('button', {
          className: 'demo-shelf-btn',
          onclick: loadDemoShelf
        }, ['Try the demo shelf'])
      ]);
      shelfSection.appendChild(emptyBox);
      container.appendChild(shelfSection);
      return container;
    }

    // Meta bar: count = active only; demo banner only when isDemo
    const metaBarChildren = [
      el('div', { className: 'shelf-count' }, [`${activeProducts.length} products on your shelf`])
    ];
    if (isDemo) {
      metaBarChildren.push(el('div', { className: 'demo-banner-right' }, [
        el('div', { className: 'demo-shelf-note' }, ['This is a demo shelf. Nothing you add here is saved.']),
        el('button', {
          className: 'demo-exit-btn',
          type: 'button',
          onclick: () => {
            isDemo = false;
            products = (window.ShelfStore && typeof window.ShelfStore.getShelf === 'function')
              ? window.ShelfStore.getShelf()
              : [];
            if (window.history && window.history.replaceState) {
              const url = new URL(window.location.href);
              url.searchParams.delete('demo');
              window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
            }
            showToast('Clean slate.');
            renderApp();
          }
        }, ['Leave the demo'])
      ]));
    }
    const metaBar = el('div', { className: 'shelf-meta-bar' }, metaBarChildren);
    shelfSection.appendChild(metaBar);

    // Apothecary Chest: only active products; if none, show empty text
    const chest = el('div', { className: 'apothecary-chest' });
    const drawersGrid = el('div', { className: 'apothecary-drawers-grid' });

    if (activeProducts.length === 0) {
      chest.appendChild(el('p', { className: 'empty-shelf-text' }, ["Your shelf's empty, sis. Let's fix that."]));
    }

    activeProducts.forEach(prod => {
      const innerFrame = el('div', { className: 'drawer-inset-frame' }, [
        el('div', { className: 'drawer-rivet left' }),
        el('div', { className: 'drawer-rivet right' }),
        el('div', { className: 'drawer-title' }, [prod.name]),
        el('div', { className: 'drawer-category' }, [prod.type])
      ]);

      const knob = el('div', { className: 'drawer-knob' });
      const drawerCardChildren = [innerFrame, knob];

      const badge = computeBadge(prod, isDemo ? TODAY : new Date());
      if (badge) {
        const badgeEl = el('span', {
          className: `drawer-badge ${badge.type}`
        }, [badge.text]);
        drawerCardChildren.unshift(badgeEl);
      }

      const drawerButton = el('button', {
        className: 'drawer-card',
        'aria-label': `Open drawer for ${prod.name}`,
        onclick: () => openProductDetail(prod)
      }, drawerCardChildren);

      drawersGrid.appendChild(drawerButton);
    });

    chest.appendChild(drawersGrid);
    shelfSection.appendChild(chest);

    // Memos and Alerts Section below the chest (Computed dynamically from rules)
    const alertsContainer = el('div', { className: 'alerts-container' });
    const alertsTitle = el('div', { className: 'alerts-header' }, ['Shelf memos']);
    alertsContainer.appendChild(alertsTitle);

    const activeProds = products.filter(p => p.status !== 'finished');

    // Memo 1: Don't mix (Retinoids vs AHAs/BHAs)
    let mixAlert = null;
    const retinoidKeywords = ['retinol', 'retinal'];
    const acidKeywords = ['glycolic acid', 'lactic acid', 'salicylic acid'];
    const hasRetinoid = activeProds.find(p => (p.ingredients || []).some(i => retinoidKeywords.some(k => i.toLowerCase().includes(k))));
    const hasAcid = activeProds.find(p => (p.ingredients || []).some(i => acidKeywords.some(k => i.toLowerCase().includes(k))));
    if (hasRetinoid && hasAcid) {
      // Find the actual matched ingredient names for the title
      const retinoidName = (hasRetinoid.ingredients || []).find(i => retinoidKeywords.some(k => i.toLowerCase().includes(k))) || 'Retinol';
      const acidName = (hasAcid.ingredients || []).find(i => acidKeywords.some(k => i.toLowerCase().includes(k))) || 'Glycolic acid';
      // Capitalise first letter for display
      const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
      mixAlert = el('div', { className: 'alert-card warning' }, [
        el('div', { className: 'alert-title-row' }, [`Don't mix tonight: ${cap(acidName)} and ${cap(retinoidName)}`]),
        el('p', { className: 'alert-desc' }, [
          "Pick one, or your moisture barrier will send me angry texts."
        ])
      ]);
      alertsContainer.appendChild(mixAlert);
    }

    // Memo 2: Past shelf life
    activeProds.forEach(p => {
      const b = computeBadge(p, isDemo ? TODAY : new Date());
      if (b && b.type === 'past-prime') {
        const pOpened = parseDateString(p.opened);
        const refD = isDemo ? TODAY : new Date();
        const diffMonths = Math.max(1, Math.round((refD.getTime() - pOpened.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
        alertsContainer.appendChild(
          el('div', { className: 'alert-card warning' }, [
            el('div', { className: 'alert-title-row' }, [`Past its shelf life: ${p.name}`]),
            el('p', { className: 'alert-desc' }, [
              `It's been open ${diffMonths} months, and it's best within ${p.paoMonths}. Time to let it go.`
            ])
          ])
        );
      }
    });

    // Memo 3: Expiring soon
    activeProds.forEach(p => {
      const b = computeBadge(p, isDemo ? TODAY : new Date());
      if (b && b.type === 'use-soon') {
        const useByStr = computeUseByDate(p.opened, p.paoMonths);
        const useByDate = parseDateString(useByStr);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const dateFormatted = useByDate.toLocaleDateString('en-US', options);
        alertsContainer.appendChild(
          el('div', { className: 'alert-card' }, [
            el('div', { className: 'alert-title-row' }, [`Use up soon: ${p.name}`]),
            el('p', { className: 'alert-desc' }, [
              `Best by ${dateFormatted}. Give it a good spot on the shelf.`
            ])
          ])
        );
      }
    });

    // Memo 4: Doubles (2 or more in doublesTypes)
    if (rules && rules.doublesTypes) {
      rules.doublesTypes.forEach(dType => {
        const matches = activeProds.filter(p => p.type === dType);
        if (matches.length >= 2) {
          alertsContainer.appendChild(
            el('div', { className: 'alert-card' }, [
              el('div', { className: 'alert-title-row' }, [`Two of a kind: ${dType}s`]),
              el('p', { className: 'alert-desc' }, [
                "Fine, if one's for morning and one's for night."
              ])
            ])
          );
        }
      });
    }

    shelfSection.appendChild(alertsContainer);

    // PRD Gate C MUST: Finished list below memos
    const finishedSection = el('div', { className: 'finished-section' });
    finishedSection.appendChild(el('div', { className: 'finished-header' }, ['Finished']));
    if (finishedProducts.length === 0) {
      finishedSection.appendChild(el('p', { className: 'finished-empty' }, ['No products finished yet. Look at you holding onto things.']));
    } else {
      finishedProducts.forEach(fp => {
        const row = document.createElement('div');
        row.className = 'finished-row';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'finished-row-name';
        nameSpan.appendChild(document.createTextNode(fp.name + ' \u2014 ' + fp.type));
        const putBackBtn = document.createElement('button');
        putBackBtn.className = 'btn-text-inline';
        putBackBtn.type = 'button';
        putBackBtn.appendChild(document.createTextNode('Put back on the shelf'));
        putBackBtn.addEventListener('click', () => {
          if (isDemo) {
            const idx = products.findIndex(p => p.id === fp.id);
            if (idx !== -1) products[idx] = Object.assign({}, products[idx], { status: 'active' });
            showToast('Back on the shelf.');
            renderApp();
          } else {
            const ok = window.ShelfStore && window.ShelfStore.updateProduct(fp.id, { status: 'active' });
            if (!ok) { showToast('Your phone couldn\'t save that. Check if storage is full.'); return; }
            products = window.ShelfStore.getShelf();
            showToast('Back on the shelf.');
            renderApp();
          }
        });
        row.appendChild(nameSpan);
        row.appendChild(putBackBtn);
        finishedSection.appendChild(row);
      });
    }
    shelfSection.appendChild(finishedSection);

    container.appendChild(shelfSection);
    return container;
  }

  // 2. ROUTINE SCREEN
  function renderRoutineScreen() {
    const container = el('div');
    container.appendChild(createHeader());

    const voiceMsg = routineTime === 'am' 
      ? "Morning is about armor: antioxidants, barrier moisture, and sunscreen always last. Don't skip the SPF, mom's watching!"
      : "Night is for repair: wash the city away, layer your treatments, and tuck your skin into bed with a cozy cream.";

    container.appendChild(createGreetingBubble(voiceMsg));

    const toggleBar = el('div', { className: 'routine-toggle-bar' });
    const amBtn = el('button', {
      className: `routine-toggle-btn ${routineTime === 'am' ? 'active' : ''}`,
      onclick: () => {
        routineTime = 'am';
        renderApp();
      }
    }, ['Morning routine']);

    const pmBtn = el('button', {
      className: `routine-toggle-btn ${routineTime === 'pm' ? 'active' : ''}`,
      onclick: () => {
        routineTime = 'pm';
        renderApp();
      }
    }, ['Night routine']);

    toggleBar.appendChild(amBtn);
    toggleBar.appendChild(pmBtn);
    container.appendChild(toggleBar);

    if (products.filter(p => p.status !== 'finished').length === 0) {
      const emptyBox = el('div', { className: 'shelf-section' }, [
        el('div', { className: 'empty-shelf-box' }, [
          el('p', { className: 'empty-shelf-text' }, ["Your shelf's empty, sis. Let's fix that."]),
          el('button', {
            className: 'demo-shelf-btn',
            onclick: loadDemoShelf
          }, ['Try the demo shelf'])
        ])
      ]);
      container.appendChild(emptyBox);
      return container;
    }

    const routineItems = products.filter(p => {
      if (p.status === 'finished') return false;
      // Mask and Other have order null and never appear in daily routine steps (Adjustment 6)
      const stepNum = (rules && rules.order && rules.order[p.type]) || null;
      if (stepNum === null || p.type === 'Mask' || p.type === 'Other') return false;
      const whenArr = Array.isArray(p.when) ? p.when : ['both'];
      return whenArr.includes('both') || whenArr.includes(routineTime);
    });

    routineItems.sort((a, b) => {
      const orderA = (rules && rules.order && rules.order[a.type]) || 99;
      const orderB = (rules && rules.order && rules.order[b.type]) || 99;
      return orderA - orderB;
    });

    const stepsList = el('div', { className: 'routine-steps-list' });

    let stepIndex = 1;
    routineItems.forEach(prod => {
      let stepReason = computeStepReason(prod, routineTime);
      if (prod.type === 'Serum' && prod.name.toLowerCase().includes('retinol')) {
        stepReason = 'Cell turnover active. Use on alternate nights from glycolic acid.';
      }

      const stepCard = el('div', {
        className: 'routine-step-card',
        onclick: () => openProductDetail(prod)
      }, [
        el('div', { className: 'routine-step-number' }, [stepIndex++]),
        el('div', { className: 'routine-step-content' }, [
          el('div', { className: 'routine-step-type' }, [prod.type]),
          el('div', { className: 'routine-step-name' }, [prod.name]),
          el('div', { className: 'routine-step-reason' }, [stepReason])
        ])
      ]);
      stepsList.appendChild(stepCard);
    });

    container.appendChild(stepsList);
    return container;
  }

  // 3. ADD SCREEN
  function renderAddScreen() {
    const container = el('div');
    container.appendChild(createHeader());

    if (addFlowStep === 'select') {
      container.appendChild(createGreetingBubble("Ooh, what'd you get?"));

      const addContainer = el('div', { className: 'add-flow-container' });

      const snapCard = el('button', {
        className: 'add-choice-card',
        onclick: () => {
          addMethod = 'snap';
          addFlowStep = 'reading';
          renderApp();
          setTimeout(() => {
            addFlowStep = 'confirm';
            renderApp();
          }, 1100);
        }
      }, [
        el('div', { className: 'add-choice-icon' }, ['📷']),
        el('div', {}, [
          el('div', { className: 'add-choice-title' }, ['Snap the label']),
          el('div', { className: 'add-choice-sub' }, ['A photo of the back of the bottle works best.'])
        ])
      ]);

      const pasteCard = el('button', {
        className: 'add-choice-card',
        onclick: () => {
          addMethod = 'paste';
          addFlowStep = 'paste_input';
          renderApp();
        }
      }, [
        el('div', { className: 'add-choice-icon' }, ['📋']),
        el('div', {}, [
          el('div', { className: 'add-choice-title' }, ['Paste the ingredients']),
          el('div', { className: 'add-choice-sub' }, ["Copy them from the box or the brand's website."])
        ])
      ]);

      const typeCard = el('button', {
        className: 'add-choice-card',
        onclick: () => {
          addMethod = 'type';
          addFlowStep = 'type_input';
          renderApp();
        }
      }, [
        el('div', { className: 'add-choice-icon' }, ['✍']),
        el('div', {}, [
          el('div', { className: 'add-choice-title' }, ['Type the name']),
          el('div', { className: 'add-choice-sub' }, ['For the one everybody’s talking about in the group chat.'])
        ])
      ]);

      // PRD Gate C MUST: Manual add link
      const manualLink = el('button', {
        className: 'add-manual-link',
        onclick: () => {
          addMethod = 'manual';
          addFlowStep = 'confirm';
          renderApp();
        }
      }, ["I'll just type it in myself"]);

      addContainer.appendChild(snapCard);
      addContainer.appendChild(pasteCard);
      addContainer.appendChild(typeCard);
      addContainer.appendChild(manualLink);
      container.appendChild(addContainer);

    } else if (addFlowStep === 'paste_input') {
      container.appendChild(createGreetingBubble("Paste the ingredients list from the box or site."));

      const formBox = el('div', { className: 'add-flow-container' });

      const pasteGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Ingredients']),
        el('textarea', {
          className: 'form-textarea',
          id: 'paste-textarea',
          placeholder: 'Water, Glycerin, Niacinamide, Sodium Hyaluronate...'
        })
      ]);

      const readBtn = el('button', {
        className: 'btn-primary',
        onclick: () => {
          addFlowStep = 'reading';
          renderApp();
          setTimeout(() => {
            addFlowStep = 'confirm';
            renderApp();
          }, 1100);
        }
      }, ['Let me read these']);

      const backBtn = el('button', {
        className: 'btn-secondary',
        onclick: () => {
          addFlowStep = 'select';
          renderApp();
        }
      }, ['Back']);

      formBox.appendChild(pasteGroup);
      formBox.appendChild(readBtn);
      formBox.appendChild(backBtn);
      container.appendChild(formBox);

    } else if (addFlowStep === 'reading') {
      container.appendChild(createGreetingBubble("Hang on, this takes a few seconds…"));

      const readingBox = el('div', { className: 'reading-state-box' }, [
        el('div', { className: 'reading-spinner' }),
        el('p', { className: 'reading-title' }, [
          'Let me read this label'
        ]),
        el('p', { className: 'reading-subtitle' }, [
          'Sorting actives, humectants, and preservatives'
        ])
      ]);
      container.appendChild(readingBox);

    } else if (addFlowStep === 'confirm') {
      const bubbleMsg = addMethod === 'manual'
        ? "Add it by hand, sis. Fill in what you know and we'll put it in your routine."
        : "Here's what I see. Fix anything I got wrong before you save.";
      container.appendChild(createGreetingBubble(bubbleMsg));

      const formBox = el('div', { className: 'add-flow-container' });

      // Name group
      const nameGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Product name *']),
        el('input', {
          className: 'form-input',
          id: 'new-prod-name',
          placeholder: 'e.g. Squalane cleanser',
          value: manualFormState.name || ''
        }),
        el('div', { className: 'form-error-msg', id: 'error-prod-name' })
      ]);

      // Brand group
      const brandGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Brand']),
        el('input', {
          className: 'form-input',
          id: 'new-prod-brand',
          placeholder: 'e.g. Briar and Bramble',
          value: manualFormState.brand || ''
        }),
        el('div', { className: 'form-error-msg', id: 'error-prod-brand' })
      ]);

      // Type group
      const allTypes = (rules && rules.types) || [
        'Cleanser', 'Toner', 'Essence', 'Treatment', 'Serum', 'Eye cream', 'Moisturizer', 'Facial oil', 'Sunscreen', 'Mask', 'Other'
      ];
      const initialType = manualFormState.type || 'Cleanser';

      const typeSelect = el('select', {
        className: 'form-select',
        id: 'new-prod-type',
        onchange: (e) => {
          const chosen = e.target.value;
          manualFormState.type = chosen;
          // Recompute when dropdown based on chosen type
          const whenSelect = document.getElementById('new-prod-when');
          if (whenSelect) {
            const ingVal = (document.getElementById('new-prod-ingredients') || {}).value || '';
            const dummyProd = { type: chosen, ingredients: ingVal.split(',').map(s => s.trim()).filter(Boolean) };
            const recomputed = recomputeWhenForType(dummyProd, chosen);
            whenSelect.value = recomputed[0] || 'both';
            manualFormState.when = whenSelect.value;
          }
        }
      }, allTypes.map(t => el('option', { value: t, selected: t === initialType ? 'selected' : undefined }, [t])));

      const typeGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Product type *']),
        typeSelect
      ]);

      // When group (am, pm, both)
      const initialWhen = manualFormState.when || recomputeWhenForType({ type: initialType, ingredients: [] }, initialType)[0] || 'both';
      const whenSelect = el('select', {
        className: 'form-select',
        id: 'new-prod-when',
        onchange: (e) => {
          manualFormState.when = e.target.value;
          manualFormState.whenCustomized = true;
        }
      }, [
        el('option', { value: 'both', selected: initialWhen === 'both' ? 'selected' : undefined }, ['Morning and Night']),
        el('option', { value: 'am', selected: initialWhen === 'am' ? 'selected' : undefined }, ['Morning only']),
        el('option', { value: 'pm', selected: initialWhen === 'pm' ? 'selected' : undefined }, ['Night only'])
      ]);

      const whenGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['In your routine']),
        whenSelect
      ]);

      // Opened date (YYYY-MM-DD)
      const defaultOpened = manualFormState.opened || formatDateString(new Date());
      const openedGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Opened date *']),
        el('input', {
          className: 'form-input',
          type: 'date',
          value: defaultOpened,
          id: 'new-prod-opened'
        }),
        el('div', { className: 'form-error-msg', id: 'error-prod-opened' })
      ]);

      // PAO months (3, 6, 12, 24)
      const initialPao = String(manualFormState.paoMonths || 12);
      const paoGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Best within (open-jar number)']),
        el('select', { className: 'form-select', id: 'new-prod-pao' }, [
          el('option', { value: '3', selected: initialPao === '3' ? 'selected' : undefined }, ['3 months']),
          el('option', { value: '6', selected: initialPao === '6' ? 'selected' : undefined }, ['6 months']),
          el('option', { value: '12', selected: initialPao === '12' ? 'selected' : undefined }, ['12 months']),
          el('option', { value: '24', selected: initialPao === '24' ? 'selected' : undefined }, ['24 months'])
        ])
      ]);

      // Ingredients (optional, comma-separated, max 50 items, max 100 chars each)
      const ingGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Ingredients (optional, comma-separated)']),
        el('input', {
          className: 'form-input',
          id: 'new-prod-ingredients',
          placeholder: 'e.g. Glycerin, Colloidal oatmeal',
          value: manualFormState.ingredients || '',
          oninput: (e) => {
            const ingVal = e.target.value;
            manualFormState.ingredients = ingVal;
            const currentType = (document.getElementById('new-prod-type') || {}).value || 'Cleanser';
            const whenSelect = document.getElementById('new-prod-when');
            if (whenSelect && !manualFormState.whenCustomized) {
              const dummyProd = { type: currentType, ingredients: ingVal.split(',').map(s => s.trim()).filter(Boolean) };
              const recomputed = recomputeWhenForType(dummyProd, currentType);
              whenSelect.value = recomputed[0] || 'both';
              manualFormState.when = whenSelect.value;
            }
          }
        }),
        el('div', { className: 'form-error-msg', id: 'error-prod-ingredients' })
      ]);

      // Storage failure banner
      const storageErrorBox = el('div', {
        className: 'form-error-msg',
        id: 'error-prod-storage'
      });

      const saveBtn = el('button', {
        className: 'btn-primary',
        onclick: () => {
          // Clear error elements
          const errNameEl = document.getElementById('error-prod-name');
          const errBrandEl = document.getElementById('error-prod-brand');
          const errOpenedEl = document.getElementById('error-prod-opened');
          const errIngEl = document.getElementById('error-prod-ingredients');
          const errStorageEl = document.getElementById('error-prod-storage');
          if (errNameEl) errNameEl.textContent = '';
          if (errBrandEl) errBrandEl.textContent = '';
          if (errOpenedEl) errOpenedEl.textContent = '';
          if (errIngEl) errIngEl.textContent = '';
          if (errStorageEl) errStorageEl.textContent = '';

          const nameVal = (document.getElementById('new-prod-name').value || '').trim();
          const brandVal = (document.getElementById('new-prod-brand').value || '').trim();
          const typeVal = document.getElementById('new-prod-type').value;
          const whenVal = document.getElementById('new-prod-when').value;
          const openedVal = (document.getElementById('new-prod-opened').value || '').trim();
          const paoVal = parseInt(document.getElementById('new-prod-pao').value, 10) || 12;
          const ingRaw = (document.getElementById('new-prod-ingredients').value || '').trim();

          // Sync current form state so nothing is lost if invalid or save fails
          manualFormState = {
            name: nameVal,
            brand: brandVal,
            type: typeVal,
            when: whenVal,
            opened: openedVal,
            paoMonths: paoVal,
            ingredients: ingRaw
          };

          let hasError = false;

          // 1. Name validation
          if (!nameVal) {
            if (errNameEl) errNameEl.textContent = 'Give it a name so you know which one it is.';
            hasError = true;
          } else if (nameVal.length > 80) {
            if (errNameEl) errNameEl.textContent = 'That name is a bit too long. Keep it under 80 letters.';
            hasError = true;
          }

          // 2. Brand validation
          if (brandVal.length > 60) {
            if (errBrandEl) errBrandEl.textContent = 'That brand name is too long. Keep it under 60 letters.';
            hasError = true;
          }

          // 3. Opened date validation
          if (!isValidDateString(openedVal)) {
            if (errOpenedEl) errOpenedEl.textContent = 'Put in a real opened date like YYYY-MM-DD.';
            hasError = true;
          } else {
            const todayStr = isDemo ? formatDateString(TODAY) : formatDateString(new Date());
            if (openedVal > todayStr) {
              if (errOpenedEl) errOpenedEl.textContent = "You couldn't have opened it in the future, sis.";
              hasError = true;
            }
          }

          // 4. Ingredients validation
          let parsedIngs = [];
          if (ingRaw) {
            const rawParts = ingRaw.split(',').map(s => s.trim()).filter(Boolean);
            if (rawParts.length > 50) {
              if (errIngEl) errIngEl.textContent = "That's a lot of ingredients! Keep it under 50 items.";
              hasError = true;
            } else {
              parsedIngs = rawParts.map(s => s.slice(0, 100));
            }
          }

          if (hasError) return;

          // Build product object
          const newProduct = {
            id: 'p_' + Date.now(),
            name: nameVal,
            brand: brandVal || '',
            type: typeVal,
            when: [whenVal],
            freq: null,
            ingredients: parsedIngs,
            does: '',
            opened: openedVal,
            paoMonths: paoVal,
            status: 'active',
            addedVia: 'manual',
            createdAt: new Date().toISOString()
          };

          // If in demo mode, update in-memory products only (never touch storage)
          if (isDemo) {
            products.unshift(newProduct);
            manualFormState = {};
            showToast('On the shelf. Cute.');
            addFlowStep = 'select';
            currentTab = 'shelf';
            updateNavState();
            renderApp();
            return;
          }

          // Real shelf mode: persist to ShelfStore
          const saved = window.ShelfStore && typeof window.ShelfStore.addProduct === 'function'
            ? window.ShelfStore.addProduct(newProduct)
            : false;

          if (!saved) {
            if (errStorageEl) {
              errStorageEl.textContent = "Your phone couldn't save that. Check if storage is full.";
            }
            showToast("Your phone couldn't save that. Check if storage is full.");
            return;
          }

          // Success
          products = window.ShelfStore.getShelf();
          manualFormState = {};
          showToast('On the shelf. Cute.');
          addFlowStep = 'select';
          currentTab = 'shelf';
          updateNavState();
          renderApp();
        }
      }, ['Save to my shelf']);

      const cancelBtn = el('button', {
        className: 'btn-secondary',
        onclick: () => {
          manualFormState = {};
          addFlowStep = 'select';
          renderApp();
        }
      }, ['Start over']);

      formBox.appendChild(nameGroup);
      formBox.appendChild(brandGroup);
      formBox.appendChild(typeGroup);
      formBox.appendChild(whenGroup);
      formBox.appendChild(openedGroup);
      formBox.appendChild(paoGroup);
      formBox.appendChild(ingGroup);
      formBox.appendChild(storageErrorBox);
      formBox.appendChild(saveBtn);
      formBox.appendChild(cancelBtn);
      container.appendChild(formBox);

    } else if (addFlowStep === 'type_input') {
      container.appendChild(createGreetingBubble(
        "I can't see the ingredients, so I won't guess them. Paste them or snap the label and I'll tell you more."
      ));

      const formBox = el('div', { className: 'add-flow-container' });

      const nameGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['What is it called?']),
        el('input', {
          className: 'form-input',
          placeholder: 'e.g. Squalane facial oil',
          id: 'type-name-input'
        })
      ]);

      const lookUpBtn = el('button', {
        className: 'btn-primary',
        onclick: () => {
          const val = document.getElementById('type-name-input').value.trim() || 'Custom facial tincture';
          products.unshift({
            id: 'prod-' + Date.now(),
            name: val.length > 18 ? val.substring(0, 16) + '...' : val,
            fullName: val,
            brand: 'Unspecified Brand',
            type: 'moisturizer',
            typeName: 'Moisturizer',
            slot: 'both',
            stepOrder: 5,
            badge: null,
            whatItDoes: 'General skin barrier replenishment and conditioning.',
            openedDate: '2026-10-02',
            bestWithinMonths: 12,
            useByDate: '2027-10-02',
            warning: 'Ingredients not logged. Snap or paste label to check conflicts.',
            ingredients: [
              { name: 'Unknown ingredients', note: 'Not logged yet. Snap bottle label to populate.' }
            ]
          });
          showToast('On the shelf. Cute.');
          addFlowStep = 'select';
          currentTab = 'shelf';
          updateNavState();
          renderApp();
        }
      }, ['Add to shelf anyway']);

      const backBtn = el('button', {
        className: 'btn-secondary',
        onclick: () => {
          addFlowStep = 'select';
          renderApp();
        }
      }, ['Back']);

      formBox.appendChild(nameGroup);
      formBox.appendChild(lookUpBtn);
      formBox.appendChild(backBtn);
      container.appendChild(formBox);
    }

    return container;
  }

  // 4. ABOUT SCREEN
  function renderAboutScreen() {
    const container = el('div');
    container.appendChild(createHeader());
    container.appendChild(createGreetingBubble(
      "One sister built this for the other, so she could keep track of her shelf and stop answering the same serum questions in the group chat."
    ));

    const aboutWrapper = el('div', { className: 'shelf-section' });

    // Story Card
    const storyCard = el('div', { className: 'about-story-card' }, [
      el('div', { className: 'story-quote' }, ['"What order do these go in again?"']),
      el('p', { className: 'story-paragraph' }, [
        "Gemma reads labels and explains products. Routine order, warnings, and shelf life come from fixed rules, not the model."
      ])
    ]);

    // Device & Home Screen Notes (PRD Gate C MUST)
    const deviceNote = el('div', { className: 'info-note-card' }, [
      el('p', {}, ["Your shelf lives on this phone only, so it won't show up on your other devices. Use Back up to move it to a new phone."]),
      el('p', { className: 'info-note-subtext' }, ["Add this page to your Home Screen so your phone doesn't clear it."])
    ]);

    // Backup Actions
    const saveBackupBtn = document.createElement('button');
    saveBackupBtn.className = 'btn-primary';
    saveBackupBtn.type = 'button';
    saveBackupBtn.appendChild(document.createTextNode('Save a backup file'));
    saveBackupBtn.addEventListener('click', () => {
      if (isDemo) { showToast('This is a demo shelf. Nothing you add here is saved.'); return; }
      if (!products.length) { showToast('Nothing on your shelf to back up yet.'); return; }
      try {
        const ok = window.ShelfStore.exportBackup();
        if (!ok) { showToast('Your phone couldn\'t save that. Check if storage is full.'); return; }
        showToast('Backup saved. Keep it somewhere safe.');
      } catch(e) { showToast('Your phone couldn\'t save that. Check if storage is full.'); }
    });

    // Hidden file input for restore
    const restoreInput = document.createElement('input');
    restoreInput.type = 'file';
    restoreInput.accept = '.json';
    restoreInput.style.display = 'none';
    restoreInput.addEventListener('change', () => {
      const file = restoreInput.files && restoreInput.files[0];
      if (!file) return;
      if (file.size > 1048576) { showToast('That file isn\'t a Two Sisters backup. Nothing changed.'); restoreInput.value = ''; return; }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        try {
          const result = window.ShelfStore.validateBackup(reader.result);
          if (!result.valid) { showToast('That file isn\'t a Two Sisters backup. Nothing changed.'); return; }
          const doRestore = () => {
            try {
              const saved = window.ShelfStore.saveShelf(result.items);
              if (!saved) { showToast('Your phone couldn\'t save that. Check if storage is full.'); return; }
              products = window.ShelfStore.getShelf();
              showToast('Your shelf is back.');
              currentTab = 'shelf';
              updateNavState();
              renderApp();
            } catch(e) { showToast('Your phone couldn\'t save that. Check if storage is full.'); }
          };
          if (products.length > 0) {
            const ok = window.confirm('This replaces what\'s on your shelf now. Restore the backup?');
            if (ok) doRestore();
          } else {
            doRestore();
          }
        } catch(e) { showToast('That file isn\'t a Two Sisters backup. Nothing changed.'); }
        restoreInput.value = '';
      });
      reader.readAsText(file);
    });

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'btn-secondary';
    restoreBtn.type = 'button';
    restoreBtn.appendChild(document.createTextNode('Restore from a backup'));
    restoreBtn.addEventListener('click', () => {
      if (isDemo) { showToast('This is a demo shelf. Nothing you add here is saved.'); return; }
      restoreInput.click();
    });

    const backupActions = document.createElement('div');
    backupActions.className = 'backup-actions-group';
    backupActions.appendChild(saveBackupBtn);
    backupActions.appendChild(restoreInput);
    backupActions.appendChild(restoreBtn);

    // Maker & Credits
    const creditsCard = el('div', { className: 'credits-card' }, [
      el('p', {}, ['Made by La Shara Cordero for her little sister. More of my work at clewlabs.org.']),
      el('p', { className: 'credits-subtext' }, ['Powered by Gemma 4. Hero painting generated with Gemini.'])
    ]);

    // Full Medical Note
    const disclaimerCard = el('div', { className: 'disclaimer-card' }, [
      el('strong', { className: 'disclaimer-heading' }, ['A note on medicine:']),
      document.createTextNode("I know skincare, not medicine. If something's irritated, see a dermatologist. Two Sisters Tinctures explains products. It doesn't diagnose skin conditions, and it doesn't check for allergies.")
    ]);

    // Clear my shelf (PRD Gate C MUST)
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-danger';
    clearBtn.type = 'button';
    clearBtn.appendChild(document.createTextNode('Clear my shelf'));
    clearBtn.addEventListener('click', () => {
      if (isDemo) { showToast('This is a demo shelf. Nothing you add here is saved.'); return; }
      const ok = window.confirm("This removes everything on this phone. Back up first if you want to keep it. Clear it?");
      if (ok) {
        try {
          const cleared = window.ShelfStore.clearShelf();
          if (!cleared) { showToast('Your phone couldn\'t save that. Check if storage is full.'); return; }
        } catch(e) { showToast('Your phone couldn\'t save that. Check if storage is full.'); return; }
        products = [];
        showToast('Clean slate.');
        currentTab = 'shelf';
        updateNavState();
        renderApp();
      }
    });
    const clearSection = document.createElement('div');
    clearSection.className = 'clear-shelf-section';
    clearSection.appendChild(clearBtn);

    aboutWrapper.appendChild(storyCard);
    aboutWrapper.appendChild(deviceNote);
    aboutWrapper.appendChild(backupActions);
    aboutWrapper.appendChild(creditsCard);
    aboutWrapper.appendChild(disclaimerCard);
    aboutWrapper.appendChild(clearSection);
    container.appendChild(aboutWrapper);

    return container;
  }

  // Tab Management
  function updateNavState() {
    ['shelf', 'routine', 'add', 'about'].forEach(tab => {
      const btn = document.getElementById(`tab-${tab}`);
      if (btn) {
        if (tab === currentTab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
  }

  document.getElementById('tab-shelf').addEventListener('click', () => {
    currentTab = 'shelf';
    updateNavState();
    renderApp();
  });

  document.getElementById('tab-routine').addEventListener('click', () => {
    currentTab = 'routine';
    updateNavState();
    renderApp();
  });

  document.getElementById('tab-add').addEventListener('click', () => {
    currentTab = 'add';
    addFlowStep = 'select';
    updateNavState();
    renderApp();
  });

  document.getElementById('tab-about').addEventListener('click', () => {
    currentTab = 'about';
    updateNavState();
    renderApp();
  });

  // Master Render Loop
  function renderApp() {
    try {
      mainContent.replaceChildren();
      let screenNode;

      if (currentTab === 'shelf') {
        screenNode = renderShelfScreen();
      } else if (currentTab === 'routine') {
        screenNode = renderRoutineScreen();
      } else if (currentTab === 'add') {
        screenNode = renderAddScreen();
      } else if (currentTab === 'about') {
        screenNode = renderAboutScreen();
      }

      if (screenNode) {
        mainContent.appendChild(screenNode);
      }
      mainContent.scrollTop = 0;
    } catch (err) {
      console.error('Render error:', err);
      const errBox = document.getElementById('render-error-box');
      if (errBox) {
        errBox.classList.add('visible');
        errBox.replaceChildren();
        errBox.appendChild(el('h3', {}, ['Unable to render shelf view']));
        errBox.appendChild(el('p', {}, [String(err.message || err)]));
      }
    }
  }

  // Boot sequence: URL query parameter check for ?demo=1 or load from storage
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') {
    loadDemoShelf();
  } else {
    products = (window.ShelfStore && typeof window.ShelfStore.getShelf === 'function')
      ? window.ShelfStore.getShelf()
      : [];
    isDemo = false;
    ensureRulesLoaded().then(() => {
      renderApp();
    });
  }

})();
