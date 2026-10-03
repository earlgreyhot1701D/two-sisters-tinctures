# TASKS.md: Two Sisters Tinctures

Status key: `[ ]` not started, `[~]` in progress, `[x]` done. Only one block is In progress at a time.
Ship by **Sun Oct 4, 6:00 PM PDT**. Deadline 11:59 PM PDT.
Cut order if behind: photo input, then archive, then edit.

---

## Setup (Shara, before Block 0)
- [ ] New public repo `two-sisters-tinctures`, first commit after Thu Oct 1, 7:00 PM PDT
- [ ] MIT license added
- [ ] DevRelay: read `install.sh`, install, restart Antigravity, sign in with MLH, DEV account linked in MLH profile
- [ ] Gemini API key created, **billing enabled** (paid tier), key restricted to the Gemini API
- [ ] Google Cloud budget alert at $5
- [ ] Rate limits on the key noted in FINDINGS.md
- [ ] Render: Hobby workspace, $10 credit claimed and applied (note amount and expiry in FINDINGS.md)
- [ ] Render: authorized for the `two-sisters-tinctures` repo only
- [ ] Run `node --version` and put the number (no `v`) in `.node-version`
- [ ] Optional: `render blueprints validate render.yaml` (Render CLI v2.7.0 or later)
- [ ] Text her: iOS version (Settings, General, About)
- [ ] Send her `VOICE.md` lines for an OK

---

## Block 0. Spike: Gemma via Gemini API
**Tier:** Spike. **Disposition:** discard. **Status:** [x]
- [x] One flat script in `spike/`, plain `fetch`, key read from env
- [x] Run from **your own terminal**, not the agent chat
- [x] Text test: pasted ingredients in, JSON card out, timed
- [ ] Photo test: one real bottle, timed (optional if text passes)
- [x] Confirm `gemma-4-26b-a4b-it` is current, not deprecated
- [x] FINDINGS.md entry written

**PASS:** text card under 5 s with valid JSON. Photo card under 10 s with the right type.

## Block 1. UI with mock data
**Tier:** Working. **Disposition:** promote. **Status:** [x]
- [x] `public/index.html`, `styles.css`, `app.js` built from `design/stitch-round3.html`
- [x] Hero uses `design/hero.webp`, served from `/public`
- [x] Empty state with her line
- [x] "Try the demo shelf" plus `?demo=1`, loads `demo-shelf.json` into memory only
- [x] Cabinet frame, memos below cabinet, bottom nav (Stitch round 3 source of truth)
- [x] Detail sheet, routine (Morning and Night), About with all PRD copy
- [x] All copy from `VOICE.md`

**PASS:** matches the mockup on your phone. Blank and demo states pass.

## Block 1b. First deploy
**Tier:** Working. **Disposition:** promote. **Status:** [ ]
Do this right after Block 1, before building more. Read `DEPLOY.md` first.
- [x] Unzip design/two-sisters-tinctures-brand.zip into design/brand/, copy the favicon set and apple-touch icon into public/, and add the favicon and apple-touch-icon links to index.html.
- [x] `server/index.js`: serves `/public`, listens on `process.env.PORT` at `0.0.0.0`, `GET /healthz` returns 200, security headers (CSP, HSTS, X-Content-Type-Options, frame-ancestors none)
- [x] `package.json` with a `start` script, `package-lock.json` committed, `.node-version` present
- [x] `render.yaml` in the repo root (already provided)
- [x] Render: New, Blueprint, pick the repo, enter `unset` for the two secrets. Live at https://two-sisters-tinctures.onrender.com (Oct 2, commit 125ee19).
- [x] Live URL tested on your Samsung and her iPhone (screenshot her status). Tested Oct 2 on Samsung, an iPhone 11, and her sister's phone. All PASS.
- [ ] Practice one rollback from the Deploys page, then re-enable auto-deploy
- [ ] FINDINGS.md entry: deploy surprises, load time on a phone

**PASS:** the mock-data app loads at the live URL on both phones. `/healthz` returns 200. Headers present. One rollback worked. No key anywhere.

## Block 2. Rules and shelf storage
**Tier:** Working. **Disposition:** promote. **Status:** [ ]
- [ ] `public/rules.json`: order, default when, ingredient overrides, conflicts, doubles, notes
- [ ] `public/shelf-store.js`: storage key `tst:shelf:v1`, try/catch everywhere
- [ ] Manual add
- [ ] Edit (cut third if behind)
- [ ] Used it up, Finished list, restore (cut second if behind)
- [ ] Remove with 5-second Undo
- [ ] Back up (dated JSON download), Restore with validation, Clear with confirm

**PASS:** real state passes: add 2, refresh, back up, clear, restore. Bad restore file rejected.

## Block 3. Server and Gemma
**Tier:** Full. **Disposition:** promote. **Status:** [ ]
- [ ] `server/index.js`: static files, `POST /api/read`, `GET /healthz`, security headers
- [ ] `server/limits.js`: demo code, per-device and per-IP limits, daily cap, size caps
- [ ] `server/gemma.js`: Gemini call, 20 s timeout, `MODEL_PROVIDER` switch with `ollama` stub
- [ ] `server/validate.js`: schema, lengths, paste verbatim check, typed empty-ingredients rule, mention check
- [ ] Paste and typed paths wired to the confirm screen
- [ ] Gold set of 5 real products saved as fixtures

**PASS:** gold set 4 of 5. Injection label stays clean. Model-off test: manual add still works.

## Block 4. Harden the live deploy
**Tier:** Full. **Disposition:** promote. **Status:** [ ]
The service already exists from Block 1b. Do not push the key through git.
- [ ] `GEMINI_API_KEY` and `DEMO_CODE` set by hand in Dashboard, Environment, then redeploy
- [ ] Google Cloud budget alert and key restriction confirmed
- [ ] Rate limit and daily cap checked on the live URL
- [ ] Every proof in PRD Gate G4

**PASS:** all Gate G4 proofs on the live URL, cold browser, phone and laptop.

## Block 5. Photo input (built last, cut first)
**Tier:** Full. **Disposition:** promote or cut. **Status:** [ ]
- [ ] `public/photo.js`: canvas re-draw, about 1600 px long side, location stripped, one lower-quality retry
- [ ] File picker with camera option, small preview
- [ ] HEIC and unreadable-file message from `VOICE.md`

**PASS:** a real bottle photo returns the right type in under 10 s, and the upload carries no location data.

## Block 6. Her test, video, post
**Status:** [ ]
- [ ] She uses it on her phone. Reaction noted with her OK
- [ ] Video recorded (record-demo-video skill)
- [ ] Auto-deploy switched off in Render Settings, and `autoDeployTrigger: "off"` in `render.yaml`
- [ ] README written, post-deadline commits noted if any
- [ ] DEV post drafted (devto-post skill), **unpublished** until final
- [ ] DevRelay session saved, mock data only
- [ ] Prize categories listed: Gemma, Render
- [ ] Submitted by 6:00 PM PDT
