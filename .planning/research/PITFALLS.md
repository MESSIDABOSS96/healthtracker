# Pitfalls Research — v2.0 Duo Redesign

**Domain:** Adding AI-parsed food entry (browser-direct Claude Haiku + Web Speech voice input), a smart auto-library, a ring-style daily closure, weight trend tracking, and feature removal (PT/steps) to an existing fully-local React 19 + Vite 7 + Dexie 4 PWA (two independent installs, no backend).

**Researched:** 2026-08-08
**Confidence:** HIGH for Dexie/IndexedDB and iOS PWA mechanics (official docs, WebKit bug tracker, Dexie maintainer sources). MEDIUM for LLM-parsing and Web-Speech-in-standalone-PWA specifics (community reports, WebKit bugs, no single authoritative source covers the exact combination). LOW/flagged where noted — verify against both users' actual phones before locking UX.

---

## Critical Pitfalls

### Pitfall 1: API Key Leaks Through Export, Logs, or DevTools — Because It's Client-Side by Design

**What goes wrong:**
The user's Anthropic API key is entered once in Settings and stored on-device (localStorage, Zustand `persist`, or a Dexie `settings` table) so the browser can call Claude Haiku directly. Two ways this leaks beyond "the user's own device, which is fine":
1. The JSON export/backup feature (already a v1 feature, REQ: manual export) walks every Dexie table (or a naive `Object.assign` of all app state) and includes the `settings` row containing the key in plaintext. The user shares that export file for troubleshooting, backs it up to cloud storage (iCloud/Drive), or sends it to the other friend as a "look how this works" — and the key goes with it.
2. Any `console.log`, error-reporting call, or debug overlay that prints request headers/config for the fetch call to Anthropic leaks the key into browser console history, and if a Sentry-style tool is ever added later, into a third-party log store.

**Why it happens:**
Anthropic's `anthropic-dangerous-direct-browser-access: true` header exists specifically to enable this BYOK (bring-your-own-key) pattern — the header name is a literal warning: "anyone with browser dev tools can read the API key in the request." That's an acceptable tradeoff for a single, consenting user calling their own account, but it does not automatically make the export/backup path safe, because export files travel outside the trust boundary the key assumes (this device only).

**How to avoid:**
- Store the API key in its own dedicated table/record, never mixed into a generic `settings` object that a naive `db.export()`-style helper would serialize whole.
- In the export function, explicitly exclude the API key field — build an allowlist of exported tables/fields, not a denylist. Never write `...allSettings` into the export blob.
- On the Settings screen, mask the key (show only last 4 chars) after entry, same pattern as password managers.
- Never log the Anthropic request/response objects directly; log a redacted summary (model, token count, latency) only.
- Document in-app, near the key entry field, that the key never leaves the device except in direct calls to `api.anthropic.com` — set expectations so the user doesn't assume export safety.

**Warning signs:**
- Export JSON contains a `settings` or `config` key with a string starting with `sk-ant-`.
- Grep the codebase for `console.log` near any `fetch`/`anthropic` call before shipping.

**Phase to address:** AI-parsing settings/integration phase — the exclusion rule must be written into the export function's allowlist from the same commit that adds key storage, not bolted on later.

**Severity:** HIGH. Low likelihood (two trusted friends, not attackers) but the failure mode (a $5 credit balance emptied by a leaked key posted somewhere, or embarrassment from a key in a shared file) is entirely avoidable with a one-line exclusion.

---

### Pitfall 2: Web Speech API Silently Breaks Once the App Is Installed to the Home Screen

**What goes wrong:**
Voice input is built and tested in Safari-in-browser during development, works perfectly (`webkitSpeechRecognition` fires `onresult`). The moment the app is added to the iOS home screen — which is exactly the install mode this project needs for `navigator.storage.persist()` to protect against the 7-day IndexedDB wipe (see Pitfall 6 below, carried from v1) — voice input stops working. Multiple independent developer reports describe `webkitSpeechRecognition()` working in Safari tabs but failing (permission denied, no `onresult`, or silent no-op) once the same page runs as a standalone home-screen web app on iOS. This is a WebKit-level gap in the standalone/home-screen web app runtime, not a code bug you can easily patch around.

**Why it happens:**
On iOS, a home-screen web app runs in a different WebKit process/context than Mobile Safari itself and does not carry the same entitlements Safari has for Apple's on-device Speech framework. Native apps that embed WKWebView can fix an analogous issue by adding `NSSpeechRecognitionUsageDescription` to their `Info.plist` — but a pure PWA saved to the home screen has no `Info.plist` to edit, so that fix path does not exist for this project's install model. As of the current WebKit release train (Safari 26 line, mid-2026), fixes have targeted `SpeechRecognition` requiring a secure context, not the standalone-web-app permission gap specifically — there's no confirmed authoritative statement that this is resolved for home-screen PWAs.

**How to avoid:**
- Test on both users' actual iPhones, installed to the home screen, before committing to voice-first UX. Do not trust a Safari-tab test.
- Design voice input as a nice-to-have accelerator, never the only entry path: text input (typed freeform, then parsed the same way) must always be present and equally fast to reach, since the confirmed offline/standalone-safe path is "type your food, tap parse."
- If voice fails silently on `start()`, detect the failure (timeout with no `onresult`/`onerror` after ~2s, or immediate `onerror` with `not-allowed`/`service-not-allowed`) and show an inline fallback message steering the user to type instead — do not leave a spinning mic icon.
- Consider gating the voice feature entirely behind `if (!isStandalone) showVoiceButton()` if on-device testing confirms it's broken standalone, or offer a "open in Safari to use voice" affordance as an explicit workaround rather than a silent failure.
- Re-verify this on each iOS major version bump (WebKit changelogs move fast) rather than assuming a fixed state.

**Warning signs:**
- Voice button works in local dev/browser testing but a beta tester on their installed home-screen app reports "the mic doesn't do anything."
- `SpeechRecognition.onstart` fires but `onresult`/`onerror` never fire when running in `display-mode: standalone`.

**Phase to address:** AI-parsing / voice-input phase. Build the text-parse path first and confirm it's solid; treat voice as an enhancement validated on real installed devices before considering it load-bearing.

**Severity:** HIGH for the voice-input requirement specifically (it may simply not be reliably usable in the installed PWA — this is a platform limitation, not a bug you can code around) but LOW for the product overall since the local structured parser + typed freeform entry fully cover the "speak or type" requirement's fallback half.

---

### Pitfall 3: LLM Macro Hallucination — Unit Confusion and Unvalidated Numbers Silently Corrupt the Log

**What goes wrong:**
The user types or speaks something like "200g chicken, 31g protein per 100g" or "a cup of rice" or "large iced coffee with oat milk." Claude Haiku returns a JSON object with calories/protein/carbs/fat, but LLM nutrition-estimation research (NutriBench and related benchmarks) shows models make three recurring classes of errors: (1) unit confusion — conflating grams and ounces, or per-100g figures with per-serving figures, producing macro numbers off by a factor of ~3.5x or more; (2) confident wrong-but-plausible numbers for ambiguous portion sizes ("a cup," "a handful," "a plate") where the model picks a specific gram weight without flagging the uncertainty; (3) internal arithmetic inconsistency — the returned calorie total doesn't actually match `protein*4 + carb*4 + fat*9`, because the model estimated each macro somewhat independently rather than deriving calories from them.

Because this feeds a calorie/macro tracker driving a daily closure ring, a single bad parse (e.g., "31g protein per 100g chicken" parsed as 31g protein total for a 200g portion instead of 62g) silently skews the day's totals and the trend dashboard, and the user has no reason to suspect it unless they do mental math themselves.

**Why it happens:**
LLMs are pattern-completing on training-data nutrition facts, not running a calculator. They have latent "average calorie density" knowledge that helps when given a mass, but they don't consistently apply dimensional analysis to convert an input unit to the output unit the schema expects.

**How to avoid:**
- Always show a **confirm-before-save** screen after every AI parse: item name, computed macros, and (critically) *the parsed input quantity in original units* so the user can eyeglance-check "200g → X kcal" makes sense before it's saved to the library and the log. Never auto-commit an LLM parse directly to the log.
- Ask Claude to return calories *and* the macro grams, then validate server-side (client-side, since there's no server) that `abs(calories - (protein*4 + carbs*4 + fat*9)) < threshold` (e.g., 15% tolerance for fiber/alcohol edge cases); if it fails, flag the item visually ("double-check this one") rather than silently trusting it.
- Use a strict JSON schema in the prompt (with Zod validation on the response) that requires the model to echo back its interpreted quantity and unit ("interpreted_grams": 200) alongside the macros — this forces the model to state its unit assumption explicitly, which both improves accuracy (chain-of-thought-adjacent) and gives the confirm screen something concrete to display for a sanity check.
- For ambiguous portions ("a cup of rice," "a handful of nuts"), either ask a clarifying follow-up in the parse prompt requesting the model state its assumed gram weight, or default to prompting the user to specify an amount if the input has no explicit quantity/unit.
- Log parses that fail Zod validation or arithmetic-consistency checks to a visible "needs review" state rather than silently discarding or silently accepting.

**Warning signs:**
- Daily total calories swing wildly (e.g., 4,000 kcal on an otherwise normal day) after a single new-item parse — a strong signal of a unit-confusion error.
- User reports "the macros felt wrong" days after logging, when the item is already baked into a trend chart.

**Phase to address:** AI-parsing phase — the confirm-before-save UX and the Zod-validated JSON schema (including model-echoed quantity/unit) must ship together with the first version of AI parsing, not as a later hardening pass.

**Severity:** HIGH. Silent bad macro data undermines the entire point of the tracker and is hard to detect after the fact once it's mixed into trend data.

---

### Pitfall 4: "Removing" PT/Steps Violates the Append-Only Dexie Migration Rule

**What goes wrong:**
v2 explicitly drops PT rehab and steps tracking (per PROJECT.md: "~940 LOC removed"). The natural instinct is to just delete the PT/steps stores from the schema and clean up the code. But `ptSessions` and `stepsLogs` (or equivalent table names) were declared in `db.version(1).stores({...})` — a version block that per the project's own hard rule (CLAUDE.md rule #2) must never be edited. Two specific failure modes:
1. A developer edits the `version(1)` block directly to remove the PT/steps store definitions. Any user (either friend) whose local IndexedDB already ran through version 1 has those object stores physically present on disk; the app's in-memory schema no longer declares them, but Dexie doesn't retroactively delete existing stores just because a later version's code changed — you must explicitly say `ptSessions: null` in a new version block to have Dexie actually drop the store on upgrade. Editing the past version doesn't delete anything on an already-upgraded device; it just risks re-triggering upgrade codepaths inconsistently and diverges from the documented "append-only" contract, making all future migrations unreliable to reason about.
2. Deleting a store and mutating remaining tables in the *same* new version block, or trying to read the to-be-deleted store's data for a one-time carry-forward/archival export *after* nulling it out in the same version's `.stores()` call — Dexie has documented bugs/edge cases here (accessing a store slated for deletion during its own deletion version's upgrade transaction can throw or behave inconsistently depending on Dexie version).

**Why it happens:**
"Remove a feature" mentally maps to "delete the code," but IndexedDB schemas are versioned contracts with existing on-disk data per device. Since this is two independent local installs with no shared backend to reset, any migration mistake is directly user-visible and unrecoverable without their JSON export.

**How to avoid:**
- Add a **new** version block, e.g. `db.version(N+1).stores({ ptSessions: null, stepsLogs: null, ... })`, leaving every prior version block byte-for-byte untouched.
- If any historical PT/step data should be preserved for the export/archive rather than hard-deleted, do that read **in an earlier version's `.upgrade()` handler** (or in application code before calling `db.version(N+1)`), not inside the same version block that nulls the store — per Dexie's own guidance, to-be-deleted stores are accessible during upgrade but the ordering is fragile; do the extraction first, deletion second, in sequential version numbers if there's any doubt.
- Since both users are on fresh v1 installs (v1.0 just shipped 2026-08-08), consider whether these tables even have meaningful data yet — if both installs are essentially empty of PT/steps entries, the safe simple choice is still `stepsLogs: null` in a new version block (never edit the old one), even though data loss risk is near-zero right now — the discipline matters for the next migration, not just this one.
- Update the version-history comment block (already a documented convention per v1 pitfalls research) to log this removal explicitly: version N+1, date, "removed ptSessions/stepsLogs, replaced by cardio check-off model."

**Warning signs:**
- `VersionError` on app open for a returning user.
- Old PT/step object stores still present (visible in browser DevTools → Application → IndexedDB) on a device that "should" have them gone — harmless but confusing if not intentional; confirm this is expected (Dexie leaves the store until a version bump with `null` runs on that device).
- Diffing `git log` on the DB module shows an edit to a `version(1)` (or any historical) block rather than a new appended block.

**Phase to address:** Data-layer / schema-migration phase, first thing done in the v2 rebuild — before any UI work touches the new cardio/weight/library tables, since those additions likely land in the same version bump as the PT/steps removal.

**Severity:** PROJECT-BREAKING if violated on a device with real PT/steps data (undefined Dexie behavior, broken upgrade path); currently LOWER real-world impact only because both installs are brand new, but the *pattern* set here is what every future migration will follow, so get it right now.

---

### Pitfall 5: IndexedDB Transaction Auto-Commit — New Risk Surface from Async LLM Calls Near Writes

**What goes wrong (carried forward from v1, now with a new trigger):**
This is the same root issue documented in v1 research (a `db.transaction()` block that awaits any non-Dexie promise auto-commits early and silently drops subsequent writes), but v2 introduces a new, very tempting way to trigger it: calling `fetch()` to Anthropic's API, or awaiting the Web Speech API's async recognition result, *inside* a Dexie write transaction that's meant to atomically save the parsed food item and update the auto-library dedup index together. Since the AI-parsing flow naturally has "network call → get JSON → save item," a developer moving fast might wrap the whole thing in one `db.transaction('rw', [...], async () => { const result = await callClaude(...); await db.foods.add(result); })` — which breaks the moment the `callClaude` await yields past the transaction's implicit commit point.

**How to avoid:**
- Always resolve the Claude API call (and any Web Speech result) to a plain JS object *before* opening the Dexie transaction. The transaction body should only ever await other Dexie operations.
- Structure the flow as: `const parsed = await callClaude(text)` → `await db.transaction('rw', [foods, foodLibrary], () => { db.foods.add(parsed); db.foodLibrary.put(dedupedEntry); })`.
- This applies equally to the auto-library dedup logic (Pitfall 7 below) which needs a read-then-write inside one transaction to avoid race conditions between concurrent saves — that transaction must not straddle the network call either.

**Warning signs:** Same as v1 — `TransactionInactiveError`/`PrematureCommitError` in console; a parsed item appears to save (network call succeeded, code didn't throw) but is missing from the library on next load.

**Phase to address:** AI-parsing phase, specifically the "save parsed result + update library" code path — this is the single most likely place in v2 to reintroduce this v1-documented bug, because the natural code shape (fetch, then save) invites it.

**Severity:** PROJECT-BREAKING (unchanged from v1) — silent data loss with no thrown error.

---

### Pitfall 6: iOS Safari 7-Day Storage Eviction (Carried Forward, Still Critical — and Now in Tension with Voice Input)

**What goes wrong:** Unchanged from v1 research — Safari evicts all script-writable storage for an origin with no home-screen install and no recent interaction after ~7 days of Safari-browser use. Home-screen-installed PWAs are exempt. This remains true and remains the single highest-severity iOS-specific risk for a fully-local app with no backup source of truth other than manual JSON export.

**New wrinkle for v2:** Pitfall 2 above means the safest storage posture (install to home screen) is the same posture that most likely breaks voice input. Do not "solve" the voice-input problem by telling users to keep using the app in a Safari tab instead of installing it — that trades a moderate voice-UX inconvenience for the much more severe risk of silent data loss. Voice input should degrade gracefully; storage persistence should not be compromised to accommodate it.

**How to avoid:** Same prevention as v1 — prominent install prompt, `navigator.storage.persist()` on launch with the result logged/surfaced, "last opened" staleness banner, frictionless JSON export. No change needed for v2 except reinforcing that this rule outranks voice-input convenience in any UX tradeoff discussion.

**Phase to address:** Already established in v1's PWA shell; re-verify it's still wired correctly after any PWA manifest/service-worker changes made during the v2 redesign (e.g., new icons, new name, new service worker for the schema-versioned rebuild).

**Severity:** PROJECT-BREAKING, unchanged from v1.

---

### Pitfall 7: Double-Counting from One-Tap Re-Log and Auto-Library Dedup Race Conditions

**What goes wrong:**
The smart auto-library's core UX promise is "every parsed item is saved automatically; repeat items re-log with one tap." Two concrete bugs are likely here:
1. **Dedup key too loose or too strict.** If "eggs" parsed today and "2 eggs" parsed yesterday are treated as different library entries because the dedup key is the raw parsed string rather than a normalized food identity (name + macros-per-unit), the library fills with near-duplicate entries and re-logging becomes confusing/error-prone (user taps the wrong "eggs" entry with stale macros). Conversely, if dedup is too aggressive (matching purely on name, ignoring that the same name can have different macros depending on prep), a re-log silently applies wrong macros from a previous, different portion.
2. **Double-tap / race-condition double insert.** A one-tap re-log button, if not disabled/debounced during the async Dexie write, can be tapped twice quickly (fat-finger, or double-tap gesture on some phones) and insert two log entries for the same food on the same day, silently inflating the day's calorie/macro totals and the ring closure computation, without any visible duplicate-looking UI (two separate log rows for "eggs" at nearly the same timestamp look like two legitimate entries, not an obvious error).

**Why it happens:** The auto-library and one-tap re-log are new UX patterns not present in v1 (which had manual food entry only); there's no existing dedup/duplicate-guard convention in the codebase to reuse. One-tap interactions are especially prone to double-fire because there's no confirmation step by design (that's the point — but it removes the natural guard a confirm dialog provides).

**How to avoid:**
- Define a clear, normalized dedup key for library entries: e.g., normalized food name (lowercased, trimmed) + macros-per-100g, not the raw freeform input string. Treat items with the same name but meaningfully different macros as separate library entries (e.g., "eggs (scrambled)" vs "eggs (boiled)") rather than silently overwriting one with the other.
- Disable the re-log button immediately on tap (optimistic UI: show it as "logged" instantly) and re-enable only after the Dexie write resolves or fails; guard against a second tap firing a second write while the first is in flight.
- Consider a brief "logged ✓ (undo)" toast after a one-tap re-log rather than no feedback at all — this both confirms the action succeeded (so the user doesn't tap again out of uncertainty) and gives a cheap undo path if it was a mistake or an accidental double-tap.
- When computing daily totals for the ring/dashboard, it's fine for the same food to be logged multiple times a day (that's often correct — two servings of chicken) — the bug to guard against is *unintentional* duplication from UI race conditions, not intentional repeat logging. Don't try to solve this by deduping log entries at read time; solve it by preventing the accidental double-write at the source.

**Warning signs:**
- Two log rows for the same food item with timestamps less than ~1 second apart.
- Library contains near-duplicate entries with slightly different capitalization/wording but identical macros.
- Daily total calories inexplicably high relative to what the user reports eating.

**Phase to address:** Auto-library / one-tap re-log phase.

**Severity:** MODERATE-HIGH. Undermines trust in the auto-library and pollutes trend data if unaddressed, but is straightforward to prevent with standard optimistic-UI debounce patterns.

---

## Moderate Pitfalls

### Pitfall 8: Weight Entries — Multiple-Per-Day Ambiguity and Raw-Data Noise in Trend Charts

**What goes wrong:** Two related issues specific to weight tracking (a genuinely new data type for this app):
1. **DayKey collision:** if the user weighs in more than once on the same day (morning + after a workout, or re-weighing out of curiosity), and the weight table's dayKey is a unique index per day, a second entry either silently overwrites the first (data loss, no warning) or the unique-index write throws and is swallowed. Decide explicitly: last-write-wins with a visible "updated today's entry" confirmation, or allow multiple entries per day and define which one the trend chart uses (typically: first entry of the day / a designated "official" AM weigh-in).
2. **Noisy raw data in the trend chart:** body weight fluctuates 1–2.5kg day-to-day from water/food/glycogen, independent of real fat/muscle change. Plotting raw daily entries as the primary trend line makes normal noise look like alarming volatility and undermines the "visible long-term progress" goal (PROJECT.md core value). Nutrition/fitness apps consistently address this with a 7-day (or exponential) moving average trend line shown alongside (not instead of) the raw points.

**How to avoid:**
- Pick and document one dayKey policy for weight explicitly (recommend: one entry per day, last-write-wins, with the UI clearly showing "update today's weight" rather than "add another entry" if one already exists for today).
- Compute and render a 7-day moving average (or EMA) line on the Dashboard weight chart in addition to raw daily points — this is the single highest-leverage design choice for making the weight trend feel meaningful rather than noisy, and directly serves the "long-term progress" core value.
- Use the same `lib/dayKey.ts` utility already mandated project-wide (CLAUDE.md rule #3) for weight entries — do not introduce a second, weight-specific date-handling path.

**Warning signs:** Weight chart looks like a jagged sawtooth with no visible trend; users report "the graph makes it look like I'm not making progress" despite real fat loss.

**Phase to address:** Weight-tracking + Dashboard phase.

---

### Pitfall 9: Orphaned Data and Schema-Version Mismatches in Export/Import After Feature Removal

**What goes wrong:** v1's JSON export (already shipped) includes PT sessions and step logs. After v2 removes those features, three mismatch scenarios arise: (a) a user imports their old v1 export into the new v2 app — the import code must recognize the old `schemaVersion`, either gracefully drop the now-irrelevant PT/steps sections with a clear message ("12 PT sessions and 45 step-count entries were not imported — this feature was removed in v2") rather than crashing or silently ignoring extra keys; (b) a fresh v2 export is later opened by someone still confused about which version of the app they're on, expecting PT data that isn't there; (c) the export's `schemaVersion` field (per v1's own PITFALLS.md convention — MUST already exist) is not bumped when the schema changes, so the import validator can't distinguish an old-format export from a new one and either accepts malformed data or rejects valid new data.

**How to avoid:**
- Bump `schemaVersion` in the export format the same commit the Dexie schema version bumps.
- Import logic must switch on `schemaVersion`: for older versions, map/drop fields explicitly (documented mapping table, not silent `...spread`), and show the user a summary of what was and wasn't imported before committing.
- Since this is a two-person app, write this migration path even though "just re-enter your data" might feel tempting to skip — both users already have real v1 data (v1.0 shipped today) that they'll want migrated forward, and Anirudh in particular will be testing the v1→v2 transition directly.

**Phase to address:** Data-layer migration phase (schema bump) + backup/export UX polish phase.

---

### Pitfall 10: `useLiveQuery` Subscription Explosion on the Dashboard

**What goes wrong:** The Dashboard tab renders several trend visualizations at once (weight trend, eating adherence, lift/cardio consistency, likely spanning weeks/months of data). If each chart component — or worse, each individual cell/data point within a chart — calls its own `useLiveQuery` against the Dexie tables independently (e.g., one query per calendar cell, one query per weight point), the app ends up with dozens to hundreds of independent live-query observers all re-evaluating on every write anywhere in the relevant tables. Dexie's `useLiveQuery` is fine-grained about *which* queries re-render on a given change, but fine-grained still means "this query's promise re-runs," and a large number of concurrent range/aggregate queries across weeks of data on every single log-entry write (which happens frequently, since logging is the whole point of the app) can produce visible input lag right when the user is trying to log something, especially on the low-end/budget Android phones this project explicitly targets.

**How to avoid:**
- One `useLiveQuery` per chart/section, not per data point. Fetch the full date-range dataset in one query (e.g., all weight entries in the last 90 days) and let the chart component (Recharts) handle per-point rendering from that single result array — do not have individual calendar/chart cells each independently subscribe.
- For the Dashboard specifically, consider computing and caching daily/weekly rollup aggregates (a `dailySummary` table, updated on write, as already flagged as a v1 performance pattern) rather than re-summing raw log rows live on every render — this both reduces query cost and reduces the surface area of what a `useLiveQuery` needs to re-run on every log write.
- Since the Daily tab and Dashboard tab are separate routes/views, ensure Dashboard's live queries aren't mounted (and thus not subscribed/re-running) while the user is actively on the Daily tab logging food — unmount-on-navigate, don't keep both tabs' subscriptions alive simultaneously if using a persistent layout.

**Warning signs:** Typing/logging on the Daily tab feels laggier after the Dashboard has been visited once in the session (subscriptions left alive); React DevTools Profiler shows many `useLiveQuery`-driven re-renders firing on a single food-log write.

**Phase to address:** Dashboard/trend-visualization phase.

---

### Pitfall 11: Ring-Closure Animation Jank on Budget Android Devices

**What goes wrong:** The Apple-Fitness-style ring closure is explicitly the emotional core of the redesign (PROJECT.md: "core motivator," "clean, sleek visual feedback," Apple-design-informed). Apple's own implementation runs on high-end silicon with a native rendering pipeline; a web/PWA recreation using SVG `stroke-dashoffset` animation or animated `conic-gradient` backgrounds can look identical on a high-end iPhone and visibly stutter on a budget Android phone (one of the two users' devices is unspecified — assume it may not be flagship-tier). Two specific traps: (1) animating `stroke-dashoffset` on a large/complex SVG every frame is not GPU-composited the way `transform`/`opacity` are, so it runs on the main thread and competes with JS execution (including any Dexie live-query re-renders happening at the same time) — frame budget is 16.7ms at 60Hz and any main-thread work over that budget drops a visible frame; (2) `background-image`/gradient properties (including `conic-gradient`) are not animatable via CSS transitions in most browsers, pushing developers toward JS-driven per-frame gradient recalculation, which is far more expensive than a transform-based approach.

**How to avoid:**
- Prefer animating `transform: rotate()` and `opacity` on GPU-compositable layers over animating `stroke-dashoffset` or gradient properties directly, where the visual result allows it (e.g., masking/clipping tricks can often substitute for direct stroke animation).
- If using SVG stroke animation for the ring itself (likely, since ring segments naturally map to circle strokes), keep the SVG simple (few elements, no complex filters/shadows) and drive the animation via CSS `@keyframes`/CSS custom properties rather than JS `requestAnimationFrame` loops recalculating dash-offset manually, so the browser can optimize the composited layer.
- Test the ring animation specifically on the lower-spec of the two users' actual phones (not just iPhone/high-end simulator) before locking in the animation approach — this is exactly the kind of thing that looks flawless in Chrome DevTools on a dev laptop and janks on a real budget Android device.
- Respect `prefers-reduced-motion` — beyond accessibility, a simplified/instant fill state for that media query also gives you a free, always-available "no animation" performance fallback path.
- Keep the ring animation decoupled from the Dexie `useLiveQuery` render cycle where possible — don't recompute/re-trigger the ring fill animation on every unrelated database write; only animate on the specific event that changes ring-relevant state (a log completing a segment).

**Warning signs:** Ring fill animation stutters or skips frames on Android Chrome performance profiling; animation feels instant/binary rather than a smooth fill on a mid-range device.

**Phase to address:** Daily-closure/ring UI phase — consult the project's own `improve-animations` skill (already installed at `.agents/skills/`) during this phase, and budget explicit device testing time, not just visual design time.

---

### Pitfall 12: Service Worker / Cache Staleness Across the Schema-Breaking v2 Rebuild (Carried Forward, Elevated Risk)

**What goes wrong:** Unchanged mechanism from v1 (stale service worker serves old JS indefinitely until all tabs close), but v2's scope — a near-total schema and UI rebuild happening in one release — raises the stakes: if a user's installed PWA is stuck running old (v1) JS against a partially-migrated (v2) Dexie schema, or vice versa, the mismatch between code expectations and on-disk schema is more likely to surface as a hard crash (missing table, unexpected field) than a cosmetic bug, because so much changed at once.

**How to avoid:** Same mechanism as v1 (in-app "Update available" banner triggering `skipWaiting`/`clients.claim()`, versioned cache names) — but for this specific release, verify the update-prompt flow itself end-to-end on both users' installed apps before considering the v2 rollout complete, since this is the riskiest single update this app will ever ship (old schema + old code vs. new schema + new code, no in-between valid state).

**Phase to address:** PWA/deployment phase, verified as part of final v2 rollout, not assumed to "still work" unchanged from v1.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing the Anthropic API key in the same `settings` object/table as other preferences | Simpler settings code | Naive export logic leaks the key in JSON backups | Never — isolate the key into its own record excluded from export by construction |
| Auto-committing LLM parse results directly to the log without a confirm screen | Faster "speak and done" feel | Silent macro corruption from unit-confusion hallucinations pollutes trend data | Never for the first parse of a new item; acceptable *only* for one-tap re-logs of already-confirmed library items |
| Editing the `db.version(1)` block to remove PT/steps stores instead of appending `null` in a new version | Feels like "just deleting the feature" | Breaks the append-only migration contract; undefined behavior for any device that already ran v1 | Never |
| Skipping the arithmetic-consistency check between LLM-returned calories and macros | Simpler parsing code, one less validation step | Bad numbers ship silently, especially for high-fiber/alcohol items where the 4/4/9 rule has known slack | Acceptable only with a wide tolerance band (e.g., 20%+) and never as a hard block — flag, don't reject |
| One `useLiveQuery` per calendar/chart cell on the Dashboard | Simplest component code, no prop drilling of shared data | Dozens of concurrent subscriptions cause input lag on the Daily tab during logging | Never at Dashboard scale (weeks/months of data); fine for a single always-visible summary widget |
| Skipping the debounce/disable-on-tap guard for one-tap re-log buttons | Simpler button component | Double-tap creates silent duplicate log entries, inflating daily totals | Never — this is a two-line fix (disable on tap, re-enable on settle) |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| Anthropic API (browser-direct) | Forgetting the `anthropic-dangerous-direct-browser-access: true` header, causing CORS failures that look like a network/API-key problem | Set the header explicitly on every direct-from-browser request; treat its absence as the first thing to check when debugging "API call fails from the browser but works from curl" |
| Anthropic API (browser-direct) | Assuming a failed/malformed JSON response is rare enough to skip validation | Always parse the model's response through a strict Zod schema; treat parse failures as a "needs review" state, not a crash |
| Web Speech API (`webkitSpeechRecognition`) | Assuming the vendor-prefixed API behaves identically across Safari-in-browser and standalone home-screen PWA contexts on iOS | Test both contexts explicitly; do not assume Safari-tab test coverage transfers to the installed PWA (see Pitfall 2) |
| Web Speech API | Using `continuous = true` on iOS, expecting multi-utterance behavior like desktop Chrome | Set `continuous = false` on iOS and manually restart recognition per utterance if longer dictation is needed; treat continuous mode as unreliable/"useless" on iOS per community reports |
| Dexie schema versioning | Editing a historical `db.version(N)` block to remove or "clean up" a store | Always append a new version block; use `{ tableName: null }` to drop a store, only ever in a new version |
| JSON export/import | Spreading all settings/state into the export blob without an explicit allowlist | Build export from an explicit allowlist of tables/fields; exclude secrets (API key) by construction, not by remembering to filter them out later |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-cell `useLiveQuery` subscriptions on Dashboard charts | Input lag while logging on the Daily tab after visiting Dashboard | One query per chart/section over a date range; unmount Dashboard subscriptions when navigating away | Noticeable with even a few weeks of daily log data and 3+ chart sections |
| Animating `stroke-dashoffset`/gradients on the main thread for ring closure | Dropped frames / stutter on budget Android during the ring-fill animation | Prefer `transform`/`opacity`-driven, CSS-keyframe-based animation; keep ring SVG simple; test on real low-end hardware | Visible almost immediately on non-flagship Android devices; may look fine on a dev laptop or high-end iPhone |
| Summing raw food-log rows live for the daily/dashboard total on every render | Dashboard feels sluggish as weeks of data accumulate | Maintain a `dailySummary` rollup table updated on write (carried forward from v1 research) | ~200+ log rows per 30-day window, worse across months on Dashboard |
| Recomputing full weight/eating/training trend series on every `useLiveQuery` fire from unrelated writes | Chart re-renders/recomputes even when a food log (unrelated to weight) is saved | Scope live queries tightly to the exact table/date-range each chart needs; avoid one broad "all data changed" observer feeding multiple charts | Any concurrent multi-chart Dashboard once daily logging volume is nontrivial |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| API key included in JSON export/backup | Key exposure if the export file is shared, cloud-synced, or inspected by someone else | Explicit export allowlist excluding the key field (Pitfall 1) |
| API key logged via `console.log` on request/response objects during development, left in shipped code | Key visible in browser DevTools console history for anyone with device access | Redact/omit key and full request payloads from any logging; log only non-sensitive metadata |
| Freeform user text passed directly into the LLM prompt with no bounds | Low risk for a personal single-purpose tool, but a maliciously crafted freeform "food" string could attempt prompt injection against the parsing instructions | Keep the system prompt narrowly scoped to structured JSON nutrition extraction with a strict output schema; validate output with Zod regardless of what the model was told to do — treat the model's text output as untrusted input to your app, not as executable instructions |
| API key stored in plain `localStorage`/Zustand-persisted state with no masking in the UI | Key visible at a glance if someone else picks up the phone while Settings is open | Mask the key display (show only last 4 characters) after initial entry, same as password-manager UX conventions |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|------------------|
| Auto-committing AI-parsed macros with no review step | Silent bad data enters the log and the trend dashboard; user loses trust once they notice a wrong number weeks later | Always show a confirm-before-save screen with the model's interpreted quantity/unit alongside the macros (Pitfall 3) |
| Voice input failing silently (spinning mic, no result) when running as an installed PWA | User assumes the feature is broken/buggy rather than a platform limitation; frustration on the exact "low-friction entry" path the product is built around | Detect the no-result timeout and show an explicit fallback message steering to text entry; never leave a silent/ambiguous loading state |
| One-tap re-log with no feedback | User taps again out of uncertainty ("did that work?"), risking a duplicate entry | Immediate optimistic UI state change ("Logged ✓") plus a brief undo affordance |
| Weight chart showing only raw daily points | Normal day-to-day water-weight fluctuation looks like the user isn't making progress, undermining motivation — directly opposed to the "visible long-term progress" core value | Show a 7-day moving average trend line alongside raw points (Pitfall 8) |
| Import of an old v1 export silently dropping PT/steps data with no explanation | User assumes data loss/a bug rather than an intentional, communicated feature removal | Explicit import summary: "X PT sessions and Y step entries were not imported (feature removed in this version)" |
| Ring-closure animation that's technically present but visibly janky on one user's phone | The core motivator feels cheap/broken on exactly the device where the feeling of "closing the ring" matters most | Test the actual animation on both users' real phones, not just the higher-spec one, before finalizing |

---

## "Looks Done But Isn't" Checklist

- [ ] **API key settings:** Confirm the JSON export does NOT contain the Anthropic API key — export, inspect the file, grep for `sk-ant-`.
- [ ] **AI food parsing:** Confirm every parse result passes through a confirm-before-save screen — no code path saves a parse directly to the log/library without user confirmation.
- [ ] **AI food parsing:** Confirm a Zod schema validates the LLM's JSON response, including a rough arithmetic-consistency check (calories vs. macro-derived calories), before the confirm screen renders.
- [ ] **Voice input:** Verify voice input is tested on both users' installed (home-screen) PWAs, not just in a Safari tab or desktop browser — and that a text-entry fallback is equally reachable and equally fast.
- [ ] **Dexie schema migration:** Confirm the PT/steps removal is a `null`-valued new version block, and that no historical version block (`version(1)`, etc.) was edited — check `git diff` on the DB module.
- [ ] **Dexie schema migration:** Confirm a device with real v1 data (if any exists) can open the v2 app and migrate cleanly — test with an actual exported/imported v1 snapshot, not just a fresh install.
- [ ] **Auto-library dedup:** Confirm re-logging an item twice quickly (rapid double-tap) produces exactly one log entry, not two.
- [ ] **Auto-library dedup:** Confirm the library's dedup key is based on normalized food identity (name + macros-per-unit), not the raw freeform input string.
- [ ] **Weight tracking:** Confirm the dayKey policy for multiple same-day weigh-ins is explicit and tested (last-write-wins with visible "updated" feedback, or a defined multi-entry rule) — not left as undefined/accidental overwrite behavior.
- [ ] **Weight tracking:** Confirm the Dashboard weight chart renders a moving-average trend line, not just raw daily points.
- [ ] **JSON export/import:** Confirm `schemaVersion` was bumped alongside the Dexie schema bump, and that importing an old v1-format export produces a clear summary of what was/wasn't imported.
- [ ] **Dashboard performance:** Confirm logging a food item on the Daily tab feels equally responsive whether or not the Dashboard tab has been visited earlier in the session (no lingering subscriptions).
- [ ] **Ring-closure animation:** Confirm the animation is tested on the lower-spec of the two users' real Android/iOS devices, not only a dev machine or flagship phone.
- [ ] **iOS storage persistence:** Re-confirm (post-redesign) that `navigator.storage.persist()` is still called on launch and the install-to-home-screen prompt still surfaces — verify this wasn't accidentally dropped during the PWA manifest/service-worker changes that come with the v2 rebuild.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| API key leaked via export | LOW | Revoke/rotate the key in the Anthropic console; generate a new one; re-enter in Settings. No data loss, minor inconvenience. |
| LLM macro hallucination baked into trend data | MEDIUM | Since every parse should have gone through a confirm screen, the fix is a UI affordance to edit/re-parse a past log entry's macros after the fact; without that, manual correction via a data-edit screen is the only path |
| Dexie migration mistake removing PT/steps (edited a past version block) | HIGH | Same as v1: never edit past versions going forward; if a device is already in a bad state, recovery requires the user's most recent JSON export and a manual re-import against a corrected schema |
| Double-logged food entry from re-log race condition | LOW | Provide a delete/edit affordance on log entries so the user can remove the duplicate themselves; this is a normal expected UI capability, not a special recovery flow |
| Voice input platform limitation discovered late | LOW-MEDIUM | Since text entry uses the same parsing pipeline, disabling/hiding the voice button (or gating it to non-standalone mode) is a config-level fix, not a rebuild |
| Old v1 export imported into v2, orphaned PT/steps fields | LOW | Import logic drops unrecognized fields per the documented schemaVersion mapping; no destructive action needed, just a clear summary message |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|---------------|
| API key leakage via export/logs | AI-parsing settings/integration phase | Grep exported JSON for key prefix; code review export allowlist |
| Web Speech API breaking in standalone PWA | AI-parsing/voice-input phase | Manual test on both users' installed home-screen apps, not just Safari tab |
| LLM macro hallucination / unit confusion | AI-parsing phase | Zod schema validation + arithmetic-consistency check unit tests; manual review of confirm-screen UX with deliberately ambiguous inputs ("a cup of rice") |
| Dexie append-only violation removing PT/steps | Data-layer schema migration phase (first in v2 build) | `git diff` shows only new version blocks added, no historical block edited; migration test from a real/simulated v1 snapshot |
| Transaction auto-commit near async LLM calls | AI-parsing phase (save-parsed-item code path) | Code review: no `fetch`/Web-Speech await inside any `db.transaction()` block |
| iOS 7-day storage eviction | PWA shell (re-verify post-redesign) | Confirm `navigator.storage.persist()` call and install prompt still present after manifest/SW changes |
| Double-counting from one-tap re-log races | Auto-library / re-log phase | Rapid double-tap test produces exactly one log row |
| Weight dayKey ambiguity + noisy trend chart | Weight-tracking + Dashboard phase | Explicit same-day-entry policy documented and tested; moving-average line present on chart |
| Orphaned data in export/import after removal | Data-layer migration + backup UX phase | Import an old v1 export into v2 build; confirm clear summary message, no crash |
| `useLiveQuery` subscription explosion on Dashboard | Dashboard/trend-visualization phase | React DevTools Profiler check: logging on Daily tab is not slower after visiting Dashboard |
| Ring animation jank on budget devices | Daily-closure/ring UI phase | Manual test on the lower-spec of the two users' real phones; `prefers-reduced-motion` fallback verified |
| Service worker staleness across schema-breaking rebuild | PWA/deployment phase, final v2 rollout | End-to-end update-prompt test on both users' installed apps before calling v2 rollout complete |

---

## Sources

- Simon Willison: Claude's API now supports CORS requests — https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/
- Hacker News discussion on the "dangerous" browser-access header — https://news.ycombinator.com/item?id=41326384
- DEV Community: Calling the Anthropic API Directly From the Browser (BYOK pattern) — https://dev.to/sendotltd/calling-the-anthropic-api-directly-from-the-browser-a-150-line-byok-comparison-tool-for-opus--nh
- Claude Help Center: API Key Best Practices — https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure
- WebKit Bug #239816: Web Speech API doesn't work in WKWebView (context on standalone/embedded WebKit permission gaps) — https://bugs.webkit.org/show_bug.cgi?id=239816
- Apple Developer Forums: Error accessing webkitSpeechRecognition() in a PWA application — https://developer.apple.com/forums/thread/748048
- GitHub: JamesBrill/react-speech-recognition, PWA issue reports on iOS standalone mode — https://github.com/JamesBrill/react-speech-recognition/issues/104
- WebKit Blog: WebKit Features in Safari 26.0 (SpeechRecognition secure-context requirement) — https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- lilting channel: How to Stabilize the WebSpeech API on iOS — https://lilting.ch/en/articles/ios-webspeech-api-tips
- arXiv: NutriBench — a dataset for evaluating LLMs on macronutrient/calorie estimation from natural language — https://arxiv.org/pdf/2407.12843
- ScienceDirect: ChatDiet — LLM-augmented nutrition chatbot framework, hallucination discussion — https://www.sciencedirect.com/science/article/pii/S2352648324000217
- Dexie.js GitHub Issue #275: delete table from db — https://github.com/dfahlander/Dexie.js/issues/275
- Dexie.js GitHub Issue #742: Deleting tables in same run as table migration breaks upgrade — https://github.com/dexie/Dexie.js/issues/742
- Dexie.js Docs: Dexie.version() — https://dexie.org/docs/Dexie/Dexie.version().html
- Dexie.js Docs: useLiveQuery() — https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
- Dexie.js GitHub Discussion #1661: How to prevent extra renders with useLiveQuery — https://github.com/dexie/Dexie.js/discussions/1661
- MacroFactor Help Center: Weight Trend (moving-average rationale) — https://help.macrofactorapp.com/en/articles/21-weight-trend
- Fourmilab: Signal and Noise (Hacker's Diet, bodyweight trend smoothing) — https://www.fourmilab.ch/hackdiet/e4/signalnoise.html
- deaddy.net: On tracking bodyweight — https://deaddy.net/on-tracking-bodyweight.html
- drizz.dev: Animation Testing on Mobile — Frame Budgets, Jank & How to Catch It (2026) — https://www.drizz.dev/post/animation-testing-mobile
- DEV Community: Animating large SVGs in React without crashing mobile browsers — https://dev.to/hexshift/animating-large-svgs-in-react-without-crashing-mobile-browsers-1o10
- GitHub: JonasDoesThings/react-activity-rings (Apple Watch-inspired SVG rings for React) — https://github.com/JonasDoesThings/react-activity-rings
- DockYard: Animating Background Gradients (CSS gradient transition limitations) — https://dockyard.com/blog/2017/10/17/animating-background-gradients-pwa
- Zustand Docs: Persisting store data — https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data
- v1.0 PITFALLS.md (this project) — carried-forward pitfalls: IDB transaction auto-commit, Dexie append-only migrations, iOS 7-day storage eviction, date-as-UTC-string dayKey bug, service worker stale-cache updates

---

*Pitfalls research for: HealthTracker v2.0 Duo Redesign — AI-parsed food entry, smart auto-library, ring-style daily closure, weight tracking, feature removal, Apple-style animated UI on a fully-local dual-install PWA*
*Researched: 2026-08-08*
