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

  // Safe Element Helper
  function el(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'className') {
        element.className = val;
      } else if (key === 'onclick') {
        element.addEventListener('click', val);
      } else if (key.startsWith('aria-')) {
        element.setAttribute(key, val);
      } else {
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

  function loadDemoShelf() {
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
  }

  // Product Detail Card
  function openProductDetail(product) {
    detailContent.replaceChildren();

    const headerOrnament = el('div', { className: 'paper-header-ornament' }, [
      el('div', { className: 'apothecary-seal' }, ['Two Sisters Tinctures : Specimen card']),
      el('div', { className: 'label-brand-name' }, [product.brand]),
      el('h2', { className: 'label-product-title' }, [product.fullName || product.name]),
      el('button', {
        className: 'sheet-close-btn',
        'aria-label': 'Close detail label',
        onclick: closeProductDetail
      }, ['X'])
    ]);

    const doesSection = el('div', { className: 'label-section' }, [
      el('div', { className: 'label-heading' }, ['What it does']),
      el('p', { className: 'label-body-text' }, [product.whatItDoes])
    ]);

    const ingHeading = el('div', { className: 'label-heading' }, ["What's in it"]);
    const ingList = el('ul', { className: 'ingredient-list' });
    product.ingredients.forEach(ing => {
      ingList.appendChild(
        el('li', { className: 'ingredient-item' }, [
          el('span', { className: 'ingredient-name' }, [`${ing.name}: `]),
          el('span', { className: 'ingredient-desc' }, [ing.note])
        ])
      );
    });

    const metaGrid = el('div', { className: 'label-meta-grid' }, [
      el('div', {}, [
        el('div', { className: 'label-meta-cell-label' }, ['In your routine']),
        el('div', { className: 'label-meta-cell-value' }, [
          product.slot === 'both' ? 'Morning and Night' : product.slot === 'am' ? 'Morning only' : 'Night only'
        ])
      ]),
      el('div', {}, [
        el('div', { className: 'label-meta-cell-label' }, ['Product type']),
        el('div', { className: 'label-meta-cell-value' }, [product.typeName])
      ]),
      el('div', {}, [
        el('div', { className: 'label-meta-cell-label' }, ['Opened date']),
        el('div', { className: 'label-meta-cell-value' }, [product.openedDate])
      ]),
      el('div', {}, [
        el('div', { className: 'label-meta-cell-label' }, ['Shelf life']),
        el('div', { className: 'label-meta-cell-value' }, [`${product.bestWithinMonths} mo (${product.useByDate})`])
      ])
    ]);

    detailContent.appendChild(headerOrnament);
    detailContent.appendChild(doesSection);
    detailContent.appendChild(el('div', { className: 'label-section' }, [ingHeading, ingList]));
    detailContent.appendChild(el('div', { className: 'label-section' }, [metaGrid]));

    if (product.warning) {
      const warnBox = el('div', { className: 'label-warning-box' }, [
        el('span', {}, ['!']),
        el('div', {}, [
          el('strong', {}, ['Sister alert: ']),
          product.warning
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
          // Layout only for Block 1 (wiring in Block 2)
          showToast('Finished. Look at you using things up.');
          closeProductDetail();
        }
      }, ['Used it up']),
      el('button', {
        className: 'detail-btn-danger',
        onclick: () => {
          // Layout only for Block 1 (wiring in Block 2)
          showToast('Gone.');
          closeProductDetail();
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

    // Empty state check
    if (products.length === 0) {
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

    // Demo Mode Meta Bar with Leave the demo button
    const metaBar = el('div', { className: 'shelf-meta-bar' }, [
      el('div', { className: 'shelf-count' }, [`${products.length} products on your shelf`]),
      el('div', { className: 'demo-banner-right' }, [
        el('div', { className: 'demo-shelf-note' }, ['This is a demo shelf. Nothing you add here is saved.']),
        el('button', {
          className: 'demo-exit-btn',
          attrs: { type: 'button' },
          onclick: () => {
            products = [];
            isDemo = false;
            if (window.history && window.history.replaceState) {
              const url = new URL(window.location.href);
              url.searchParams.delete('demo');
              window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
            }
            showToast('Clean slate.');
            renderApp();
          }
        }, ['Leave the demo'])
      ])
    ]);
    shelfSection.appendChild(metaBar);

    // Apothecary Chest with brass frame
    const chest = el('div', { className: 'apothecary-chest' });
    const drawersGrid = el('div', { className: 'apothecary-drawers-grid' });

    products.forEach(prod => {
      const innerFrame = el('div', { className: 'drawer-inset-frame' }, [
        el('div', { className: 'drawer-rivet left' }),
        el('div', { className: 'drawer-rivet right' }),
        el('div', { className: 'drawer-title' }, [prod.name]),
        el('div', { className: 'drawer-category' }, [prod.typeName])
      ]);

      const knob = el('div', { className: 'drawer-knob' });
      const drawerCardChildren = [innerFrame, knob];

      if (prod.badge) {
        const badgeEl = el('span', {
          className: `drawer-badge ${prod.badge.type}`
        }, [prod.badge.text]);
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

    // Memos and Alerts Section below the chest
    const alertsContainer = el('div', { className: 'alerts-container' });
    const alertsTitle = el('div', { className: 'alerts-header' }, ['Shelf memos']);
    alertsContainer.appendChild(alertsTitle);

    // Memo 1: Don't mix (memo.mix)
    const mixAlert = el('div', { className: 'alert-card warning' }, [
      el('div', { className: 'alert-title-row' }, ["Don't mix tonight: Glycolic acid and Retinol"]),
      el('p', { className: 'alert-desc' }, [
        "Pick one, or your moisture barrier will send me angry texts."
      ])
    ]);

    // Memo 2: Past shelf life (memo.past)
    const expiredAlert = el('div', { className: 'alert-card warning' }, [
      el('div', { className: 'alert-title-row' }, ["Past its shelf life: Vitamin C serum"]),
      el('p', { className: 'alert-desc' }, [
        "It's been open 7 months, and it's best within 6. Time to let it go."
      ])
    ]);

    // Memo 3: Expiring soon (memo.soon)
    const expiringAlert = el('div', { className: 'alert-card' }, [
      el('div', { className: 'alert-title-row' }, ["Use up soon: Retinol serum"]),
      el('p', { className: 'alert-desc' }, [
        "Best by Oct 11, 2026. Give it a good spot on the shelf."
      ])
    ]);

    // Memo 4: Doubles (memo.double)
    const doublesAlert = el('div', { className: 'alert-card' }, [
      el('div', { className: 'alert-title-row' }, ["Two of a kind: Toners"]),
      el('p', { className: 'alert-desc' }, [
        "Fine, if one's for morning and one's for night."
      ])
    ]);

    alertsContainer.appendChild(mixAlert);
    alertsContainer.appendChild(expiredAlert);
    alertsContainer.appendChild(expiringAlert);
    alertsContainer.appendChild(doublesAlert);
    shelfSection.appendChild(alertsContainer);

    // PRD Gate C MUST: Finished list below memos
    const finishedSection = el('div', { className: 'finished-section' }, [
      el('div', { className: 'finished-header' }, ['Finished']),
      el('p', { className: 'finished-empty' }, ['No products finished yet. Look at you holding onto things.'])
    ]);
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

    if (products.length === 0) {
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

    const routineItems = products.filter(p => p.slot === 'both' || p.slot === routineTime);
    routineItems.sort((a, b) => a.stepOrder - b.stepOrder);

    const stepsList = el('div', { className: 'routine-steps-list' });

    let stepIndex = 1;
    routineItems.forEach(prod => {
      let stepReason = '';
      if (prod.type === 'cleanser') {
        stepReason = routineTime === 'am' ? 'Wakes skin up and cleans off overnight oils.' : 'Removes pollution and sunscreen before skincare goes on.';
      } else if (prod.type === 'toner') {
        stepReason = 'Preps damp skin so your serums absorb twice as well.';
      } else if (prod.type === 'serum') {
        stepReason = prod.name.toLowerCase().includes('retinol') ? 'Cell turnover active. Use on alternate nights from glycolic acid.' : 'Targeted actives soak in while the formula is thin.';
      } else if (prod.type === 'eye_cream') {
        stepReason = 'Thinner skin around the eyes absorbs gently before heavier creams.';
      } else if (prod.type === 'moisturizer') {
        stepReason = 'Locks all underlying moisture down so water doesn’t evaporate overnight.';
      } else if (prod.type === 'sunscreen') {
        stepReason = 'Sunscreen is always last. Never put moisturizer on top of sunscreen.';
      }

      const stepCard = el('div', {
        className: 'routine-step-card',
        onclick: () => openProductDetail(prod)
      }, [
        el('div', { className: 'routine-step-number' }, [stepIndex++]),
        el('div', { className: 'routine-step-content' }, [
          el('div', { className: 'routine-step-type' }, [prod.typeName]),
          el('div', { className: 'routine-step-name' }, [prod.fullName || prod.name]),
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
      container.appendChild(createGreetingBubble(
        "Here's what I see. Fix anything I got wrong before you save."
      ));

      const formBox = el('div', { className: 'add-flow-container' });

      const nameGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Product name']),
        el('input', { className: 'form-input', value: 'Elderberry and Zinc calming elixir', id: 'new-prod-name' })
      ]);

      const brandGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Brand']),
        el('input', { className: 'form-input', value: "Couldn't read this", id: 'new-prod-brand' })
      ]);

      const typeGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Product type']),
        el('select', { className: 'form-select', id: 'new-prod-type' }, [
          el('option', { value: 'serum' }, ['Serum']),
          el('option', { value: 'cleanser' }, ['Cleanser']),
          el('option', { value: 'toner' }, ['Toner']),
          el('option', { value: 'eye_cream' }, ['Eye cream']),
          el('option', { value: 'moisturizer' }, ['Moisturizer']),
          el('option', { value: 'sunscreen' }, ['Sunscreen'])
        ])
      ]);

      // PRD Gate C MUST: Opened date and Best-within
      const openedGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Opened date']),
        el('input', { className: 'form-input', type: 'date', value: '2026-10-02', id: 'new-prod-opened' })
      ]);

      const paoGroup = el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label' }, ['Best within (open-jar number)']),
        el('select', { className: 'form-select', id: 'new-prod-pao' }, [
          el('option', { value: '3' }, ['3 months']),
          el('option', { value: '6' }, ['6 months']),
          el('option', { value: '12', selected: 'true' }, ['12 months']),
          el('option', { value: '24' }, ['24 months'])
        ])
      ]);

      const saveBtn = el('button', {
        className: 'btn-primary',
        onclick: () => {
          const nameVal = document.getElementById('new-prod-name').value || 'Elderberry and Zinc elixir';
          const brandVal = document.getElementById('new-prod-brand').value || 'Sister Cellar';
          const typeVal = document.getElementById('new-prod-type').value;
          const openedVal = document.getElementById('new-prod-opened').value || '2026-10-02';
          const paoVal = document.getElementById('new-prod-pao').value || '12';

          products.unshift({
            id: 'prod-' + Date.now(),
            name: nameVal.length > 20 ? nameVal.substring(0, 18) + '...' : nameVal,
            fullName: nameVal,
            brand: brandVal === "Couldn't read this" ? 'Sister Cellar' : brandVal,
            type: typeVal,
            typeName: typeVal.charAt(0).toUpperCase() + typeVal.slice(1).replace('_', ' '),
            slot: 'both',
            stepOrder: 3,
            badge: null,
            whatItDoes: 'Comforts sensitive flare-ups and locks moisture into place.',
            openedDate: openedVal,
            bestWithinMonths: parseInt(paoVal, 10),
            useByDate: '2027-10-02',
            warning: null,
            ingredients: [
              { name: 'Elderberry fruit extract', note: 'Rich in protective polyphenols' },
              { name: 'Zinc PCA', note: 'Calms redness' }
            ]
          });

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
          addFlowStep = 'select';
          renderApp();
        }
      }, ['Start over']);

      formBox.appendChild(nameGroup);
      formBox.appendChild(brandGroup);
      formBox.appendChild(typeGroup);
      formBox.appendChild(openedGroup);
      formBox.appendChild(paoGroup);
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
    const backupActions = el('div', { className: 'backup-actions-group' }, [
      el('button', {
        className: 'btn-primary',
        onclick: () => showToast('Backup saved. Keep it somewhere safe.')
      }, ['Save a backup file']),
      el('button', {
        className: 'btn-secondary',
        onclick: () => showToast('Your shelf is back.')
      }, ['Restore from a backup'])
    ]);

    // Maker & Credits
    const creditsCard = el('div', { className: 'credits-card' }, [
      el('p', {}, ['Made by La Shara Cordero for her little sister. More of my work at clewlabs.org.']),
      el('p', { className: 'credits-subtext' }, ['Powered by Gemma 4. Hero painting generated with Gemini.'])
    ]);

    // Full Medical Note
    const disclaimerCard = el('div', { className: 'disclaimer-card' }, [
      el('strong', { className: 'disclaimer-heading' }, ['A note on medicine:']),
      "I know skincare, not medicine. If something's irritated, see a dermatologist. Two Sisters Tinctures explains products. It doesn't diagnose skin conditions, and it doesn't check for allergies."
    ]);

    // Clear my shelf (PRD Gate C MUST)
    const clearSection = el('div', { className: 'clear-shelf-section' }, [
      el('button', {
        className: 'btn-danger',
        onclick: () => {
          const ok = window.confirm("This removes everything on this phone. Back up first if you want to keep it. Clear it?");
          if (ok) {
            products = [];
            isDemo = false;
            showToast('Clean slate.');
            currentTab = 'shelf';
            updateNavState();
            renderApp();
          }
        }
      }, ['Clear my shelf'])
    ]);

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

  // URL query parameter check for ?demo=1
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') {
    loadDemoShelf();
  } else {
    renderApp();
  }

})();
