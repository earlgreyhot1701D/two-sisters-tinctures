# FINDINGS.md: Two Sisters Tinctures

The ledger. Every finding gets an entry, especially failures. No code is discarded before its entry exists. Wrong versions stay on purpose, because the correction is the interesting part.

Entry shape:
```
### <date> | Block <n> | <short title>
Question:
Finding:
Disposition: discard | promote | shelve (branch, commit)
```

---

### Oct 2 | Planning | On-device Gemma dropped
Question: Can Gemma run in the browser on her phone?
Finding: Possible on iOS 26 with WebGPU, but memory limits vary and I can't test her iPhone before the deadline. A tiered fallback made the AI optional, which undercut "open-source AI at the core."
Disposition: shelve. On-device model is a STUB.

### Oct 2 | Planning | Self-hosted Gemma on Render dropped
Question: Can Ollama on Render serve Gemma for the build weekend?
Finding: Render compute is CPU only. The plan sized for the model costs about $2.83 to $5.83 a day, so $10 of credit covers about 1.7 to 3.5 days. Ollama has no auth, so it would need a private service.
Disposition: shelve. `MODEL_PROVIDER=ollama` is a STUB.

### Oct 2 | Planning | Gemini API free tier rejected
Question: Is the free tier fine for her photos?
Finding: On the free tier, Google uses inputs to improve its products and human reviewers may read them. The paid tier does not use prompts for that.
Disposition: paid tier only. Free tier never sees her data.

### Oct 2 | Planning | Model size changed
Question: Is Gemma 4 E2B on the Gemini API?
Finding: The API serves `gemma-4-26b-a4b-it` and `gemma-4-31b-it`, not E2B.
Disposition: use 26B A4B. Confirm current in Block 0.

### Oct 2 | Design | Stitch fonts and template details
Question: Is the Stitch layout on-brand?
Finding: Round 1 used Cormorant Garamond plus Plus Jakarta Sans, which repeated the serif-sign, sans-menu mismatch. It also had ALL CAPS, italics, emoji, cream, and a hotlinked hero image. Round 3 fixed fonts, caps, italics, and colors. The hero is still hotlinked, so the build serves `hero.webp` locally.
Disposition: mockup v4 is the source of truth. Stitch round 3 is reference for the frame, memos, and nav.

### Oct 2 | Design | Third type voice
Question: Why did v3 feel jarring?
Finding: Display serif plus modern sans read as two shops. Libre Caslon Text shares the Fell types' print lineage and reads well on screens.
Disposition: IM Fell DW Pica plus Libre Caslon Text, no italics.

### Oct 2 | Block 0 | Gemma 4 26B on Gemini API spike
Question: Does gemma-4-26b-a4b-it respond with valid JSON cards under 5 s on the Gemini API?
Finding: The model is active and current on the Gemini API. Schema and JSON parsing succeed completely with correct fields (`kind: "skincare"`, `type: "Serum"`, valid ingredients, and friendly summary). However, Gemma 4 outputs internal chain-of-thought tokens (`thought: true` parts) prior to the final JSON payload. Filtering out thought parts yields pure JSON. Response time was 17.68 s (longer than the initial 5 s target due to deep reasoning steps, but safely inside the 20 s timeout limit defined in PRD Gate C). The model does not accept disabling thinking budgets via `thinkingBudget: 0`.
Disposition: promote findings to Block 3 (`server/gemma.js` must filter thought parts and accommodate ~17-18 s latency).

### Oct 2 | Block 1 | UI with mock data & memory-only demo mode
Question: Does the pure-DOM UI faithfully match mockup v4 and Stitch round 3 while maintaining a strictly empty default shelf and in-memory demo isolation?
Finding: The cabinet frame, paper-styled drawer fronts with brass knobs, drawer flags ("Past its prime" and "Use soon"), memos below cabinet (conflicts, expiry, doubles), and three-way bottom nav (Shelf, Routine, About) render smoothly using native DOM APIs (`textContent` and `createElement` only; zero `innerHTML`). In demo mode (`loadDemoShelf` / `?demo=1`), 10 mock products with non-real brand names load directly into memory and display the exact `demo.banner` line ("This is a demo shelf. Nothing you add here is saved."). Because no localStorage or sessionStorage is used, refreshing immediately resets to the voiced empty state ("Your shelf's empty, sis. Let's fix that.").
Disposition: promote to Block 1b / Block 2.

### Oct 2 | Block 1 | Design source of truth changed from mockup-v4 to Stitch round 3
Question: Which design artifact serves as the single visual source of truth?
Finding: Design source of truth changed from mockup-v4 to Stitch round 3 (`design/stitch-round3.html`). The layout adopts the Stitch 4-tab bottom nav (Shelf, Routine, Add, About), the full brass apothecary chest, memos below the chest, the "Little sister says:" avatar speech bubble, and dedicated screen views for each tab. Missing PRD Gate C MUST controls (Edit, Used it up, Remove from shelf, Finished section, doubles memo, manual add link, paste textarea, opened/pao inputs, and full About disclaimers with Clear my shelf) are integrated in the Stitch visual style.
Disposition: promote.

### Oct 2 | Block 1b | First Render deploy
Question: Does the Blueprint deploy cleanly and load on a phone?
Finding: Blueprint created one Starter web service (0.5c-512mb, $7/mo, oregon) from commit 125ee19. The first Blueprint check showed "a Blueprint file was found, but there was an issue" with no detail; clicking Retry once cleared it. The first deploy took 40.3 s and went Live. Samsung check: loads and looks right. iPhone 11 and her sister's phone: demo loads and works. Promo credit of $50 redeemed to My Workspace, valid until Sep 30 2027. Render docs do not explain how promo credits are applied, so this is unconfirmed beyond what the redeem page said. Secrets not yet set (Block 3). Second deploy (00a67e3) took 28.6 s via Auto-Deploy on push. Rollback practice skipped for MVP; untested.
Disposition: promote. Rollback practice and iPhone check still open.

### Oct 3 | Block 3 | Gold set, first runs
Question: Does Gemma read real ingredient lists, inside the timeout, with valid output?
Finding: Run 1 scored 0 of 5, all 30 s timeouts. Sending `thinkingLevel: "MINIMAL"` (forum-reported, not in official docs) cut each read to 6 to 10 s. Run 2 scored 1 of 5: three reads were rejected by my own length checks (real ingredient names run past 60 characters, one was 93 with a role tag), and one CeraVe cleanser was typed as a Moisturizer because the pasted list had no product name.
Disposition: promote. Length limits widened to 50 items of 100 characters, over-long fields trimmed instead of failing, rejected reads now log a reason code. The cleanser miss stays honest: the confirm screen lets her fix the type.

### Oct 3 | Block 3 | Gold set, final numbers
Question: Does the paste path meet the bar of 4 of 5 on real labels?
Finding: With a product name on the paste screen, 5 of 5 (6 to 10 s each). Ingredients only, 3 of 5 on two runs. The misses are type guesses (BYOMA serum and CeraVe cleanser both read as Moisturizer). One earlier bare run scored 1 of 5 because three answers came back in a shape the reader rejected; the reader now unwraps lists and double-encoded answers and logs the shape. The model also has run-to-run variance, so a score can move by one.
Disposition: promote. Optional name box stays. Block 3 closed.

### Oct 3 | Block 4 | Live checks
Question: Do the Gate G4 proofs hold on the live URL?
Finding: Key not in any served file. CSP, HSTS, nosniff and frame-ancestors present. /healthz 200. A real paste read took 2.8 s. Rapid repeat requests get a friendly 429 after 4 to 6 per minute. One hole found: the per-visitor cap trusted the first X-Forwarded-For entry, which a client can write, so 8 requests with made-up addresses all got through. The total daily cap still bounded the spend.
Disposition: shelve as a known limit. Using the last entry did not stop the bypass on the live site (9 fake addresses still all got through), and Render's own reply says the real client is first, so I put the first entry back. A visitor who writes a fake header can dodge the 10 a day per-visitor cap. The total cap of 50 a day still bounds spend, and the budget alert is the backstop. Say so plainly in the post.

### Oct 3 | Lookup | Tavily search and extract, Open Beauty Facts (dashboard checks, not built)
Question: Could the app find ingredients from a product name or a product page, so she does not have to type them?
Finding: Tavily search for two gold products (BYOMA Hydrating Serum, Supergoop Unseen Sunscreen SPF 50) returned the right list from a trustworthy page (Ulta, supergoop.com) in about 1 s on basic and about 6 s on advanced. The same results also held an older SPF 40 formula, a page that listed another product's ingredients, and one page that named niacinamide in a serum that has none. Tavily extract on the Ulta BYOMA page returned the full list intact (the 0.02 s time looks cached). The page text is about 3000 characters, near our 4000 limit. Open Beauty Facts: free barcode lookup API confirmed, data under ODbL, name search and skincare coverage not verified.
Disposition: stub. Two products and one retail page is not enough to trust. Web text is untrusted. It needs a second key and the Tavily trial ends Oct 19. Barcode and URL paths are stubs in PRD Gate C. Our server must never fetch a user-supplied URL itself.

### Oct 3 | Logic | Classification, conflict, and ingredient match fixes
Question: Why were daytime SPF products and hydrating serums falsely classified as Night only with phantom conflict warnings?
Finding: Loose substring matching on ingredient names matched benign ingredients (e.g. Capryloyl Salicylic Acid matching salicylic acid; Lactic Acid appearing at position 20 as a pH adjuster in BYOMA Serum). Furthermore, comma splitting broke compound names like 1,2-Hexanediol, and daytime products triggered nighttime conflict memos. Centralized ingredient normalization and matching in `public/ingredient-match.js` with rules in `public/rules.json`:
1. Acids are position-limited using an explicit rule-of-thumb cutoff (top 10 ingredients per `rules.positionLimited.limit`). Retinoids are checked at any position.
2. Cleansers wash off and bypass acid night overrides.
3. SPF backstop: Sunscreen type or name containing SPF + number is strictly morning (`['am']`).
4. Normalized matching strips percentages/strengths (e.g. `2%`, `0.3%`), removes parentheticals, and normalizes dashes. Comma splitter uses negative lookahead (`/\s*,\s*(?!\d)/`) to protect numbers like `1,2-Hexanediol`.
5. Conflicts and shelf mix alerts only trigger between products that can both be used at night.
Disposition: promote. Rules centralized in `rules.json`.

