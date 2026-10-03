# VOICE.md: Two Sisters Tinctures

Every line the app says, in one place. The app speaks as **my little sister**, who knows skincare better than I do. She says **"sis,"** never "big sis," because either of us might be holding the phone.

**Rules**
- Voice is flavor. Facts, order, and warnings come from `rules.json`. No line contradicts them.
- Agents copy lines from here by ID. They never write new ones. If a screen needs a line, propose it here first.
- No em dashes. No ALL CAPS. `{curly}` words are filled in by code.
- **Every line needs her OK before it ships.** Check the box once she approves.

## Shelf
| ID | Where | Line | Her OK |
|---|---|---|---|
| `greet` | Hero bubble | Your whole skincare shelf, in one place, sis. I'll tell you what goes where, what not to mix, and when to toss it. | [ ] |
| `empty` | Empty shelf | Your shelf's empty, sis. Let's fix that. | [ ] |
| `empty.add` | Empty shelf button | Add your first product | [ ] |
| `demo.button` | Empty shelf | Try the demo shelf | [ ] |
| `demo.banner` | Demo mode | This is a demo shelf. Nothing you add here is saved. | [ ] |
| `demo.exit` | Demo mode | Leave the demo | [ ] |
| `count` | Below tagline | {n} products on your shelf | [ ] |
| `flag.past` | Drawer flag | Past its prime | [ ] |
| `flag.soon` | Drawer flag | Use soon | [ ] |
| `finished.title` | Finished list | Finished | [ ] |

## Memos
| ID | Headline | Line | Her OK |
|---|---|---|---|
| `memo.mix` | Don't mix tonight: {a} and {b} | Pick one, or your moisture barrier will send me angry texts. | [ ] |
| `memo.past` | Past its shelf life: {name} | It's been open {months} months, and it's best within {pao}. Time to let it go. | [ ] |
| `memo.soon` | Use up soon: {name} | Best by {date}. Give it a good spot on the shelf. | [ ] |
| `memo.double` | Two of a kind: {type}s | Fine, if one's for morning and one's for night. | [ ] |

## Tagline strip
| ID | Line | Her OK |
|---|---|---|
| `tag.1` | Thinnest to thickest. | [ ] |
| `tag.2` | Sunscreen is always last. | [ ] |
| `tag.3` | Don't mix your retinol and your acids. | [ ] |
| `tag.4` | Patch test the new stuff. | [ ] |
| `tag.5` | Open it, date it. | [ ] |

## Routine
| ID | Where | Line | Her OK |
|---|---|---|---|
| `routine.am` | Morning lede | {n} steps. Thinnest to thickest, sunscreen last. Always. | [ ] |
| `routine.pm` | Night lede | {n} steps. Thinnest to thickest, then bed. | [ ] |
| `routine.alt` | Conflict note | {a} and {b} are both on your night list. Take turns: one night each, never together. | [ ] |
| `routine.alt.tag` | Step tag | Alternate nights | [ ] |
| `reason.cleanser.am` | Cleanser AM reason | Wakes skin up and cleans off overnight oils. | [ ] |
| `reason.cleanser.pm` | Cleanser PM reason | Removes pollution and sunscreen before skincare goes on. | [ ] |
| `reason.toner` | Toner reason | Preps damp skin so your serums can go on smoothly. | [ ] |
| `reason.essence` | Essence reason | Lightweight hydration that sinks in before treatment. | [ ] |
| `reason.treatment` | Treatment reason | Targeted active for blemishes, texture, or spot renewal. | [ ] |
| `reason.serum` | Serum reason | Targeted actives soak in while the formula is thin. | [ ] |
| `reason.serum.alt` | Serum alt nights reason | Cell turnover active. Take turns on alternate nights. | [ ] |
| `reason.eye_cream` | Eye cream reason | Thinner skin around the eyes absorbs gently before heavier creams. | [ ] |
| `reason.moisturizer` | Moisturizer reason | Locks in hydration and cushions your skin barrier. | [ ] |
| `reason.facial_oil` | Facial oil reason | Nourishing plant oils seal your night routine. | [ ] |
| `reason.sunscreen` | Sunscreen reason | Sunscreen is always last. Never put moisturizer on top of sunscreen. | [ ] |

## Types
| ID | Type Name | Her OK |
|---|---|---|
| `type.cleanser` | Cleanser | [ ] |
| `type.toner` | Toner | [ ] |
| `type.essence` | Essence | [ ] |
| `type.treatment` | Treatment | [ ] |
| `type.serum` | Serum | [ ] |
| `type.eye_cream` | Eye cream | [ ] |
| `type.moisturizer` | Moisturizer | [ ] |
| `type.facial_oil` | Facial oil | [ ] |
| `type.sunscreen` | Sunscreen | [ ] |
| `type.mask` | Mask | [ ] |
| `type.other` | Other | [ ] |

## Ingredient notes
| ID | Ingredient | Line | Her OK |
|---|---|---|---|
| `ing.colloidal_oatmeal` | Colloidal oatmeal | Calms redness and soothes the skin barrier. | [ ] |
| `ing.glycerin` | Glycerin | Draws water into the outer layer of skin. | [ ] |
| `ing.lauryl_glucoside` | Lauryl glucoside | Mild plant-derived cleanser that doesn't strip. | [ ] |
| `ing.rose_water` | Damask rose distillate | Gentle botanical water that softens skin. | [ ] |
| `ing.sodium_pca` | Sodium PCA | Skin-identical humectant that binds moisture. | [ ] |
| `ing.glycolic_acid` | Glycolic acid | AHA chemical exfoliant for surface skin smoothing. | [ ] |
| `ing.aloe` | Aloe leaf juice | Hydrating plant juice that cushions active formulas. | [ ] |
| `ing.ascorbic_acid` | L-Ascorbic acid | Pure Vitamin C antioxidant for morning brightness. | [ ] |
| `ing.ferulic_acid` | Ferulic acid | Plant antioxidant that helps keep Vitamin C stable. | [ ] |
| `ing.niacinamide` | Niacinamide | Vitamin B3 that supports barrier strength and oil balance. | [ ] |
| `ing.zinc_pca` | Zinc PCA | Mineral salt that helps balance surface shine. | [ ] |
| `ing.retinol` | Retinol | Vitamin A active that encourages skin renewal. | [ ] |
| `ing.squalane` | Squalane | Weightless skin-friendly oil that softens and cushions. | [ ] |
| `ing.caffeine` | Caffeine | Plant extract that temporarily depuffs the eye area. | [ ] |
| `ing.centella` | Centella asiatica | Herb that calms and supports sensitive skin. | [ ] |
| `ing.copper_peptides` | Copper tripeptide-1 | Amino acid peptide that supports skin resilience. | [ ] |
| `ing.shea_butter` | Shea butter | Rich plant butter that softens dry patches. | [ ] |
| `ing.ceramides` | Ceramides | Key lipids that keep the skin barrier intact. | [ ] |
| `ing.cholesterol` | Cholesterol and fatty acids | Natural skin lipids that complement ceramides. | [ ] |
| `ing.zinc_oxide` | Zinc oxide | Mineral sunscreen active that reflects UV rays. | [ ] |
| `ing.bisabolol` | Bisabolol | Chamomile-derived extract that calms irritation. | [ ] |
| `ing.salicylic_acid` | Salicylic acid | BHA oil-soluble exfoliant that clears pores. | [ ] |
| `ing.lactic_acid` | Lactic acid | Gentle AHA that exfoliates and hydrates. | [ ] |
| `ing.hyaluronic_acid` | Hyaluronic acid | Humectant that holds water on the skin surface. | [ ] |
| `ing.jojoba_oil` | Jojoba oil | Lightweight botanical oil close to skin's own sebum. | [ ] |
| `ing.rosehip_oil` | Rosehip seed oil | Plant oil rich in fatty acids and antioxidants. | [ ] |
| `ing.water` | Water | The base of most formulas. It carries everything else. | [ ] |
| `ing.butylene_glycol` | Butylene glycol | A solvent that helps other ingredients mix in and keeps the formula feeling smooth. | [ ] |
| `ing.propanediol` | Propanediol | A plant-derived solvent that helps ingredients dissolve and adds a little moisture. | [ ] |
| `ing.dimethicone` | Dimethicone | A silicone that gives a smooth, slippery feel and helps seal in moisture. | [ ] |
| `ing.cetearyl_alcohol` | Cetearyl alcohol | A fatty alcohol that thickens creams. It isn't the drying kind of alcohol. | [ ] |
| `ing.cetyl_alcohol` | Cetyl alcohol | A fatty alcohol that thickens creams. It isn't the drying kind of alcohol. | [ ] |
| `ing.stearyl_alcohol` | Stearyl alcohol | A fatty alcohol that thickens creams. It isn't the drying kind of alcohol. | [ ] |
| `ing.phenoxyethanol` | Phenoxyethanol | A preservative that keeps bacteria and mold out of the formula. | [ ] |
| `ing.ethylhexylglycerin` | Ethylhexylglycerin | Softens the feel of the formula and helps the preservative work. | [ ] |
| `ing.caprylyl_glycol` | Caprylyl glycol | Adds a little moisture and helps preserve the formula. | [ ] |
| `ing.caprylic_capric_triglyceride` | Caprylic/capric triglyceride | A light oil from coconut that softens skin without feeling heavy. | [ ] |
| `ing.xanthan_gum` | Xanthan gum | A thickener that keeps the formula from separating. | [ ] |
| `ing.carbomer` | Carbomer | A thickener that gives gels and creams their body. | [ ] |
| `ing.tocopherol` | Tocopherol | Vitamin E. An antioxidant that also helps protect the formula. | [ ] |
| `ing.panthenol` | Panthenol | Vitamin B5. Helps skin hold moisture and feel softer. | [ ] |
| `ing.allantoin` | Allantoin | Soothes and softens skin. | [ ] |
| `ing.urea` | Urea | Draws in water and gently loosens dry, rough skin. | [ ] |
| `ing.phytosphingosine` | Phytosphingosine | A fat found in skin. Works with ceramides to support the skin barrier. | [ ] |
| `ing.stearic_acid` | Stearic acid | A fatty acid that softens skin and thickens the formula. | [ ] |
| `ing.oleic_acid` | Oleic acid | A fatty acid that softens skin and thickens the formula. | [ ] |
| `ing.avobenzone` | Avobenzone | A chemical sun filter that absorbs UVA rays. | [ ] |
| `ing.homosalate` | Homosalate | A chemical sun filter that absorbs UVB rays. | [ ] |
| `ing.octisalate` | Octisalate | A chemical sun filter that absorbs UVB rays. | [ ] |
| `ing.octocrylene` | Octocrylene | A chemical sun filter that absorbs UVB and some UVA, and helps keep other filters steady. | [ ] |
| `ing.titanium_dioxide` | Titanium dioxide | A mineral sun filter that sits on top of skin and reflects UV. | [ ] |
| `ing.citric_acid` | Citric acid | Used in tiny amounts to balance the pH of the formula. | [ ] |
| `ing.sodium_hydroxide` | Sodium hydroxide | Used in tiny amounts to balance the pH of the formula. | [ ] |
| `ing.potassium_phosphate` | Potassium phosphate | Used in tiny amounts to balance the pH of the formula. | [ ] |
| `ing.dipotassium_phosphate` | Dipotassium phosphate | Used in tiny amounts to balance the pH of the formula. | [ ] |
| `ing.disodium_edta` | Disodium edta | Helps keep the formula stable so it lasts. | [ ] |
| `ing.sodium_phytate` | Sodium phytate | Helps keep the formula stable so it lasts. | [ ] |
| `ing.caprylhydroxamic_acid` | Caprylhydroxamic acid | Helps preserve the formula. | [ ] |
| `ing.polysorbate_20` | Polysorbate 20 | Helps oil and water mix. | [ ] |
| `ing.polysorbate_80` | Polysorbate 80 | Helps oil and water mix. | [ ] |
| `ing.peg_40_stearate` | Peg-40 stearate | Helps oil and water mix. | [ ] |
| `ing.ceteareth_20` | Ceteareth-20 | Helps oil and water mix. | [ ] |
| `ing.glyceryl_stearate` | Glyceryl stearate | Helps oil and water mix and softens skin. | [ ] |
| `ing.polyglyceryl_3_diisostearate` | Polyglyceryl-3 diisostearate | Helps oil and water mix. | [ ] |
| `ing.sodium_lauroyl_lactylate` | Sodium lauroyl lactylate | Helps oil and water mix. | [ ] |
| `ing.sodium_stearoyl_glutamate` | Sodium stearoyl glutamate | Helps oil and water mix. | [ ] |
| `ing.cetearyl_glucoside` | Cetearyl glucoside | Helps oil and water mix. | [ ] |
| `ing.sorbitan_oleate` | Sorbitan oleate | Helps oil and water mix. | [ ] |
| `ing.lecithin` | Lecithin | Helps oil and water mix and softens skin. | [ ] |
| `ing.hydrogenated_lecithin` | Hydrogenated lecithin | Helps oil and water mix and softens skin. | [ ] |
| `ing.behentrimonium_methosulfate` | Behentrimonium methosulfate | A conditioning ingredient that makes creams feel soft and smooth. | [ ] |
| `ing.fragrance` | Fragrance | Adds scent. Can bother sensitive skin. | [ ] |
| `ing.alcohol_denat` | Alcohol denat. | A fast-drying alcohol. It can dry out or sting sensitive skin. | [ ] |
| `ing.silica` | Silica | Gives a smooth, matte feel and soaks up a little oil. | [ ] |
| `ing.dipotassium_glycyrrhizate` | Dipotassium glycyrrhizate | From licorice root. Helps calm skin. | [ ] |
| `ing.hydroxyacetophenone` | Hydroxyacetophenone | Helps preserve the formula and calm skin. | [ ] |
| `ing.palmitoyl_tripeptide_1` | Palmitoyl tripeptide-1 | A peptide, a short chain of amino acids, used in anti-aging products. | [ ] |
| `ing.palmitoyl_tetrapeptide_7` | Palmitoyl tetrapeptide-7 | A peptide, a short chain of amino acids, used in anti-aging products. | [ ] |
| `ing.retinal` | Retinal | A strong vitamin A that works faster than retinol. Start slowly. | [ ] |

## Add
| ID | Where | Line | Her OK |
|---|---|---|---|
| `add.title` | Add sheet | Ooh, what'd you get? | [ ] |
| `add.paste` | Option | Paste the ingredients | [ ] |
| `add.paste.sub` | Option detail | Copy them from the box or the brand's website. | [ ] |
| `add.typed` | Option | Type the name | [ ] |
| `add.typed.sub` | Option detail | For the one everybody's talking about in the group chat. | [ ] |
| `add.photo` | Option | Snap the label | [ ] |
| `add.photo.sub` | Option detail | A photo of the back of the bottle works best. | [ ] |
| `add.manual` | Link | I'll just type it in myself | [ ] |
| `reading.title` | Loading | Let me read this label | [ ] |
| `reading.sub` | Loading | Hang on, this takes a few seconds… | [ ] |
| `confirm.title` | Confirm | Here's what I see | [ ] |
| `confirm.info` | Confirm | Gemma read this from your {source}. Fix anything I got wrong before you save. | [ ] |
| `confirm.missing` | Missing field | Couldn't read this | [ ] |
| `typed.noguess` | Typed result | I can't see the ingredients, so I won't guess them. Paste them and I'll tell you more. | [ ] |
| `notskincare` | Wrong photo | That doesn't look like a skincare product. Try another one? | [ ] |
| `timeout` | Too slow | That label's being shy. Try again or type it in. | [ ] |
| `photo.bad` | Unreadable photo | That photo's being difficult. Try another one, or paste the ingredients instead. | [ ] |
| `error.generic` | Any failure | Something went sideways on my end. You can still add it by hand. | [ ] |
| `error.ratelimit` | Too many tries | Slow down, sis. Try again in a minute. | [ ] |
| `error.offline` | No signal | No signal right now. You can still add it by hand. | [ ] |
| `error.name.required` | Validation | Give it a name so you know which one it is. | [ ] |
| `error.name.toolong` | Validation | That name is a bit too long. Keep it under 80 letters. | [ ] |
| `error.brand.toolong` | Validation | That brand name is too long. Keep it under 60 letters. | [ ] |
| `error.date.invalid` | Validation | Put in a real opened date like YYYY-MM-DD. | [ ] |
| `error.date.future` | Validation | You couldn't have opened it in the future, sis. | [ ] |
| `error.ingredients.toomany` | Validation | That's a lot of ingredients! Keep it under 50 items. | [ ] |
| `error.storage.full` | Storage | Your phone couldn't save that. Check if storage is full. | [ ] |

## Toasts
| ID | When | Line | Her OK |
|---|---|---|---|
| `toast.added` | Saved | On the shelf. Cute. | [ ] |
| `toast.edited` | Edited | Fixed it. | [ ] |
| `toast.finished` | Used it up | Finished. Look at you using things up. | [ ] |
| `toast.restored` | Back from Finished | Back on the shelf. | [ ] |
| `toast.removed` | Removed | Gone. | [ ] |
| `toast.undo` | Undo button | Undo | [ ] |
| `toast.backup` | Backup saved | Backup saved. Keep it somewhere safe. | [ ] |
| `toast.restore` | Restore done | Your shelf is back. | [ ] |
| `toast.restore.bad` | Bad file | That file isn't a Two Sisters backup. Nothing changed. | [ ] |
| `toast.cleared` | Shelf cleared | Clean slate. | [ ] |
| `toast.backup.empty` | Backup with empty shelf | Nothing on your shelf to back up yet. | [ ] |
| `restore.confirm` | Restore confirm dialog | This replaces what's on your shelf now. Restore the backup? | [ ] |

## Detail sheet
| ID | Line | Her OK |
|---|---|---|
| `detail.does` | What it does | [ ] |
| `detail.in` | What's in it | [ ] |
| `detail.routine` | In your routine | [ ] |
| `detail.life` | Shelf life | [ ] |
| `detail.nonote` | No note for this one yet. | [ ] |
| `detail.mix` | Don't use on the same night as {name}. Together they can irritate. | [ ] |
| `detail.finish` | Used it up | [ ] |
| `detail.remove` | Remove from shelf | [ ] |
| `detail.fine` | Gemma explained this from the ingredient list. Ingredient notes come from our own list, not the model. | [ ] |
| `finished.restore` | Put back on the shelf | [ ] |

## About
| ID | Line | Her OK |
|---|---|---|
| `about.story` | One sister built this for the other, so she could keep track of her shelf and stop answering the same serum questions in the group chat. | [ ] |
| `about.how` | Gemma reads labels and explains products. Routine order, warnings, and shelf life come from fixed rules, not the model. | [ ] |
| `about.device` | Your shelf lives on this phone only, so it won't show up on your other devices. Use Back up to move it to a new phone. | [ ] |
| `about.homescreen` | Add this page to your Home Screen so your phone doesn't clear it. | [ ] |
| `about.limit` | To keep the free demo running, label reading is limited to 10 a day per person. Adding by hand is unlimited. | [ ] |
| `about.medical` | I know skincare, not medicine. If something's irritated, see a dermatologist. Two Sisters Tinctures explains products. It doesn't diagnose skin conditions, and it doesn't check for allergies. | [ ] |
| `about.maker` | Made by La Shara Cordero for her little sister. More of my work at clewlabs.org. | [ ] |
| `about.credits` | Powered by Gemma 4. Hero painting generated with Gemini. | [ ] |
| `backup.title` | Back up your shelf | [ ] |
| `backup.save` | Save a backup file | [ ] |
| `backup.restore` | Restore from a backup | [ ] |
| `clear.button` | Clear my shelf | [ ] |
| `clear.confirm` | This removes everything on this phone. Back up first if you want to keep it. Clear it? | [ ] |

## Manual Add Form
| ID | Line | Her OK |
|---|---|---|
| `add.manual.bubble` | Add it by hand, sis. Fill in what you know and we'll put it in your routine. | [ ] |
| `add.form.name` | Product name * | [ ] |
| `add.form.brand` | Brand | [ ] |
| `add.form.type` | Product type * | [ ] |
| `add.form.when.both` | Morning and Night | [ ] |
| `add.form.when.am` | Morning only | [ ] |
| `add.form.when.pm` | Night only | [ ] |
| `add.form.opened` | Opened date * | [ ] |
| `add.form.pao` | Best within (open-jar number) | [ ] |
| `add.form.ingredients` | Ingredients (optional, comma-separated) | [ ] |
| `add.form.save` | Save to my shelf | [ ] |
| `add.form.cancel` | Start over | [ ] |

## Server fallbacks (general lines by type)
| ID | Line | Her OK |
|---|---|---|
| `does.general.cleanser` | Washes off the day, or the night, so everything after it can do its job. | [ ] |
| `does.general.toner` | A light step after cleansing that preps your skin for what comes next. | [ ] |
| `does.general.essence` | A thin, watery layer that adds a little moisture before your serum. | [ ] |
| `does.general.treatment` | A targeted step for one specific concern. Go slow and watch how your skin feels. | [ ] |
| `does.general.serum` | A concentrated step that goes on before your moisturizer. | [ ] |
| `does.general.eye_cream` | A gentle moisturizer made for the thin skin around your eyes. | [ ] |
| `does.general.moisturizer` | Helps hold moisture in and keeps your skin comfortable. | [ ] |
| `does.general.facial_oil` | Helps seal in moisture. Usually goes on last at night. | [ ] |
| `does.general.sunscreen` | Protects your skin from the sun. Goes on last in the morning. | [ ] |
| `does.general.mask` | A once-in-a-while step. Follow the directions on the box. | [ ] |
| `does.general.other` | Something on your shelf that doesn't fit the usual steps. | [ ] |

## Read flow (Block 3 step 11)
| ID | Line | Her OK |
|---|---|---|
| `error.daily` | I've read a lot of labels today, sis. Try again tomorrow, or add it by hand. | [ ] |
| `error.paste.toolong` | That's too long. Keep it under 4,000 letters. | [ ] |
| `error.paste.empty` | Paste something first, sis. | [ ] |
| `error.typed.empty` | Type a name first, sis. | [ ] |
| `photo.notready` | Photo reading isn't ready yet. Paste the ingredients or type it in. | [ ] |
| `typed.button` | Look it up | [ ] |
| `add.paste.name` | Product name (optional) | [ ] |
| `add.choose.tip` | Pasting takes a minute longer, but it unlocks ingredient notes and conflict warnings. Typing is the quick way. | [ ] |
| `add.paste.help` | Replaced by `add.paste.best.*` rows below | [x] |
| `add.typed.help` | This is the quick way. You'll get the type and a spot in your routine, but no ingredient notes or conflict warnings. Paste the ingredients instead if you want those. | [ ] |
| `reading.cancel` | Cancel | [ ] |
| `add.snap.soon` | Snap card badge | Coming soon | [ ] |
| `detail.edit.soon` | Edit details button toast | Editing is coming soon. | [ ] |
| `add.paste.best.title` | Paste tip summary | How to get the best read | [ ] |
| `add.paste.best.name` | Paste tip line 1 | Type the product name in the box below so I can place it in the right routine step. | [ ] |
| `add.paste.best.copy` | Paste tip line 2 | Copy the full ingredients list from the brand's or store's product page. | [ ] |
| `add.paste.best.search` | Paste tip line 3 | No list on the box? Search the product name plus 'ingredients'. | [ ] |
| `gap.sunscreen` | Gap hint | No sunscreen in your morning routine yet. | [ ] |
| `gap.cleanser` | Gap hint | No cleanser on your shelf yet to wash the day off. | [ ] |
| `gap.moisturizer` | Gap hint | No moisturizer on your shelf yet to seal in hydration. | [ ] |
| `gap.dismiss` | Gap hint dismiss button | Got it | [ ] |

