# DEPLOY.md: Two Sisters Tinctures

How this app gets onto the internet, and how to undo it. Checked against Render's docs on Oct 2 2026.

## What we're deploying
| Item | Decision |
|---|---|
| Host | Render, Hobby workspace ($0) plus one Starter web service (`0.5c-512mb`, $7/month at last check) |
| Shape | One Node service serves the app (`/public`) and the API (`/api/read`). Same origin, so no CORS |
| Region | `oregon` (closest to California, and it cannot be changed later) |
| Why not the free plan | Free services sleep after 15 minutes idle. A judge's first tap would wait on a cold start |
| Secrets | Render dashboard environment variables only. Never in the repo or any agent chat |
| URL | `https://two-sisters-tinctures.onrender.com` (the name in `render.yaml`, if it's free). No custom domain |
| Cost control | Billing is per second, so a suspended service stops costing compute. $10 credit covers about 6 weeks |

## What the code must do (Render requirements)
- Listen on `process.env.PORT` at host `0.0.0.0`. Render sets `PORT`, and local runs fall back to 3000.
- `GET /healthz` returns 200 with no side effects, no model call, no storage.
- `package.json` has a `start` script, and `package-lock.json` is committed (the build runs `npm ci`).
- `.node-version` in the repo root holds your local Node version, from `node --version`, without the `v`. Render reads this file, so Render and your laptop run the same Node. Don't also set `NODE_VERSION`.

## One-time setup (Shara)
1. **Render account**: sign up, choose the Hobby workspace, and apply the Hacktoberfest credit from hacktoberfest.com/my/promos. Note the amount and any expiry in `FINDINGS.md`.
2. **Connect GitHub**: authorize Render, and when GitHub asks which repos, pick **only** `two-sisters-tinctures`.
3. **Validate the Blueprint** (optional): install the Render CLI (v2.7.0 or later) and run `render blueprints validate render.yaml`. Or open `render.yaml` in an editor with the Red Hat YAML extension.
4. **First deploy**: Dashboard, New, Blueprint, pick the repo. Render reads `render.yaml` and prompts for the two secret values. Enter `unset` for both. (Not verified: whether Render lets you leave them blank. If it does, leave them blank.)
5. **Wait for the deploy**, then run the checks below.

## Environment variables
| Key | Where it's set | Notes |
|---|---|---|
| `NODE_ENV`, `MODEL_PROVIDER`, `GEMINI_MODEL`, `DAILY_CAP`, `RATE_LIMIT_PER_MINUTE`, `REQUEST_TIMEOUT_MS`, `MAX_IMAGE_BYTES`, `MAX_TEXT_CHARS` | `render.yaml` | Non-secret. Change them in the file, then push |
| `GEMINI_API_KEY` | Dashboard, Environment, by hand | **Block 3.** Paid-tier key, restricted to the Gemini API |
| `DEMO_CODE` | Dashboard, Environment, by hand | **Block 3.** The code printed in the post. Pick something throwaway |

Render ignores `sync: false` variables after the first Blueprint creation, so secrets added later are always set by hand in the dashboard. After changing an environment variable, redeploy so the running service picks it up.

## Verify after every deploy
Use a cold browser or a private window, not a tab you've already loaded.

| Check | PASS |
|---|---|
| `/healthz` | Returns 200 |
| The app on your Samsung and on her iPhone | Hero, empty state, and "Try the demo shelf" all work |
| Response headers (browser dev tools, Network, click the page request) | CSP, HSTS, X-Content-Type-Options, frame-ancestors present |
| View source | No keys, no secrets |
| Render Logs | No errors, no request bodies |

From Block 3 on, also run every Gate G4 proof in the PRD.

## Rollback
1. Dashboard, your service, **Deploys**.
2. Find the last good deploy and click **Rollback**, then **Rollback to this deploy**.
3. Render starts a new deploy from that deploy's saved build, which is faster than rebuilding.

**Watch out:**
- A rollback from the dashboard **turns off auto-deploy**. That's deliberate, so the next push can't bring the bug back. Turn it back on in Settings once the fix is in.
- A rollback restores the environment variables from the deploy you roll back to. If you rotated a key since then, check it afterward.
- Practice one rollback in Block 1b, while nothing depends on it.

## Freeze at submission (Block 6)
1. In Dashboard, Settings, turn **Auto-Deploy off** so the judged version can't change by accident. Set `autoDeployTrigger: "off"` in `render.yaml` too, so the file matches.
2. Any commit after the deadline is listed in the README.
3. Don't suspend the service until after winners are announced, the week of Oct 5. To stop spending later, suspend it from Settings.

## When something breaks
| Symptom | First look |
|---|---|
| Build fails | Render Logs. Most likely `npm ci` with no `package-lock.json`, or a Node version mismatch |
| Deploy starts, then health check fails | The app isn't listening on `process.env.PORT` at `0.0.0.0`, or `/healthz` is missing |
| Page loads, no styles or images | Static path wrong. Confirm `server/index.js` serves `/public` |
| 502 or timeouts | The service crashed. Read Logs, then roll back |
| `/api/read` returns an error | Missing or wrong `GEMINI_API_KEY` or `DEMO_CODE`, then check the budget alert |
| Spend surprise | Google Cloud budget alert, plus `DAILY_CAP` |
