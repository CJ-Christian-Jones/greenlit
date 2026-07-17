# GREENLIT V38.5 code map

This project deliberately runs without a bundler. Use this map to find the current owner of a feature without following every historical compatibility layer.

## Browser load order

`index.html` loads files in this order:

1. `js/v37/catalog.js` — bundled movies and real-person fallback records.
2. `js/v37/data-service.js` — offline, hybrid, and live request routing.
3. `js/v37/state-core.js` — V37 save boundary and state sanitization.
4. `js/v38/state-core.js` — V38 migration and crew-readiness rules.
5. `js/v38/portrait-service.js` — bounded portrait/profile enrichment.
6. `js/v38/decision-ledger.js` — seeded production dilemmas and effects.
7. `js/core/screen-registry.js` — immutable screen registry creation/selection for boot safety.
8. `js/app.js` — simulator, screens, interactions, analytics, and final boot.

The order is significant because `app.js` consumes the services exposed by the earlier scripts.

## PWA shell (independent of the script load order above)

`manifest.webmanifest`, `service-worker.js`, `offline.html`, and `icons/` were added in V38.5. They are registered from an inline script at the bottom of `index.html`, after the arcade scripts, and do not participate in the `GreenlitV37`/`GreenlitV38` namespace or the boot render. The service worker only caches the app shell — it deliberately never intercepts requests to `api.themoviedb.org`, so it cannot be the cause of a stale or incorrect TMDB response; that logic still lives entirely in `js/v37/data-service.js`.

## `js/app.js` search anchors

| Search for | Responsibility |
| --- | --- |
| `DOM HELPERS AND STATIC GAME DATA` | Shared constants, project scales, and basic helpers |
| `CENTRAL BALANCE TUNING` | Core economics and outcome tuning |
| `SAVE SYSTEM` | Run state, migrations, save/load, and reset |
| `TMDB API AND TEMPORARY CACHE` | Live requests, request sharing, and local cache |
| `PRODUCTION, AWARDS AND RELEASE SIMULATION` | Reception, gross, economics, awards, and final result model |
| `USER INTERFACE PAGES` | Shared navigation, sidebar, and original page foundations |
| `MODAL INFRASTRUCTURE` | Shared modal host used by current data and budget tools |
| `ARCADE FLOW OVERRIDES` | Six-screen state and common arcade interactions |
| `FINAL CONSOLIDATED CASTING PAGE` | Current cast-draft experience |
| `GREENLIT V34` | Secondary genres, affordability, and current Budget Lab |
| `GREENLIT V35` | Current crew/style, release, and results pages |
| `AUTHORITATIVE APPLICATION BOOT` | V38 live audit, final screen registry, and the only boot render |

Historical version names in this file are not archives. The remaining ones are live compatibility layers or data migrations, so remove one only after proving that the final renderer or simulator no longer captures it.

## Active screen ownership

| Step | Active entry point | Notes |
| --- | --- | --- |
| Pick Movie | `v34ProjectPage` | Wraps the active movie/year selection chain and secondary-genre controls |
| Cast | `v35HirePage` | Wraps the consolidated poster-and-hero casting chain with tier and source-movie refinements |
| Crew & Style | `v35ProductionPage` | Adds real creative-duo packages and the V38 decision ledger |
| Marketing | `v32MarketingPage` | Campaign strategy, spend forecast, and confirmation |
| Release | `v35ReleasePage` | 52-week theatrical story and original-film benchmark |
| Results | `v35ResultsPage` | Scorecard, why analysis, awards, leaderboard, and career record |
| Balance Lab | `v38BalanceModal` | Wraps `v34BudgetLabModal` with the live package audit |

`ACTIVE_*_PAGE` aliases feed `V38_SCREEN_REGISTRY`, and the final `render()` call at the bottom of `js/app.js` is the authoritative boot boundary.

## `css/app.css` search anchors

Start with `:root` for shared colors and spacing, then search for the feature version named in the active-screen table. The current budget interface begins at `GREENLIT V34`, and V38-specific diagnostics are grouped at the end of the file. Styles for retired V20–V33 Balance Lab interfaces are intentionally absent.

## Tests

- `tests/cleanup-regression.cjs` exercises shared runtime invariants.
- `tests/code-organization-regression.cjs` prevents retired interfaces from returning and verifies the current boot path.
- `tests/v37-foundation-regression.cjs` covers data modes, bundled records, reset, and state safety.
- `tests/v38-portrait-regression.cjs` covers portrait priority, enrichment, and request limits.
- `tests/v38-decision-ledger-regression.cjs` covers seeded choices and balanced consequences.
- `tests/v38-browser-smoke.html` and `tests/v38-browser-smoke.js` drive the real browser flow.
