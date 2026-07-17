# GREENLIT Arcade Changelog

## V38.5 — PWA & Mobile Safe-Area Pass

- Added `manifest.webmanifest`, home-screen icons, and `service-worker.js` so the game installs to a phone or tablet home screen and launches in standalone display mode.
- Added `offline.html`, shown only when a device has no cached shell and no network; the live TMDB search limitation is stated plainly rather than failing silently.
- The service worker caches only the app shell (HTML/CSS/JS/manifest) and never intercepts TMDB or other cross-origin requests, so cached/offline behavior for live data is unchanged and still owned by `js/v37/data-service.js`.
- Added safe-area-inset padding, `#app`/image overflow guards, and a 44px tap-target minimum below 600px, additive to the existing 47 component-level breakpoints in `css/app.css`.
- Bumped browser asset cache busting to `v=38.5`.
- Superseded `TMDB_Mobile_Game_Technical_Plan.docx` with `GREENLIT_Mobile_PWA_Technical_Plan_v2.docx`, scoped to this repository's actual architecture rather than a generic static-site migration.

## V38.4 — Balance & Consequence Pass

- Made campaign fit affect worldwide gross, opening, audience response, and final economics within a bounded ±6% range.
- Connected talent-package tolerance, savings rewards, and severe overage penalties to the live budget calculation.
- Centered the 30 production dilemmas around genuine tradeoffs and removed the remaining mathematically dominant response.
- Made production calls move market outlook and fixed costs by a restrained amount, then carry those changes into profit, outcome, awards, and the result screen.
- Added a Studio Pulse that follows the latest production consequence through the run.
- Replaced player-relative offline rivals with independent release-era market baselines.
- Added a live Balance Lab audit that reruns the exact current package through the real V38 simulator for 50–500 fresh outcomes.
- Added reduced-motion handling for the new feedback animation.
- Bumped browser asset cache busting to `v=38.4`.

## V36–V38 foundation

- Fixed the trace-confirmed infinite artist-scout restart loop caused by replacing the `styleCrew` object while an asynchronous request still owned it.
- Stopped repeated full-page DOM replacement that grew the recorded page from roughly 603,000 to 2.4 million nodes.
- Bumped browser asset cache busting to `v=36.6`.
- Prevented Chrome's `Page Unresponsive` state during creative-duo scouting by processing movie and artist responses in batches of two.
- Yielded to the browser between scouting batches while preserving the existing deadline and Retry behavior.
- Bumped browser asset cache busting to `v=36.5`.
- Replaced the separate composer/cinematographer pickers with three complete creative-duo packages.
- Paired one unique real composer and cinematographer per package using seeded career, genre, craft, and reliability fit.
- Added artist tiers, career credits, creative emphases, combined fit, and total package fee to each choice.
- Added one full-package reroll that reuses the loaded real-artist pools and clears the prior choice.
- Prevented persisted `styleCrew.loading` data from restoring a loader without a live request.
- Bumped browser asset cache busting to `v=36.4`.
- Replaced the cramped five-poster casting selector with a cinematic active-movie hero and four clickable movie banners.
- Made movie selection update the hero immediately from the already-loaded source pool.
- Replaced separate sequential composer/cinematographer scans with one shared six-film credit pass.
- Added a 16-second artist-draft deadline that always resolves to candidates or a visible Retry state.
- Bumped browser asset cache busting to `v=36.3`.
- Defaulted secondary genre to the selected movie's second supported genre.
- Fixed the Cast screen's candidate-pool rebuild loop.
- Added 12-second TMDB request timeouts and parallelized independent discovery work.
- Reduced person-detail hydration from ten to six actors per source while retaining five source movies.
- Corrected audition, awards, release-curve, release-year, and competition-rank calculations.
- Prevented stale async casting renders and duplicate in-flight API requests.
- Added explicit retry handling for failed crew drafts and protected reroll tokens on failure.
- Escaped release-story content, deferred non-critical images, and removed duplicate saves.
- Added deterministic cleanup regression checks in `tests/cleanup-regression.cjs`.
- Fixed Step 3 initially rendering the obsolete `Roll the crew. Set the style.` / Fast Creative Call interface.
- Removed the premature `render()` invocation that occurred before later renderer overrides were declared.
- Added a single final boot render after all V35 functions are registered.
- Added asset cache busting so Live Server does not reuse an older JavaScript or CSS file.
