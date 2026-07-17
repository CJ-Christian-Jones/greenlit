# GREENLIT Arcade V38.5

V38.5 is a complete six-step movie-studio arcade loop with live, hybrid, and offline data modes, installable as a PWA on phone, tablet, and desktop. The V38.4 Balance & Consequence pass connects the visible campaign, budget, and production choices to the actual release economics; the V38.5 pass adds a home-screen-installable shell and a repo-wide mobile safe-area/tap-target pass on top of it, without changing the runtime underneath.

## Mobile / PWA

- `manifest.webmanifest`, `service-worker.js`, and `offline.html` make the game installable and give it an offline-capable app shell. The service worker only ever caches the shell (HTML/CSS/JS/manifest) — it does not intercept TMDB requests, so live-data behavior offline is unchanged and still owned by `js/v37/data-service.js`'s existing hybrid/offline modes.
- The TMDB token remains user-supplied and stored per-browser (see `token()` in `js/app.js`); there is no shared secret to protect, so no backend proxy was introduced. See `GREENLIT_Mobile_PWA_Technical_Plan_v2.docx` for when that would change.
- `icons/` holds the home-screen icon set (192/512/512-maskable/Apple touch), themed from the `:root` palette in `css/app.css`.

## Code layout

The project stays build-free, but the current runtime is separated by ownership:

- `index.html` defines the authoritative script order.
- `js/v37/` owns the bundled catalog, data modes, cache, and persisted state foundation.
- `js/v38/` owns V38 save migration, portraits, and the production decision ledger.
- `js/app.js` owns the shared simulator and the six-screen arcade runtime.
- `css/app.css` contains shared foundations followed by feature-specific sections, ending with the additive V38.5 PWA/mobile-safety section.
- `service-worker.js`, `manifest.webmanifest`, `offline.html`, `icons/` — the PWA shell; independent of the arcade runtime's load order.
- `CODE_MAP.md` lists the active renderer chain and the safest edit points.

Historical version labels remain only where the code is still an active compatibility layer. Retired Balance Lab renderers and styles were removed; the live V38 Budget Lab and package audit are the only registered balance interface.

## Current features

- Removed the premature module render.
- Added one authoritative render at the bottom of `app.js`, after every override is defined.
- Replaced the five cramped source-movie posters with an active hero and four responsive movie banners.
- Combined composer and cinematographer discovery into one bounded six-film pass with a 16-second deadline and retry state.
- Replaced the separate artist columns with three seeded packages, each pairing one real composer and one real cinematographer based on their career fit.
- Added tier, career-credit, style-emphasis, package-fee, and combined-fit information to every package.
- Added one full package reroll and made one click hire both artists through the existing simulation fields.
- Made loading ownership runtime-only so an interrupted or saved request cannot restore as a permanent loader.
- Limited movie-detail and artist-profile processing to two concurrent responses, yielding between batches so Chrome remains interactive during scouting.
- Preserved `styleCrew` object identity during state normalization so a completed async scout updates the state the renderer actually reads.
- Added Studio Pulse consequence feedback and a current-package live balance audit.
- Connected campaign fit, package tolerance, production calls, and release-era rivals to the active simulator.
- Uses `?v=38.5` cache-busting parameters on the CSS and JavaScript links.
- Corrected simulation invariants for auditions, awards, rankings, and the 52-week release curve.
- Added async request deduplication, stale-render guards, and recoverable crew-loading errors.
- Added a deterministic Node regression harness for the core cleanup fixes.

Run locally with:

```bash
python -m http.server
```

Run the regression harness in PowerShell with:

```powershell
node tests/cleanup-regression.cjs
node tests/code-organization-regression.cjs
node tests/v37-foundation-regression.cjs
node tests/v38-portrait-regression.cjs
node tests/v38-decision-ledger-regression.cjs
```
