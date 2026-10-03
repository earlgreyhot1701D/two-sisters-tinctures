# AGENTS.md: Two Sisters Tinctures

Standing rules for every agent session in this repo. Read this, then `PRD.md`, then the current block in `TASKS.md`.

## What this is
A skincare shelf tracker for my little sister. She adds a product by pasting ingredients, typing a name, or snapping the label. Gemma 4 reads and explains. Plain code decides routine order, morning or night, warnings, and expiry. Her shelf lives on her phone only.

## How you work
- **Propose first.** Describe the change and the files it touches. Wait for my approval before implementing.
- **One block at a time.** Only work on the block marked In progress in `TASKS.md`.
- **DO NOT refactor other code.** Touch only the files this block names.
- **DO NOT add dependencies** unless this block names them. Check that any dependency is current and not deprecated before proposing it.
- **If the spec and reality disagree, stop and report.** Do not work around it.
- **Respect the tier** stated in the prompt. Spike: no tests, no README, no pinning, no files outside `spike/`. Working: happy path plus known edge cases. Full: the 11-point checklist in PRD Gate H.
- When a block passes, update `TASKS.md`. Record anything surprising in `FINDINGS.md` before deleting any code.
- When the done line in PRD Gate B is met, stop building.

## Security, non-negotiable
- **Never put API keys in this chat, the repo, or the frontend.** Keys live in Render environment variables. `.env` is gitignored.
- **Mock data only in this chat.** This session may be published as a DevRelay transcript.
- `textContent` and `createElement` only. **Never `innerHTML` or `eval()`.**
- try/catch on every fetch and every storage call. Every error state shows a line from `VOICE.md`, never a blank screen.
- Validate on the client **and** the server: types, lengths, sizes, schema. Backup files are untrusted input.
- Never log photos, pasted ingredient text, or keys. Log status, timing, and error codes only.
- Label text and pasted text go to the model as data, never as instructions.

## Product rules
- The model **never** decides routine order, morning or night, warnings, or expiry. Those come from `public/rules.json`.
- The model **never** invents ingredients. A missing field shows "Couldn't read this."
- One product list feeds drawers, memos, and routine. One name per product, everywhere.
- The app starts **empty**. Demo data loads from `public/demo-shelf.json` into memory only, on "Try the demo shelf" or `?demo=1`. Demo never touches her saved shelf.
- Manual entry always works, even when the model is down.

## Deployment
- Read `DEPLOY.md` before touching anything that affects the Render service.
- The server listens on `process.env.PORT` at `0.0.0.0`. `GET /healthz` returns 200 and does nothing else: no model call, no storage.
- `package-lock.json` stays committed. `render.yaml` and `.node-version` are the only places hosting config lives.
- **Never run `git push` without asking me first.** Auto-deploy is on, so a push goes live.
- Never set or change Render environment variables, and never edit `render.yaml`, without proposing the change first.

## Design
- `design/stitch-round3.html` is the visual source of truth.
- Fonts: IM Fell DW Pica (wordmark, product names, titles, 20px and up) and Libre Caslon Text (everything else). No italics. No ALL CAPS. Sizes 13, 15, 17, 20, 28, 36, 56 only.
- Colors: only the palette in PRD Gate D.
- **All user-facing copy comes from `VOICE.md`.** Do not write new lines. If a screen needs one, propose it and wait.
- No em dashes in any copy.

## File map (one file, one responsibility)
```
public/index.html        markup only
public/styles.css        all styles
public/app.js            UI and screen flow
public/rules.json        facts, order, defaults, conflicts
public/shelf-store.js    storage, backup, restore, clear
public/photo.js          shrink, strip location (Block 5)
public/demo-shelf.json   demo data
server/index.js          routes, static files, headers
server/limits.js         rate limit, daily caps, size caps
server/validate.js       schema and source checks
server/gemma.js          model call (MODEL_PROVIDER switch)
render.yaml              Render Blueprint (hosting config)
DEPLOY.md                deploy, rollback, and troubleshooting steps
package.json             start script, dependencies
.node-version            Node version, matches the laptop
```

## Prompt footer (expect this on every prompt)
```
Tier: <Spike|Working|Full>. <tier prohibitions>.
Definition of done: <PASS line>.
DO NOT refactor other code. DO NOT add dependencies unless this block names them.
If the spec and reality disagree, stop and report.
Never put API keys in this chat. Mock data only.
Risk level: <low|medium|high>. Propose first. Wait for approval.
```
