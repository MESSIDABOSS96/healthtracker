# Feature Research

**Domain:** Personal health/fitness tracking PWA — AI-assisted food logging, ring-style daily closure, weight trend tracking, consistency dashboard (two independent local users)
**Researched:** 2026-08-08 (v2.0 Duo Redesign milestone — supersedes v1 FEATURES.md research from 2026-04-19)
**Confidence:** MEDIUM (HIGH on Apple ring semantics and weight-smoothing math; MEDIUM on AI-parse UX patterns from MacroFactor's public beta docs; LOW on food-library dedupe UX — no mainstream app publishes this pattern explicitly, recommendation is synthesized from general fuzzy-matching practice)

This file covers only the **new v2 surface area**: AI freeform food parsing + auto-library, ring-style daily closure (food + lift + cardio), weight tracking + trend, and the Dashboard. v1 macro-entry-with-progress-bars, food CRUD, and calendar streak view are being replaced, not extended — so "table stakes" below are stated against the *new* mental model (rings/closure), not the old one (quadrant calendar). PT rehab and steps tracking are dropped entirely in v2 and are not covered here (see PROJECT.md Out of Scope).

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Freeform text entry for food ("200g chicken, 31g protein/100g") | This is the entire pitch of v2 — MacroFactor and Cronometer both shipped AI/NL entry in 2024-2025 as the new baseline for "fast" logging | MEDIUM | Needs a real parser (Claude Haiku) + a non-AI fallback for offline; see PITFALLS.md for parser reliability risk |
| Editable confirm-before-log screen | MacroFactor: "you can still review, adjust, and confirm every entry before logging" — no mainstream app auto-commits an AI guess without a review step | LOW-MEDIUM | Structured editable fields (name, qty, kcal, P/C/F), not just raw text re-edit |
| One-tap re-log of previously-logged items | MyFitnessPal's swipe-to-repeat-yesterday and "Quick Add" from recents are core retention features; users eat the same 10-20 things on repeat | LOW | This *is* the "smart auto-library" — recent/frequent list surfaced above search |
| Binary one-tap check-off for lift/cardio | Apple's Stand ring and most habit trackers (Streaks app) use a single tap = done model; any friction beyond one tap kills daily compliance for a "did I train" question | LOW | No sets/reps/duration needed — v1 already validated this pattern for lift |
| Daily weight entry, single number, single tap-to-save | Every scale-linked app (Withings, Renpho, Happy Scale) treats raw weight entry as trivial — one field, saved instantly, no required time-of-day discipline enforced by UI | LOW | Don't gate on "did you weigh at the same time" — accept the number, let smoothing handle noise |
| A visible daily completion state (rings/segments) that updates live as sub-goals are met | This is literally why users open Apple Fitness / any streak app — immediate visual reward on each action, not just at midnight | MEDIUM | Ring or ring-like widget must re-render optimistically the instant an entry is saved (Dexie `useLiveQuery` makes this cheap) |
| Long-term weight trend chart (not just raw scatter of daily weigh-ins) | Raw daily weight is dominated by water/sodium/GI-content noise (typically ±0.5-1kg day to day); every serious weight app (Happy Scale, Libra, Trendweight) shows a smoothed trend line, not raw dots alone | MEDIUM | See "Weight Trend Smoothing" pattern below — raw-dots-only is a known complaint pattern in app store reviews of naive weight trackers |
| A consistency/adherence view over weeks-months (not just today) | Users cutting/tracking want to see "am I actually consistent," which single-day UI can't answer; industry pattern is % days logged / adherence score per week | MEDIUM | This is the Dashboard tab's core job — see Differentiators for what makes it more than a % counter |
| Manual on-device API key entry + clear indicator when AI parsing is degraded/unavailable | v2 depends on a client-side Anthropic API key (constraint from PROJECT.md); every app that ships a "bring your own key" AI feature must surface key status and graceful offline fallback or users silently lose the feature | LOW-MEDIUM | Not a "nice to have" — without this, a missing/invalid key looks like a silent bug |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| Zero-friction speak/type-and-done AI parsing (no ingredient database search UI at all) | MacroFactor and Cronometer both still route through a food database/search as the primary path with AI as an accelerant; HealthTracker can skip the database entirely for a 2-user app — freeform parse *is* the primary (and only) entry path | MEDIUM-HIGH | Bigger differentiator than raw AI parsing is *not building a search UI at all* — simpler product surface than any competitor |
| Auto-building personal library with zero manual "create food" step | Competitors (MFP, Cronometer, MacroFactor) still require an explicit "create custom food" flow at least once; here every parse auto-saves, so the library emerges from usage with no separate maintenance screen | MEDIUM | Real differentiator for a 2-person app — no library to seed on day one, unlike MFP's crowdsourced 14M-item DB which the user doesn't need |
| Apple-Fitness-style ring closure applied to *food + lift + cardio* (not steps/exercise/stand) | No consumer nutrition/fitness app directly ports the 3-ring Apple model to "logged food, trained, did cardio" — this is a genuine cross-domain synthesis, not copied from an existing product | MEDIUM | The exact per-segment completion rule (any-log vs hit-target) is the single highest-leverage design decision here — see dedicated section below |
| Dashboard combining weight trend + eating adherence + training consistency as one gamified surface | Most apps silo these (MyFitnessPal = food only, Apple Fitness = activity only, Happy Scale = weight only); combining all three in one glanceable view for a lifter cutting weight is a genuine product synthesis | MEDIUM-HIGH | Complexity is mostly UI/chart composition, not new data; all three data sources already exist from Daily tab logging |
| Data model that anticipates Hevy auto-sync without building it | Lets lift/cardio check-offs be manually toggled today but be "set by an external source" tomorrow with no schema migration | LOW (if planned now) / HIGH (if retrofitted later) | Add a `source: 'manual' \| 'hevy-sync'` field on the check-off record now — near-zero cost today, expensive to bolt on later |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Full nutrition database search/browse (like MFP's 14M foods) | Feels like "what real apps have"; useful when AI parse is wrong or unavailable | Massive scope (licensing/hosting a food DB, search UX, barcode) for a 2-user app where AI parsing + auto-library already covers 95% of repeat entries | Keep the non-AI fallback as a *structured manual entry form* (name + kcal + P/C/F fields), not a searchable database |
| Photo-based AI food recognition (snap a plate, AI identifies items) | MacroFactor and Cronometer both ship this in 2025-2026 and it looks like table stakes for "AI food logging" | PROJECT.md explicitly scopes AI entry to speak/type text only; photo recognition is a materially harder parsing problem (multi-item segmentation, portion estimation) and doubles AI cost/latency | Text/voice-to-text freeform parsing only, as already decided |
| Automatic fuzzy-merge of near-duplicate library items ("chicken breast" vs "Chicken Breast" vs "grilled chicken") | Prevents a cluttered auto-library; feels like it "should just work" | True fuzzy/semantic dedupe (edit distance + synonym matching) is an open-ended NLP problem with real false-positive risk (merging two genuinely different foods); over-engineering for 2 users who can just glance at their own short list | Normalize on exact-match of a lowercased/trimmed name only; on a near-miss, show a lightweight "Use existing 'Chicken breast' or save as new?" prompt at log time — human makes the call, not an algorithm |
| Streak freezes / grace periods / "protect my streak" mechanics | Common gamification ask once a streak view exists — users fear losing a chain | PROJECT.md explicitly excludes streak-freeze gamification as scope creep; also encourages "logging to protect a number" rather than genuine consistency | If motivation dips are a problem later, address via Dashboard trend context (e.g., "3 of last 7 days closed"), not artificial streak protection |
| Real-time or push-notification reminders ("You haven't logged today!") | Feels like an obvious retention lever, and Apple Fitness itself nudges via notifications | Explicitly out of scope per PROJECT.md; also requires background service worker push permissions that add real complexity to an offline-first PWA with no backend to trigger them | Rely on the visual closure/ring state being satisfying enough on open; this is the core value bet already made |
| Weight goal/target with "days to goal" projections | Common in weight-loss apps (Happy Scale, Lose It) and feels motivating | Adds a whole projection/rate-of-loss modeling surface (calorie deficit math, TDEE estimation) that isn't in PROJECT.md scope — scope creep from "track weight" into "coach weight loss" | Trend line + raw log only; no projected end-date or required-deficit calculations for v2 |
| Configurable/complex smoothing algorithm choice (like Happy Scale's 4 methods: EMA, 7-day MA, Happy Scale Smoothing, Double ES) | Power users of weight-tracking apps expect algorithm choice | Massive UX/complexity overkill for 2 casual users; Happy Scale itself recommends its own most complex method by default, suggesting most users don't want to choose | Ship one fixed, well-tuned smoothing method (recommend 7-day trailing EMA — see below) with no user-facing algorithm toggle |

## Feature Dependencies

```
[AI freeform food parsing]
    └──requires──> [Anthropic API key storage + settings UI]
    └──requires──> [Local structured-entry fallback] (must exist for offline/no-key case)
    └──enhances──> [Smart auto-library]

[Smart auto-library]
    └──requires──> [AI freeform food parsing] (or fallback manual entry — library needs *a* parse source)
    └──enables──> [One-tap re-log of recent/frequent items]

[One-tap lift check-off] ──already exists (v1)
[One-tap cardio check-off] ──net-new, same pattern as lift check-off

[Daily closure ring]
    └──requires──> [Food logged signal] (from AI parse OR fallback OR auto-library re-log)
    └──requires──> [Lift check-off state]
    └──requires──> [Cardio check-off state]
    └──conflicts with──> [v1 4-quadrant streak calendar] (being replaced, not both)

[Weight entry]
    └──enables──> [Weight trend smoothing/chart]

[Dashboard tab]
    └──requires──> [Daily closure history] (for training/eating consistency trend)
    └──requires──> [Weight trend smoothing/chart]
    └──requires──> [Food logged / adherence signal per day]

[Hevy-sync-ready data model] ──enhances──> [Lift/cardio check-off] (adds a `source` field now, no behavior change until sync is built later)
```

### Dependency Notes

- **AI parsing requires an API key + fallback:** Building the daily-closure ring and Dashboard on top of "food logged" as a signal means that signal must be reliable even without network/API key — so the structured local fallback isn't optional polish, it's a hard dependency of the closure feature working at all. Build the fallback in the same phase as AI parsing, not later.
- **Auto-library requires *a* parse source, not necessarily AI:** The library can be seeded by either AI-parsed results or the manual fallback form — both write the same normalized record shape. This decouples "library exists" from "AI parsing must always succeed."
- **Daily closure conflicts with the v1 calendar:** These are mutually exclusive UI concepts for the same underlying "did I log today" data — do not build the new ring alongside the old quadrant view; it's an explicit replace.
- **Dashboard requires closure history to already be capturable:** Dashboard is downstream of the closure model — sequence closure/logging phases before Dashboard, not in parallel, since Dashboard is a read/aggregate view over data the other features produce.
- **Hevy-sync-readiness is a schema-only dependency:** No behavior depends on it now; it just means the lift/cardio check-off record shape should be decided with a `source` discriminator up front so no migration is needed later.

## Ring-Closure Semantics — Options and Recommendation

This is the single highest-leverage open decision (already flagged in PROJECT.md/CLAUDE.md as "exact visual/completion TBD"). Options, drawn from how Apple and nutrition apps define "done":

**Option A — Any-log per segment (binary presence)**
- Food segment closes the moment *any* food is logged that day, regardless of whether it hits calorie/macro targets.
- Matches Apple's Stand ring (any 1 minute of standing in the hour closes it — not "stood for the whole hour").
- Pro: Lowest friction, matches "speak/type and done" entry-friction bar from PROJECT.md; avoids punishing a day where the user logged honestly but went over/under target.
- Con: A user could log one small snack and "close" the food segment while wildly under-eating — the ring stops meaning "did well" and starts meaning "did anything."

**Option B — Hit-target per segment (goal-based)**
- Food segment closes only when logged calories/macros land within a target band (e.g., ±10% of calorie goal, protein ≥ target).
- Matches Apple's Move ring (must reach the *full* calorie goal, not just "moved at all").
- Pro: Closer to "actually on track," which matters more for two people cutting/tracking macros with a real physique goal.
- Con: Higher friction psychologically — a legitimately-logged but over/under day never closes, which can feel punishing and erode the "satisfying win" feeling that PROJECT.md identifies as the core value. Apple's own Move ring is well documented as the ring users find hardest to close consistently and most often adjust/lower to make achievable.

**Option C — Hybrid (recommended): any-log closes the segment visually "logged," with a secondary in-ring indicator (color/fill intensity) for on-target vs off-target**
- The ring/segment fills (closes) on any log — preserving the low-friction, always-achievable daily win described in PROJECT.md's core value statement.
- A secondary visual cue (e.g., a different shade, a small checkmark vs a dot, or an inner ring) distinguishes "logged and within target" from "logged but off target," surfaced prominently on the Dashboard's adherence view rather than gating the daily closure itself.
- This mirrors Apple's own general pattern: the *ring itself* is calibrated to be achievable daily (so closing feels good and habitual), while more precise "was this a good day" analysis lives in longer-term views (weekly/monthly summaries), not in daily pass/fail framing.
- **Recommendation: adopt Option C.** It resolves the PROJECT.md open question ("any-log" vs "hit-target") by not forcing an either/or — closure = low-friction presence signal (protects the core value of an always-winnable daily loop), while the Dashboard's adherence score (industry research cited below shows 80%+ adherence is the outcome that actually predicts results) carries the "did I actually hit my macros" precision that Option B was trying to capture.
- Lift and cardio check-offs are inherently binary already (Option A only makes sense for them — there's no "partial" lift day in this model), so this hybrid only needs special handling for the food segment.

Confidence: MEDIUM — Apple's own ring-design tradeoffs (Move=goal-based vs Stand=any-activity) are well documented; the specific hybrid resolution for food is a synthesized recommendation, not observed in a shipped competitor product.

## Weight Trend Smoothing — Pattern and Recommendation

Raw daily weigh-ins are noisy (water, sodium, GI content, time-of-day) — every credible weight-trend tool smooths before displaying a trend line. Patterns observed:

- **Simple 7-day (or N-day) trailing moving average** — averages the last N raw entries. Cheap, well-understood, but lags behind real trend changes by several days and needs entries most days to stay meaningful.
- **Exponential moving average (EMA/exponential smoothing)** — weights recent entries more heavily than older ones; reacts faster than a flat moving average while still damping single-day noise. Standard formula: `trend_today = alpha * raw_today + (1 - alpha) * trend_yesterday`, with alpha commonly in the 0.1-0.3 range for daily weight data.
- **Advanced bidirectional smoothing (Happy Scale's proprietary method, double-exponential smoothing)** — considers both past *and* future data points to reduce lag further, at the cost of retroactively adjusting recent days' trend values as new data comes in, and materially higher implementation complexity.

**Recommendation:** Use a simple trailing EMA (alpha ≈ 0.1-0.15, tunable) computed client-side over the weight log. This gives a smooth, always-moving trend line without the complexity or "recent days change after the fact" surprise of bidirectional methods, and doesn't require a configurable-algorithm UI (an anti-feature above). Missing days should simply not update the EMA (carry forward last computed trend value) rather than requiring daily entries to remain valid — this matches the low-friction, "one number, no discipline enforcement" table-stakes expectation. Show raw dots + smoothed line together on the Dashboard chart (both signals are standard in Libra/Trendweight/Happy-Scale-style tools) so users can see actual entries alongside the trend.

Confidence: HIGH on the general math/pattern (well-documented, corroborated across Happy Scale docs and general exponential-smoothing literature); MEDIUM on the specific alpha recommendation (a reasonable default, should be spot-checked against a few weeks of real data during implementation rather than treated as exact).

## AI Food-Parse UX — Confirm/Edit Flow

Based on MacroFactor's shipped (beta) AI logging flow, the expected shape of a "good" AI-parse UX is:

1. **Input:** freeform text (typed or voice-to-text transcribed) — no structured fields required at input time.
2. **Parse (async):** call sent to Claude Haiku; show a lightweight loading/streaming state rather than a blocking spinner if latency is non-trivial (MacroFactor "streams" results into the plate as they resolve).
3. **Structured, editable result — never auto-committed:** the parsed output must render as a **pre-populated but editable form** (name, quantity/unit, calories, protein, carbs, fat), not a locked confirmation dialog. Every mainstream implementation reviewed treats "user reviews and can tweak before it's saved" as non-negotiable — MacroFactor states this explicitly ("recommend everyone review results"), and no competitor auto-logs an AI guess without this step.
4. **Explicit confirm action** (tap "Log" / "Save") — separate from the parse step, so parsing failures or bad guesses never silently create a log entry.
5. **Failure/ambiguity handling:** if the parser can't confidently extract a food+quantity, fall back to presenting the raw structured-entry form pre-filled with whatever *was* extracted (e.g., calories present but protein missing) rather than blocking the user or returning an error with no path forward.
6. **Offline/no-key path:** the same structured form (from step 3) must be reachable directly, without ever calling the AI, as the local fallback — meaning the "editable structured food record" UI is actually the single core building block; AI just pre-fills it, it doesn't replace it.

Confidence: MEDIUM — based on MacroFactor's public marketing/help-doc description of their beta AI feature, not a hands-on trial; the general "always editable, always explicit confirm" pattern is corroborated across every food-logging app surveyed (MFP, Cronometer, MacroFactor) and considered a firm expectation, not a nice-to-have.

## Auto-Library and Quick Re-Log Patterns

- **Library entry = a side effect of logging, not a separate CRUD flow.** Every successful parse+confirm (AI or fallback) writes a reusable library record automatically — this is the "auto-library" differentiator and removes v1's manual "create food" step entirely.
- **Dedupe on exact normalized match only** (trim + lowercase + collapse whitespace) at auto-save time. If a normalized match already exists in the library, update/reuse that record rather than creating a second one; do not attempt fuzzy/semantic matching (see Anti-Features) — surface a lightweight "Use existing X?" choice only when the *user* is actively re-logging and types something close to an existing name, not as background auto-merging.
- **Recent/frequent list surfaced above search, not below it** — MyFitnessPal's swipe-to-repeat and Quick Add patterns confirm the expectation: the most common action (log something you've logged before) should require the fewest taps, meaning frequently-used or most-recent items are the *default* visible list when opening the food entry screen, with freeform AI entry as the escape hatch for anything new — not the other way around.
- **One-tap re-log copies the full prior record** (name + quantity + macros) into today's log with a single interaction — no re-parsing, no re-confirming needed for an exact repeat, though the copied entry should remain editable in case portion size changed.

Confidence: MEDIUM — MyFitnessPal's recent/quick-add/copy-meal patterns are well documented and directly transferable; the specific "auto-save on every parse with exact-match dedupe" design is a synthesized recommendation (no competitor publishes an "auto-library with zero manual creation" flow to compare against directly), flagged LOW-MEDIUM on that specific piece.

## MVP Definition

### Launch With (v2.0)

Minimum viable product for this milestone — matches PROJECT.md's Active requirements list.

- [ ] AI freeform food parsing (Claude Haiku) with editable confirm-before-log screen — core entry-friction bet
- [ ] Local structured-entry fallback (same editable form, no AI call) — required for offline/no-key correctness, not optional polish
- [ ] Auto-library (exact-normalized-match dedupe) + recent/frequent one-tap re-log list
- [ ] One-tap lift check-off (carried from v1) + one-tap cardio check-off (net new, same pattern)
- [ ] Daily weight entry (single field, single save)
- [ ] Daily closure ring using the Option C hybrid semantics (any-log presence per segment, with target-hit as a secondary indicator, not a closure gate)
- [ ] Daily tab: today's ring/closure state + all four entry points (food, lift, cardio, weight)
- [ ] Weight trend chart with EMA smoothing (raw dots + smoothed line)
- [ ] Dashboard tab: weight trend + eating adherence (% days logged / on-target) + training consistency (lift/cardio check-off rate) over weeks/months
- [ ] JSON export/import updated for v2 schema (food library, closure records, weight log, check-off `source` field)

### Add After Validation (v2.x)

- [ ] Tune EMA alpha and adherence-band thresholds against real usage data once both users have a few weeks of logs
- [ ] Hevy API auto-sync for lift/cardio check-offs (data model already supports it via `source` field; building the actual sync is deferred until a user has Hevy Pro)
- [ ] Refine ambiguous-parse handling (e.g., multi-item freeform entries like "chicken and rice with veggies") if single-item assumption proves too limiting in real use

### Future Consideration (out of this milestone)

- [ ] Photo-based food recognition — explicitly deferred per PROJECT.md, larger AI-cost/complexity jump than text parsing
- [ ] Weight goal projections / time-to-goal estimates — scope creep from tracking into coaching
- [ ] Configurable smoothing algorithm choice — unnecessary complexity for 2 users
- [ ] Any shared/social view between the two users — deliberately deferred per PROJECT.md (independent installs)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| AI freeform food parsing + confirm/edit UI | HIGH | MEDIUM-HIGH | P1 |
| Local structured fallback form | HIGH (unblocks offline correctness) | LOW-MEDIUM | P1 |
| Auto-library + recent/frequent one-tap re-log | HIGH | MEDIUM | P1 |
| Cardio one-tap check-off | MEDIUM-HIGH | LOW | P1 |
| Weight entry | HIGH | LOW | P1 |
| Daily closure ring (hybrid semantics) | HIGH (core motivator) | MEDIUM | P1 |
| Weight trend smoothing (EMA) | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Dashboard (weight + adherence + consistency) | HIGH | MEDIUM-HIGH | P1 |
| Hevy-sync-ready `source` field on check-offs | LOW now / HIGH later if skipped | LOW | P1 (cheap insurance) |
| Actual Hevy API sync | MEDIUM | HIGH | P3 (deferred, needs Hevy Pro) |
| Fuzzy/semantic library dedupe | LOW-MEDIUM | HIGH | P3 (anti-feature, avoid) |
| Photo food recognition | MEDIUM | HIGH | P3 (explicitly out of scope) |

**Priority key:**
- P1: Must have for this milestone (v2.0)
- P2: Should have, add when possible (none identified beyond P1/P3 for this scoped milestone)
- P3: Deferred/out of scope for v2.0

## Competitor Feature Analysis

| Feature | MacroFactor | MyFitnessPal | Apple Fitness | Happy Scale | Our Approach |
|---------|-------------|--------------|----------------|-------------|--------------|
| AI food entry | Photo + text, streams results into editable "plate", beta as of 2025 | Meal Scan (photo) + traditional search; AI is additive, not primary | N/A | N/A | Text/voice only (no photo), AI-first with structured fallback as equal-citizen path, not a secondary option |
| Confirm before log | Explicit editable review step, required | Standard log-then-edit | N/A | N/A | Same pattern: editable structured form before save, no auto-commit |
| Recent/repeat logging | Custom foods + recipes | Quick Add, swipe-to-repeat-yesterday, saved Meals | N/A | N/A | Auto-library is the *only* library — every parse builds it, no manual creation step at all |
| Daily completion visual | Macro bars only, no ring/streak concept | Streak counter (days logged), no ring | 3-ring Move/Exercise/Stand, any-activity vs goal-based per ring | N/A | 3(ish)-segment ring: food/lift/cardio, hybrid any-log + secondary on-target indicator |
| Weight trend | Basic weight log, no smoothing emphasis | Basic weight log | N/A (not weight-focused) | Multiple smoothing algorithms (EMA, MA, proprietary, double-ES), user-selectable | Fixed EMA, no user-facing algorithm choice — raw dots + one smoothed line |
| Cross-domain dashboard | Food-focused only | Food-focused only | Activity-focused only | Weight-focused only | Combines weight + eating adherence + training consistency in one Dashboard — the actual product synthesis of this milestone |

## Sources

- MacroFactor — [AI-Powered Food Logging](https://macrofactor.com/ai-food-logging/) (MEDIUM confidence — official product page, describes shipped beta behavior)
- MacroFactor Help Center — [AI Food Logging](https://help.macrofactorapp.com/en/articles/258-ai-food-logging) (MEDIUM confidence — official docs)
- MyFitnessPal Blog — [Copy and Remember Meals](https://blog.myfitnesspal.com/copy-and-remember-meals/) (HIGH confidence — official docs describing shipped feature)
- MyFitnessPal Support — [Your Today tab](https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab) (HIGH confidence — official docs)
- Apple — [Close Your Rings](https://www.apple.com/watch/close-your-rings/) (HIGH confidence — official product description)
- AppleToolBox — [Move vs. Exercise Rings](https://appletoolbox.com/apple-watch-move-vs-exercise-rings/) (MEDIUM confidence — third-party but consistent with Apple's own docs on any-activity Stand ring vs goal-based Move ring)
- Apple Support — [Adjust your Activity ring goals](https://support.apple.com/en-ca/guide/watch/apd29b30023c/watchos) (HIGH confidence — official docs)
- Happy Scale — [Support / smoothing methods](https://happyscale.com/support) and [Version 4.6 notes](https://happyscale.com/version46) (MEDIUM confidence — official vendor docs describing their own algorithm tradeoffs)
- Wikipedia — [Exponential smoothing](https://en.wikipedia.org/wiki/Exponential_smoothing) (HIGH confidence — standard reference math, used to corroborate EMA recommendation)
- Trophy.so — [The Psychology of Apple Watch's "Close Your Rings"](https://trophy.so/blog/the-psychology-of-apple-watchs-close-your-rings) (LOW-MEDIUM confidence — third-party analysis, used only for general streak-psychology framing, not as a primary technical source)
- General fuzzy-matching literature (DataLadder, WinPure guides) (LOW confidence for this application — used only to establish that fuzzy dedupe is a nontrivial, error-prone technique, supporting the anti-feature recommendation, not to source a specific implementation pattern)
- `.planning/PROJECT.md` (project source of truth for v2.0 requirements, constraints, and already-locked decisions)

---
*Feature research for: HealthTracker v2.0 Duo Redesign — AI food parsing, ring closure, weight trend, dashboard*
*Researched: 2026-08-08*
