# Pitfalls Research

**Domain:** Fully-local PWA health tracker (single user, IndexedDB, iOS primary target)
**Researched:** 2026-04-19
**Confidence:** HIGH (most pitfalls verified via official docs, MDN, WebKit blog, and well-documented community reports)

---

## Critical Pitfalls

### Pitfall 1: IndexedDB Transaction Auto-Commit with Async/Await

**What goes wrong:**
A write to IndexedDB fails silently or throws `TransactionInactiveError` at runtime. The developer calls `await someNonIDBThing()` (a fetch, a timeout, or even a library function) inside a Dexie/raw IDB transaction block, which yields control to the event loop. IndexedDB auto-commits any transaction that has no pending requests after the current microtask queue drains — so by the time the awaited value resolves, the transaction is already gone. Every subsequent DB operation in that block throws or is a no-op.

**Why it happens:**
The IDB auto-commit rule is non-obvious and easy to hit accidentally when mixing async utilities into what looks like a normal async function. Dexie wraps this with zone-based transaction tracking, but calling any native Promise or a non-Dexie promise inside a `db.transaction()` block exits the Dexie zone and triggers the same failure. Common mistakes: calling `navigator.storage.estimate()` inside a write transaction, using `setTimeout`/`setInterval`-backed delays, or awaiting a utility that re-schedules on the macro task queue.

**How to avoid:**
- Use Dexie.js exclusively and never mix native Promises inside `db.transaction()` blocks.
- Keep all IDB work contiguous in the transaction callback — fetch all data you need before starting the transaction, not during it.
- If you must compute something async (e.g. compress an image before storing), do it before entering the transaction and pass the result in.
- Dexie's `db.transaction('rw', [stores], async () => { ... })` protects you so long as you only await Dexie operations inside it.

**Warning signs:**
- `TransactionInactiveError` or `PrematureCommitError` in the console on write operations.
- Data appears to save but is missing on reload.
- Operations silently succeed (no thrown error) but the object store is unchanged.

**Phase to address:** Data layer — must be established in the first sprint before any feature code touches the database. The Dexie transaction boundary pattern must be a dev convention, not an afterthought.

**Severity:** PROJECT-BREAKING. Silent data loss with no error is the worst possible failure mode for a tracking app.

---

### Pitfall 2: IndexedDB Schema Migration — Skipping Versions or Mutating Past Versions

**What goes wrong:**
The app ships with `db.version(1)`. Later the developer adds a field and bumps to `db.version(2)` with an upgrade handler. Three months later they realize version 1's schema was wrong and edit the version 1 definition instead of declaring a version 3 migration. Any user still on version 1 in the wild now hits an upgrade path that was never tested; users on version 2 get an impossible downgrade; and because the developer only tests on a fresh DB, the bug ships undetected until a real device has corrupt data.

**Why it happens:**
Version numbers in Dexie/IDB are permanent once deployed. Developers treat them like code — they refactor earlier versions. This is wrong. Each version declaration is a migration contract and must be treated as append-only.

**How to avoid:**
- Treat each `db.version(N)` block as immutable once shipped. Never edit a past version; always add `db.version(N+1)` with a `.upgrade()` handler.
- Document the version history in a comment block at the top of your DB module: version, date, what changed.
- Test migrations by loading a copy of a real on-device DB export, running the app against it, and verifying the data is intact.
- Use Dexie's `Version.upgrade(tx => ...)` to perform data backfill (e.g. adding a `dateKey` string field to every existing food log row) rather than relying on the new code to handle missing fields at runtime.

**Warning signs:**
- `VersionError` thrown on open.
- Fields are undefined for rows created before a schema change.
- Old exports fail to import after a code update.

**Phase to address:** Data layer foundation. Define and document the version-tracking convention before any other feature is built on top.

**Severity:** PROJECT-BREAKING. A botched migration on a real device with months of data is unrecoverable without a backup.

---

### Pitfall 3: iOS Safari Storage Eviction — The 7-Day Inactivity Wipe

**What goes wrong:**
On iOS, Safari will delete all script-writable storage (IndexedDB, LocalStorage, Cache API, service worker registrations) for any origin that has had no user interaction for 7 days of browser use. For a health tracker, a week of travel, illness, or simply not opening the app on the phone (but still logging on laptop) can silently wipe all data.

**Why it happens:**
Apple's ITP (Intelligent Tracking Prevention) treats sites without recent interaction as potential trackers and evicts their storage. The 7-day counter runs on Safari browser use days, not calendar days, so "7 days of Safari use without touching the app" is the real trigger.

**Critical exception:** Web apps added to the iPhone home screen are NOT subject to the 7-day wipe. They have their own days-of-use counter and Apple has officially stated their data will not be auto-deleted. Home-screen installation is therefore not just a UX nice-to-have — it is the data safety strategy.

**How to avoid:**
- Surface the "Add to Home Screen" install prompt prominently on first use and again if the app detects it is running in browser Safari (not as a standalone PWA). Treat this as a data-safety warning, not just a UX suggestion.
- Call `navigator.storage.persist()` on app launch and check the returned boolean. On iOS 17+, this is supported and can grant persistent storage status. Log whether the request was granted.
- Implement a "last opened" check on startup: if the gap since last use is more than 4–5 days and the app is not running as a standalone PWA, show a banner warning the user their data may be at risk and encouraging both home-screen install and a JSON export.
- Do not rely on this working perfectly — the JSON export flow must be friction-free so the user actually uses it.

**Warning signs:**
- App running in Safari tab (not standalone) without a persistent-storage grant.
- User has not opened the app in over 5 days.
- `navigator.storage.estimate()` shows 0 usage on a device that should have data.

**Phase to address:** PWA shell / service worker phase AND onboarding UX. Both the install prompt and the persistent-storage request must be wired in the first working shell, not added later.

**Severity:** PROJECT-BREAKING for any user who does not install to home screen. This is the highest-severity iOS-specific risk.

---

### Pitfall 4: The Date-as-String UTC Midnight Bug

**What goes wrong:**
The daily tracking model groups data by calendar date (a day is a PT session, a food log day, a step count). If date keys are stored as ISO strings (`new Date().toISOString()` → `"2026-04-19T22:00:00.000Z"`) and the user is in a timezone behind UTC, queries for "today's logs" miss rows logged late at night because the UTC date on those rows is already tomorrow.

The subtler variant: the developer stores date keys using `new Date("2026-04-19")` which JavaScript (per spec for date-only ISO strings) parses as UTC midnight, not local midnight. A user in UTC-5 querying "records where dateKey === today's local date string" either gets nothing or gets yesterday's records.

**Why it happens:**
JavaScript's `Date` API has a split-brain between UTC and local time that is invisible in testing (developer is often near UTC) and surfaces only for users in western timezones or after midnight.

**How to avoid:**
- Define one canonical date-key format early and use it everywhere: `YYYY-MM-DD` in local time, constructed from `date.getFullYear()`, `date.getMonth()+1`, `date.getDate()` (zero-padded). Never derive a date key from `toISOString()`.
- Create a single `toDateKey(date?: Date): string` utility function that all code must use. Ban raw date string construction elsewhere via a linting convention or comment.
- Store dates as local-timezone `YYYY-MM-DD` strings in IndexedDB, not as UTC timestamps or ISO strings.
- For display, use `date-fns` with explicit local-time functions (`format(new Date(), 'yyyy-MM-dd')`) rather than `Date.prototype.toLocaleDateString()` which has locale-dependent output.

**Warning signs:**
- Calendar view showing yesterday's data on the wrong cell, especially noticeable for entries logged late at night.
- Streak counts off by one.
- "No data today" for a day where the user definitely logged.

**Phase to address:** Data layer — the `toDateKey` utility must exist before the first data model is defined.

**Severity:** HIGH. Will cause invisible data integrity bugs that erode user trust ("the app is wrong"). Hard to debug after the fact.

---

### Pitfall 5: PWA Service Worker Update — Stale App Stuck in Cache

**What goes wrong:**
The developer ships a bug fix. Users who have the PWA installed to home screen continue running the old version indefinitely because the service worker is serving the old cached app shell. The new service worker is downloaded, enters the "waiting" state, but never activates — it waits for all clients (tabs/windows) to close, which never happens if the user always opens the app from home screen without fully closing it.

On iOS this is worse: Safari has historically had bugs where service worker updates fail to propagate even after browser restart. Users can be stuck on a broken version with no way to self-serve the fix.

**Why it happens:**
The default service worker lifecycle requires all open tabs using the old worker to close before the new worker can take over. Home-screen PWA users tend to swipe-up rather than "kill" the app, leaving the old worker in control.

**How to avoid:**
- Ship an in-app "Update available" banner that calls `registration.waiting.postMessage({ type: 'SKIP_WAITING' })` and reloads the page. This is the standard pattern for safe in-place upgrades.
- In the new service worker, handle that message by calling `self.skipWaiting()` followed by `clients.claim()`.
- Use a versioned cache name (e.g. `healthtracker-v3`) so old caches are explicitly deleted during the new worker's activate event.
- Add a version indicator (build hash or semver) visible somewhere in the app's settings/about section so the user can verify they are on the current version.
- For Vite/Rollup projects, use `vite-plugin-pwa` which generates the service worker and handles cache versioning automatically.

**Warning signs:**
- Users report that a bug they saw is still present after you shipped a fix.
- `navigator.serviceWorker.getRegistrations()` shows a waiting worker alongside the active one.
- App behaves differently between a fresh install and an existing install.

**Phase to address:** PWA shell / service worker setup. Wire the update-prompt flow before any feature work — this is infrastructure, not a feature.

**Severity:** HIGH. Can strand users on broken versions with no self-serve escape path.

---

### Pitfall 6: Streak Anxiety and All-or-Nothing Abandonment

**What goes wrong:**
The 4-segment calendar is the core motivator. If missing a single segment on any given day makes the entire day appear visually "broken" — a hollow or incomplete cell — the user experiences disproportionate loss aversion. Research consistently shows that missing one day of a streak causes a significant portion of users to abandon the habit app entirely within days, because "I've already ruined it" becomes the dominant frame.

For this specific user: the PT sessions are recovery-focused. Skipping PT on a flare day (medically appropriate) should not look like failure. Missing a food log entry on a social dinner night should not feel like a streak is "broken."

**Why it happens:**
Streak systems are binary by default — you either logged or you didn't. The visual representation (a full/empty calendar cell) amplifies this binary. The psychological effect is loss aversion: losing a streak feels 2-3x worse than the positive feeling of maintaining it.

**How to avoid:**
- Design the calendar cell to show partial completion as a visible positive — each of the 4 segments lights up independently as it is logged. A day with 3/4 segments complete should look like progress, not failure.
- Never use red or empty states for partial days. Use a graduated fill (e.g. quarter, half, three-quarter, full) with a neutral-to-positive color for all non-zero states.
- Define "streak" as consecutive days with at least one segment logged, not consecutive days fully complete. Show separate counters for overall consistency and "full day" completion.
- Consider showing the last-N-days consistency percentage ("23 of the last 30 days had at least one log") alongside the streak number — percentage framing is more forgiving than a streak count.
- Add a "rest day" affordance for PT — explicitly marking a day as a deliberate rest day should fill the PT segment without implying failure.

**Warning signs:**
- User stops logging all 4 areas but still logs some — the partial-log behavior persists but never becomes a full day, suggesting the full-day target feels unattainable.
- User goes silent after a multi-day gap (travel, illness) — classic post-streak-break abandonment pattern.

**Phase to address:** Core UI — the calendar and streak logic. Must be intentional from the first implementation, not cosmetically patched later.

**Severity:** HIGH for the core value proposition. If the streak loop kills motivation instead of building it, the app has failed its only job.

---

### Pitfall 7: Food Logging Friction — Too Many Taps to Log a Repeat Meal

**What goes wrong:**
The user logs the same 6–8 foods most days (protein shake, chicken breast, rice, ground beef, etc.). If logging a meal requires: open app → tap Food → tap Log Meal → type search query → select food → enter servings → save → repeat for each item — then even 3-item meals take 15+ taps. This is the primary cause of food log abandonment in existing apps. Users start doing it for 2 weeks, then stop.

**Why it happens:**
Food loggers are designed for flexibility (any food, any amount) which makes the base flow verbose. The solution is app-specific shortcuts that the generic apps cannot provide: this app knows the user's specific foods and typical servings.

**How to avoid:**
- Implement "quick re-log" as a first-class feature from day one: show the user's most recently and most frequently logged foods on the food log screen, one tap to re-add with the last-used serving quantity pre-filled.
- Design the food library to store per-food "default servings" that are pre-populated on selection. The user should only edit the serving count when it differs from usual.
- Show a "log same as yesterday" shortcut for the meal that is most consistent (typically breakfast for a person on a cut).
- Keep the meal entry form minimal: select food, confirm/adjust quantity, save. Three interactions maximum for a previously-logged food.
- Store macro totals as an aggregate that updates live — the user must see calorie/protein progress update in real time after each log so logging feels immediately rewarding.

**Warning signs:**
- User consistently logs breakfast but not lunch or dinner — high-friction logging sessions drop off.
- Food library grows but re-log usage is low — the quick-access surface is not prominent enough.

**Phase to address:** Food logging feature. The quick re-log pattern must be in the first working version of food logging, not a "phase 2 polish" feature.

**Severity:** HIGH for retention. Food logging is the highest-friction of the four tracked areas. If it is not fast, it will not happen.

---

## Moderate Pitfalls

### Pitfall 8: Blob/Photo Storage Without Client-Side Resize

**What goes wrong:**
The food library supports optional food photos. A user takes a photo with an iPhone camera (3–12 MB), which gets stored directly into IndexedDB as a raw blob. Over time, 50 food photos × 5 MB average = 250 MB in IndexedDB. On iOS this eats into the 500 MB IndexedDB cap quickly. More immediately, loading the food library list causes the app to read dozens of multi-MB blobs into memory simultaneously, which crashes the browser tab on low-end phones.

**Why it happens:**
Developers store whatever the `<input type="file">` or camera capture API hands them without processing it first. The original file is full resolution; display needs are thumbnail resolution.

**How to avoid:**
- Before storing any photo, resize it client-side to a maximum of 800×800px using a canvas element, then export as JPEG at 70–80% quality. A 5MB iPhone photo typically becomes 50–100 KB after this transformation.
- Store the resized blob in IndexedDB. Never store the original.
- Do not index the blob field in Dexie (i.e., do not include `photoBlob` in the schema string that Dexie uses for indexing). Indexing binary data causes progressively worse performance as the library grows — this is a documented Dexie pitfall.
- When displaying the food library list, use `URL.createObjectURL(blob)` to create an in-memory URL, display the image, then call `URL.revokeObjectURL()` immediately after the image loads to free memory. Do not keep all blob URLs alive simultaneously.

**Warning signs:**
- Food library page becomes slow to load as the library grows.
- App crashes on the food library page on mobile.
- `navigator.storage.estimate()` showing unexpectedly high usage early in the app's life.

**Phase to address:** Food library feature — photo storage handling must be implemented correctly from the start, not optimized later.

**Severity:** MODERATE to HIGH depending on how aggressively the user takes photos. Even a modest food library becomes a memory problem without resizing.

---

### Pitfall 9: JSON Export That No One Actually Uses (Until Data Is Gone)

**What goes wrong:**
The app has a JSON export button buried in Settings. The user never uses it. Six months later, their phone is replaced. They search for an import button, find it, but their only export is from 4 months ago and they lose 4 months of data. Alternatively: they do export, but the current app version's schema has changed since the export — import silently drops unrecognized fields or fails with a cryptic error.

**Why it happens:**
Export is treated as an advanced/recovery feature and placed out of sight. Import schema validation is not forward- or backward-compatible because no one designed versioning into the export format.

**How to avoid:**
- Include a `schemaVersion` field in every JSON export (e.g. `{ "schemaVersion": 3, "exportedAt": "2026-04-19", "data": {...} }`). The import function must check this field and either migrate old exports or show a clear error message explaining the version mismatch.
- Place the export button prominently — not buried in Settings. Consider a banner that prompts export once a month ("Last backup: 31 days ago — tap to export now").
- On first use and after any significant data entry, show a one-time prompt: "Your data lives only on this device. Export regularly to keep a backup."
- When importing, validate the JSON structure before touching IndexedDB. Show a preview of what will be imported ("Found 145 food log entries, 89 PT sessions, ...") and require explicit confirmation before overwriting.
- Import should merge, not replace, where possible — or at minimum offer both options.

**Warning signs:**
- No export event in usage within the first 2 weeks (the user has never exported).
- Export JSON contains no `schemaVersion` field (early implementation without versioning).

**Phase to address:** Data layer (add `schemaVersion` to export format from day one) and settings/backup UX.

**Severity:** MODERATE. Data loss from device replacement is the most likely real-world failure mode for a fully-local app. The user cannot recover from this without a backup.

---

### Pitfall 10: Service Worker Cache Strategy Serving Stale Data to API-less App

**What goes wrong:**
For a fully-local app with no backend, the main risk is the opposite of a backend app: the service worker is cache-first for app shell assets, but if the build hash embedded in filenames is not properly invalidated, the old JS bundle (with old DB access code) continues to run while the new service worker is waiting. During this window, the old code and new schema version can conflict.

The secondary risk: if any Workbox/custom service worker caching rule accidentally matches the `sw.js` file itself, the service worker update loop breaks — the browser never sees the new service worker because it is serving the old one from cache.

**Why it happens:**
`sw.js` must be served with `Cache-Control: no-cache` and must never be precached by itself. Vite-plugin-pwa handles this correctly, but manual service worker setups or CDN configurations that set aggressive caching headers on all JS files will catch the service worker too.

**How to avoid:**
- Use `vite-plugin-pwa` which correctly excludes `sw.js` from precaching and sets appropriate cache headers.
- If hosting on Netlify/Vercel/similar, add an explicit header rule: `sw.js` → `Cache-Control: no-store`.
- Test service worker updates: ship version A, load in browser/phone, ship version B, verify the update prompt appears within 60 seconds.

**Warning signs:**
- Deploying a change and not seeing it reflected in an installed PWA after 2 minutes.
- `Registration.waiting` is never null even after implementing `skipWaiting`.

**Phase to address:** PWA infrastructure / deployment setup.

**Severity:** MODERATE. Breaks the update flow; can be fixed with a cache-clear but is annoying.

---

### Pitfall 11: Notification Fatigue Driving App Removal

**What goes wrong:**
The developer adds daily reminder push notifications ("Don't forget to log today!"). The user grants permission initially. After 2–3 weeks, the notifications feel nagging rather than helpful, especially on days the user has already logged or when they are in a low-motivation period. They revoke notification permission or, worse, uninstall the PWA from the home screen.

**Why it happens:**
Generic time-based reminders don't account for whether the user has already logged for the day. They also don't respect that motivation is variable — a notification on a high-motivation day is welcome; the same notification on a rest day or a travel day feels punishing.

**How to avoid:**
- Do not implement push notifications in the MVP. Use the app itself as the prompt: the calendar view showing an incomplete day is the reminder.
- If notifications are added later, only fire them on days where the user has not yet logged anything by a user-configured time (e.g. 8pm if nothing has been logged). Never notify if any segment is already complete.
- Make notification opt-in per category (PT reminder separate from food reminder) and make them easy to turn off in-app, not just in phone settings.
- On iOS, note that push notifications from PWAs require the app to be installed to the home screen and the user to have granted permission explicitly. Do not assume they will work.

**Warning signs:**
- User has granted notification permission but later revoked it.
- User removes app from home screen.

**Phase to address:** Post-MVP feature. Defer to after core logging loop is proven useful.

**Severity:** MODERATE risk to retention if implemented poorly. Low priority to implement.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding DB version at 1 forever | Avoids migration complexity | Any schema change requires clearing all user data or a full manual migration | Never — always use versioned migrations from the start |
| Storing raw camera photos (no resize) | Simpler code | Memory crashes, quota exceeded, slow food library | Never |
| Date keys from `toISOString()` | One-liner convenience | Off-by-one day bugs for users in UTC-offset timezones | Never — always use local-date construction |
| Skipping `schemaVersion` in export JSON | Simpler export format | Import breaks silently when schema changes; data loss on device migration | Never |
| Indexing blob fields in Dexie schema | Blob is queryable | Progressive performance degradation as data grows, eventual crash | Never |
| Hiding export in Settings only | Cleaner UI | User never exports, loses data on device replacement | Acceptable in MVP if a prominent first-use prompt is shown |
| `skipWaiting()` without an update prompt | Worker updates instantly | Possible asset mix between old/new worker mid-session on multi-tab use | Acceptable for this single-user app during early development only |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all food library blobs on list render | Food library page slows as library grows; crashes on mobile | Use `createObjectURL` per visible thumbnail, revoke after render; lazy-load out-of-viewport items | ~20 photos with no lazy loading |
| Full DB scan for "today's logs" on every render | Calendar month view becomes slow | Store date keys as indexed `YYYY-MM-DD` strings in Dexie so range queries use the index | ~1000+ log entries without indexing |
| Re-rendering the entire calendar on any log event | UI jank when saving a log | Memoize calendar cells; only re-render the affected day | Noticeable immediately on slow phones |
| Storing macro totals as raw food-log rows and summing at read time | Simple writes, slow dashboard reads | Store a daily-summary document alongside individual logs, update it on every write | ~200 food log rows per 30-day period |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Red/empty cells for partial-complete days | Streak anxiety, abandonment after any missed area | Graduated fill (1–4 segments lit) with neutral-to-positive color for all non-zero states |
| Food log flow requiring 10+ taps per item | Users stop logging food after 1–2 weeks | Most-recent and most-frequent food list on logging screen; one-tap re-add with pre-filled servings |
| No "rest day" affordance for PT | User feels penalized for medically appropriate rest | Allow explicit "rest day" marking that satisfies the PT segment |
| Calorie counter only visible after full meal log | No reward for partial logging | Show running macro totals update live after each food item is saved |
| Backup prompt buried in Settings | User never exports; loses data on device change | Monthly export reminder banner; first-use data-safety explanation |
| Install prompt not tied to data-safety messaging | User sees "Add to Home Screen" as optional UX fluff | Frame install as "Protect your data — install to home screen to prevent automatic deletion" |
| Streak count reset to 0 after any break | Disproportionate loss aversion, app abandonment | Show "Best streak" and "Last 30 days consistency %" alongside current streak |

---

## "Looks Done But Isn't" Checklist

- [ ] **Food log entry:** Check that macro totals update immediately after saving a food — not just on next page load.
- [ ] **Calendar view:** Verify that days in timezones UTC-5 through UTC+5 show the correct date for entries logged late at night (23:30 local → must be today, not tomorrow).
- [ ] **IndexedDB migrations:** Confirm that a user with a version 1 database can open the app after a version 3 release and get all their data migrated correctly — test on a real device, not a fresh install.
- [ ] **Service worker update:** Verify that deploying a new build causes an update prompt to appear in the installed PWA within ~60 seconds of the new service worker being available.
- [ ] **JSON export/import round-trip:** Export data, clear the DB, import the JSON, verify all records are present and macro totals are correct.
- [ ] **Photo storage:** Confirm that storing 20 food photos does not exceed 10 MB of IndexedDB usage (confirms the resize pipeline is working).
- [ ] **iOS persistent storage:** On an iPhone running Safari (not standalone), verify that `navigator.storage.persist()` is called and the result is surfaced to the user.
- [ ] **PT rest day:** Verify that marking a rest day fills the PT segment on the calendar without creating a PT session record.
- [ ] **Streak partial-fill:** Verify that a day with 2/4 segments logged shows a visually distinct positive (not empty/red) state on the calendar.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Transaction auto-commit data loss | HIGH | Audit all DB write calls for non-IDB awaits; add try/catch around all Dexie transactions with error logging; no data recovery possible if write silently failed |
| Schema migration gone wrong | HIGH | Never edit past version definitions — add version N+1 with corrective upgrade; if data is already corrupt, attempt recovery from user's most recent JSON export |
| iOS storage eviction | HIGH | No recovery without a backup export; prevention (home screen install + persist()) is the only strategy |
| Stuck service worker (old version) | LOW-MEDIUM | User can clear site data in Safari settings; in-app update prompt prevents this |
| Date key off-by-one | MEDIUM | Data migration script to re-key affected records; requires knowing which timezone the user was in at write time |
| Unresized photos filling quota | MEDIUM | One-time migration: read each blob, resize it, write back; can be done in-app on next launch |
| No backup / data lost on device change | HIGH | No recovery; mitigation is making export easier going forward |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| IDB transaction auto-commit | Data layer foundation | Review all DB write code for non-IDB awaits before any feature is merged |
| Schema migration rules | Data layer foundation | Migration round-trip test with a v1 snapshot DB |
| iOS 7-day storage eviction | PWA shell setup | Test on real iPhone in Safari tab (not standalone); verify install prompt shown |
| Date-as-UTC midnight bug | Data layer foundation | Unit test `toDateKey()` utility with dates at 11pm in UTC-5 timezone |
| Service worker stale cache | PWA shell setup | Manual deploy-and-check test on installed PWA |
| Streak anxiety / all-or-nothing UI | Core calendar UX | User test the partial-fill state; confirm no red/empty states for partial days |
| Food logging friction | Food logging feature | Time the end-to-end flow for logging a previously-logged food; target <10 seconds |
| Blob storage without resize | Food library feature | Measure IndexedDB usage after 20 photo uploads; must be under 10 MB |
| Export never used / schema drift | Backup UX + data layer | Export → schema change → import round-trip test |
| Notification fatigue | Post-MVP | Do not implement in MVP; validate need from real usage first |
| SW cache serving stale app | Deployment / infra | Check `Cache-Control` headers on `sw.js` in production |

---

## Sources

- MDN: IDBTransaction auto-commit behavior — https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction
- MDN: ServiceWorkerGlobalScope.skipWaiting() — https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
- WebKit Blog: Updates to Storage Policy (Safari 17, persistent storage, quotas) — https://webkit.org/blog/14403/updates-to-storage-policy/
- MagicBell: PWA iOS Limitations and Safari Support [2026] — https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
- Apple Developer Forums: Safari iOS PWA Data Persistence Beyond 7 Days — https://developer.apple.com/forums/thread/710157
- Dexie.js Docs: Version.upgrade() — https://github.com/dexie/Dexie.js/wiki/Version.upgrade()
- Dexie.js Docs: QuotaExceededError — https://dexie.org/docs/DexieErrors/Dexie.QuotaExceededError
- David Fahlander (Dexie author): Don't index blob data — https://medium.com/dexie-js/keep-storing-large-images-just-dont-index-the-binary-data-itself-10b9d9c5c5d7
- Smashing Magazine: Designing A Streak System: The UX And Psychology Of Streaks (Feb 2026) — https://www.smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/
- RxDB: IndexedDB Max Storage Size Limit — https://rxdb.info/articles/indexeddb-max-storage-limit.html
- DEV Community: The JavaScript Date Time Zone Gotcha That Trips Up Everyone — https://dev.to/davo_man/the-javascript-date-time-zone-gotcha-that-trips-up-everyone-20lf
- Iinteractive: When 'Just Refresh' Doesn't Work: Taming PWA Cache Behavior — https://www.iinteractive.com/resources/blog/taming-pwa-cache-behavior
- Vinova: Navigating Safari/iOS PWA Limitations — https://vinova.sg/navigating-safari-ios-pwa-limitations/
- W3C IndexedDB spec issue: Backward-compatible schema changes are hard — https://github.com/w3c/IndexedDB/issues/282

---

*Pitfalls research for: Fully-local PWA health tracker (IndexedDB, iOS primary, single user)*
*Researched: 2026-04-19*
