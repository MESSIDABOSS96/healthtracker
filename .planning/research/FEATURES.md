# Feature Research

**Domain:** Personal PWA health/fitness tracker (4-domain daily consistency tool)
**Researched:** 2026-04-19
**Confidence:** HIGH (core patterns), MEDIUM (PT-specific), HIGH (anti-patterns)

---

## Scope Boundary Reminder

The following are **explicitly out of scope** per PROJECT.md and are not re-proposed anywhere in this document:
- Full lift tracking (sets/reps/weight)
- User auth / cloud sync / backend
- Apple Health / Google Fit integration
- Barcode scanning / third-party nutrition APIs
- Social features, leaderboards
- Bodyweight, hydration, sleep, mood tracking

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume any tracker has. Missing these = product feels broken or half-finished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Daily macro progress bars (cals + P/C/F) | Every macro tracker shows remaining-vs-goal at a glance. Users can't make food decisions without it. | LOW | "Remaining" counter above the log is the dominant pattern (MacroFactor, Cronometer, MFP all do this). Show consumed + remaining simultaneously. |
| Per-food entry: name + calories + P/C/F | Baseline unit of food tracking. Without custom fields, the library is useless. | LOW | Already in scope. Five fields max. |
| Configurable daily targets (cals, P, C, F, steps) | Users start with targets from their coach/app; need to enter their own. Without this, the tracker can't tell them how they're doing. | LOW | Already in scope. Simple settings form. |
| Meal groupings (Breakfast / Lunch / Dinner / Snacks) | Users mentally categorize eating by meal. Flat time-based logs (MacroFactor's timeline) are elegant but require adaptation. For a personal tool eating known repeated meals, named buckets match the mental model. | LOW | Flat "add food" with optional meal label is sufficient. Don't force rigid buckets — allow anything under any label. |
| Food search / recall within personal library | Without fast recall, users re-enter the same food daily and quit. Recall of recent/frequent foods is the single biggest friction reducer. | LOW-MEDIUM | Prioritize: (1) recents list, (2) search by name. Already in scope as "recall for repeat meals." |
| Day-level log view (what I ate today, what PT I did) | Users need to review today's data before logging more and to verify they've completed everything. | LOW | Already implied by scope. One screen per day, 4 sections. |
| Offline-first operation | Users log in gyms, kitchens, and PT clinics — connectivity is unreliable. App must work fully offline. | MEDIUM | PWA + IndexedDB + Service Worker. Already in scope. |
| Home-screen installability (PWA) | Users expect phone-app behavior. Without "Add to Home Screen," the product feels like a website, not a tool. | LOW | Web App Manifest + beforeinstallprompt. Already in scope. |
| Edit / delete past entries | Users make mistakes. An immutable log is unusable. | LOW | Applies to food entries, PT sessions, step counts, lift check-ins. |
| Visual daily completion state | The core motivator. Without this, there's no reason to log. Each day must communicate "done" or "incomplete" instantly. | MEDIUM | Already the core feature. 4-segment indicator. |
| Calendar / month history view | Users check streaks retroactively and feel progress or regret. Without a multi-week view, the motivational loop is broken. | MEDIUM | Already in scope. Critical MVP feature. |

---

### Differentiators (Drive Retention / Competitive Advantage)

Features that set this product apart. Not expected, but they create the habit loop and align with the Core Value (visual consistency feedback that makes logging feel like a win).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 4-segment partial-fill day indicator | No mainstream app ties PT + food + steps + lifts into a single unified daily visual. This is the core motivator — each area fills its segment as logged, complete only when all four done. Direct evidence: user reports that lift-tracker calendar streaks "meaningfully drive consistency." | HIGH (design), MEDIUM (implementation) | The defining differentiator. Every UX decision should serve this. Partial fill matters: a half-logged day still shows progress and maintains momentum. |
| Food photo attachment on library entries | Allows visual confirmation when re-logging ("is this the right ground beef?"). Reduces wrong-food errors for repeat meals. | MEDIUM | Photos stored as IndexedDB blobs. Thumbnail in search results. Not per-log-entry — per library food item. |
| PT session vs. template diff view | Show target (template) vs. actual (logged) sets/reps side-by-side. Rehab requires tracking whether you hit prescribed load. This is the #1 PT-specific feature missing from generic workout apps. | MEDIUM | On log completion screen: "Target: 3x15 / Actual: 3x12 — Notes: pain at rep 13." |
| Per-session PT notes field | Rehab generates daily observations ("left knee felt tight," "no pain at new weight"). Nowhere in generic trackers. | LOW | Free-text, per-session. Already in scope. Critical for rehab feedback loop. |
| Pain/difficulty rating per PT session | Used in clinical rehab tracking. Allows spotting patterns ("always 7/10 on eccentric days"). 0-5 or 0-10 scale. | LOW | Optional field on PT session log. Single number. Massive value for injury context. |
| Configurable step goal with progress indicator | Step goal is personal (user is on a cut; NEAT matters). A progress bar toward today's step goal gives the "ring fill" feeling. | LOW | Already in scope as goal. The progress bar is the differentiator — not just displaying steps logged. |
| Quick-log lift check-in (one-tap from calendar) | Minimum possible friction for the lift yes/no. One tap on today's calendar segment = done. | LOW-MEDIUM | Already in scope. Consider making this the fastest possible interaction — the daily calendar cell itself is tappable to toggle lift check-in. |
| "Repeat yesterday's meals" or meal templates | Users on a cut eating the same meals repeatedly (user explicitly said "4 servings of same ground beef") need this. One-tap re-log a previous day's food or a saved meal combo. | MEDIUM | v1.x feature. Log "Ground Beef Bowl" as a combo that adds all its constituent foods. Saves minutes daily. |
| Streak count display | Shows the raw number of consecutive complete days. Amplifies the calendar visual with a concrete number. | LOW | "You've logged all 4 areas for 14 days straight." Pairs with the calendar. |
| Exercise progression notes on PT template | Flag which exercises to increase weight/reps when pain allows. Tracks the "when can I progress?" decision over time. | LOW | Add optional "Progression note" field on each template exercise. Not algorithmic — just a text note the user wrote when they hit the milestone. |

---

### Anti-Features (Commonly Added, Deliberately Avoided)

Features that seem like good ideas but create friction, abandon triggers, or scope creep. Document these to prevent re-addition.

| Feature | Why Requested | Why It Backfires | What to Do Instead |
|---------|---------------|------------------|--------------------|
| Push notifications / reminders | "I'll forget to log" — users want nudges. | 2025 research: excessive notifications are the #1 reason users delete fitness apps. Notification fatigue is real. For a solo personal tool you've installed on your home screen, you remember it. | None. The calendar visual is the ambient reminder — an incomplete day stares at you. |
| Adaptive macro targets (auto-adjustment) | MacroFactor's signature feature. "App adjusts my targets based on weight trends." | Requires weight logging, weekly trend analysis, and algorithmic output — significant added scope. User explicitly excluded bodyweight tracking. Without weight data, adaptation is meaningless. | Fixed configurable targets in Settings. User manually adjusts when their coach says to. |
| Points / badges / gamification layers | "Make logging fun." | Research (Frontiers in Psychology, 2025): badge complexity positively predicts "gamification burnout" and app abandonment. The S-curve shows engagement peaks at moderate feature richness and collapses at excessive richness. | The 4-segment indicator IS the gamification. It is exactly enough. Do not add badge overlays, XP, level-ups, or achievements on top of it. |
| Social features / sharing | "Show friends my streaks." | Explicitly out of scope. Social comparison adds anxiety for solo-motivation tools. The user's stated motivation is personal consistency, not competition. | None. |
| Onboarding tour / lengthy setup wizard | "Users need guidance." | Apps with forced onboarding see the highest Day-1 abandonment. Studies show reducing onboarding friction by 50% doubles retention. | Ship with sane defaults. Let the user explore. A minimal "first run" tip overlay (dismissable immediately) is the ceiling. |
| Micronutrient tracking (vitamins, minerals, fiber, sodium) | "I want to track everything." | Cronometer tracks 84+ micronutrients. This is scope creep for a cut-focused macro tracker. Adds data entry fields, visualization complexity, and cognitive load. | Track only: calories, protein, carbs, fat. That's it. These are the levers for a cut. |
| AI meal suggestions / "what should I eat?" | Trendy in 2025-2026 apps. | Requires a backend or local model. Completely incompatible with offline-only, no-server constraint. Adds complexity for a feature the user didn't request. | The food library recall already solves "what should I eat?" by surfacing what the user actually eats. |
| Multi-day food copy (copy yesterday to today) | "I eat the same thing every day." | Useful but dangerous: one wrong day copies wrong data repeatedly. Silently creates inaccurate logs. | Better: meal templates (saved combos) the user explicitly re-logs. Intentional, not automatic. |
| Barcode scanning / nutrition API lookup | Faster food entry for packaged foods. | Explicitly out of scope. User eats repeat home-cooked meals. External API = dependency + rate limits + connectivity requirement. | Custom food library already solves this for the user's specific eating patterns. |
| Calendar edit for past days (retroactive streaks) | "I forgot to log, but I did do it." | Creates false streak data. The value of the streak is its integrity. Allowing retroactive edits defeats the motivational loop. | Allow editing today and yesterday only (yesterday for timezone-edge cases). Lock older days. Or: allow edits with a visual "retroactive log" indicator so the calendar shows it differently. |
| Water / hydration tracking | "Complete health picture." | Explicitly out of scope. Adds a 5th segment to the 4-segment indicator, breaking the core design. | Out of scope permanently unless the 4-segment design is revisited. |
| Dark-pattern streaks (freeze tokens, grace days) | Duolingo-style streak protection. | Creates psychological debt and anxiety. For an injury-recovery tool, missing a PT day due to pain is sometimes the right medical decision. Penalizing it with streak loss is harmful. | Show compassion: display a "missed day" as a neutral grey cell, not a red X. The streak shows the positive pattern, not the penalty. |

---

## Streak / Consistency Visualization Patterns

Research across GitHub, Apple Fitness, Strava, Duolingo, and habit-tracker apps surfaces 4 dominant patterns. Analysis of what works and why follows.

### Pattern 1: GitHub Contribution Heatmap

**What it is:** A year-in-view calendar grid where each cell is colored by intensity (contribution count). More activity = darker green. Empty = grey.

**Engagement mechanic:** Endowed progress effect + loss aversion. Seeing months of colored cells makes you not want to break the pattern.

**Strengths:** Shows long-term arc instantly. A full year at a glance.

**Weaknesses:** Single-dimension — intensity only. Can't show multi-area partial completion.

**Fit for this project:** The calendar month view should borrow the grid layout and the cell-per-day approach. The color fill, however, should encode 4-area completion state, not intensity. A cell that is 2/4 areas logged should look different from 4/4. This is a meaningful improvement on the GitHub pattern for this use case.

**Implementation:** Libraries like `cal-heatmap` (JavaScript) and `react-calendar-heatmap` are production-ready. Shadcn Calendar Heatmap (2026) offers TypeScript + Tailwind variant-based styling.

---

### Pattern 2: Apple Watch Activity Rings

**What it is:** Three concentric rings (Move / Exercise / Stand), each a different color. Each fills clockwise from 0% to 100% as you hit your daily target for that metric. Rings "close" when you hit 100%.

**Engagement mechanic:** Gestalt Closure principle — open rings create a "mental itch" that motivates action. The brain wants to see circles closed.

**Strengths:** Instantly communicates multi-metric partial progress. You can see at a glance that you're 80% on Move but 0% on Stand. Ring closure is visually satisfying.

**Weaknesses:** Three rings only. Requires a watch to generate data.

**Fit for this project:** The 4-segment day indicator is a direct conceptual relative. Each segment = one tracking area. Partial fill within each segment (e.g., macros at 70% of target) maps naturally to the ring fill metaphor. The daily cell in the calendar view is the post-hoc record of whether rings closed that day.

**Critical design note:** The ring/segment should show meaningful partial state, not binary. A day where you logged PT + food but missed steps and lifts should show as 2/4 filled — not "incomplete" in an undifferentiated way.

---

### Pattern 3: Strava Training Calendar

**What it is:** Month-view calendar where each day with an activity shows a colored activity-type icon. Days without activity are blank.

**Engagement mechanic:** Density = visible progress. A month of filled cells feels like accomplishment.

**Strengths:** Multitype activity awareness (runs, rides, swims). Activity-specific color coding.

**Weaknesses:** Binary per activity type — either you logged or you didn't. No partial fill. No unified "did I have a complete day?" view.

**Fit for this project:** Borrow the month-grid layout and the per-day visual richness. The 4-segment cell is a more informative evolution of the Strava dot — it shows composition, not just presence.

---

### Pattern 4: Duolingo Streak Counter

**What it is:** A flame icon with a consecutive-days count. Simple. Prominent on the home screen.

**Engagement mechanic:** Loss aversion — breaking a streak feels like losing a possession.

**Weaknesses:** Binary (streak continues or breaks). No composition. No historical view without navigating to stats. Freeze tokens introduce psychological debt.

**Fit for this project:** Include a streak count display alongside the calendar, but treat it as secondary. The calendar heatmap is the primary motivator because it shows recovery, not just the current chain. A 30-day calendar with 28 complete days is more informative and more motivating than a "streak: 28" counter with no context.

**Important distinction:** Do NOT implement streak freeze/grace-day mechanics. For injury recovery, a missed PT day may be medically necessary. The system should record honestly, not encourage gaming.

---

### Recommended Visual Pattern for This Project

Combine elements from Patterns 1 + 2:

- **Day cell** (in month calendar): A small square with 4 quadrant segments. Each quadrant fills with color when its tracking area is logged for that day. All 4 filled = complete cell (full color, possibly a subtle glow or checkmark). 0/4 = empty grey cell. 2/4 = half-filled, showing which two areas.
- **Today's view** (home screen): Full-size 4-segment ring or quartered circle showing today's live state. Each segment animates to fill as the user logs.
- **Streak counter**: Simple number shown near the calendar header. "N consecutive complete days."
- **Monthly summary**: X/30 complete days this month shown in small text below the calendar.

This combination is novel, directly purposeful, and implementable without complex libraries.

---

## PT / Rehab-Specific Features

Physical therapy tracking has distinct requirements from general workout logging. Sources: clinical rehab literature, AAOS exercise programs, PT app user feedback.

### What Matters for Tendonitis / Tennis Elbow Self-Management

**Evidence base:** Rehab protocols for lateral epicondylitis run 6-12 weeks with gradual load progression. The patient's job is to: (1) do the prescribed exercises consistently, (2) track pain/difficulty, (3) progress weight/reps when pain allows, (4) not overdo it.

| PT-Specific Feature | Why It Matters | Complexity | Priority |
|---------------------|---------------|------------|----------|
| Template model (prescribed exercises with target sets x reps) | PT prescribes a program. User needs to reproduce it exactly each session without re-entering it. | MEDIUM | P1 — already in scope |
| Per-session actual sets x reps (vs. target) | Did you hit the prescription? Missing reps is clinically meaningful for tendon load management. | LOW | P1 — already in scope |
| Per-session notes (free text) | "Pain spiked at eccentric phase," "added 0.5kg," "skipped last set." This is the rehab journal. | LOW | P1 — already in scope |
| Pain/difficulty rating per session (0-5 or 0-10) | The core rehab signal. Clinical protocols track pain during, immediately after, and next-day. A simple 0-5 number captures this. | LOW | P1.5 — not yet in scope, HIGH value |
| Progression note on template exercise | "Advance weight when 3x15 for 2 consecutive sessions with pain <= 2/5." The PT tells you the rule; you record it here. | LOW | P2 — not yet in scope, MEDIUM value |
| Session-to-session history per exercise | See that you did 3x12 @ 2kg last Tuesday and 3x15 @ 2kg this Tuesday. Trend visible without a chart. | LOW-MEDIUM | P2 — requires per-exercise log history view |
| "Did I do PT today?" calendar segment (already in scope) | The most important feature. Consistency is the primary outcome variable in tendon rehab. | MEDIUM | P1 — already in scope |

**What generic workout apps miss for PT:**
- No concept of "prescribed vs. actual" — they just log what you did
- No pain/symptom field
- No rehab progression rules
- No session-level notes linked to the day's completion state

**What to explicitly NOT add for PT:**
- Exercise video library (scope creep; user knows their exercises from their PT)
- PT-therapist communication / sharing (no backend, no auth)
- Automated progression algorithms (too complex; user and PT make this decision)
- Exercise form analysis (computer vision; completely out of scope)

---

## Feature Dependencies

```
4-Segment Calendar View
    └──requires──> Daily Log State (is each area "complete" today?)
                       └──requires──> Food Log (any meals logged = partial; hit target = full?)
                       └──requires──> PT Session Log (any session logged today)
                       └──requires──> Step Entry (step logged today)
                       └──requires──> Lift Check-in (yes/no logged today)

Food Log Entry
    └──requires──> Food Library (foods must exist to be logged)
    └──enhances──> Macro Progress Bars (bars update on log)

PT Session Log
    └──requires──> PT Template (session is logged against a template)
    └──enhances──> Session History per Exercise (enables trend view)

Macro Progress Bars
    └──requires──> Daily Macro Targets (configurable in Settings)
    └──requires──> Food Log Entries (data source)

Step Progress Indicator
    └──requires──> Step Goal (configurable in Settings)
    └──requires──> Step Entry (manual, per day)

JSON Export
    └──requires──> All data models (food library, PT templates, logs, settings)

Pain/Difficulty Rating [proposed addition]
    └──enhances──> PT Session Log (optional field)
    └──enhances──> Session History per Exercise (trend signal)

Meal Templates [v1.x]
    └──requires──> Food Library (template references library foods)
    └──enhances──> Food Log Entry (one-tap bulk add)
```

### Dependency Notes

- **Calendar requires all four logging areas:** The 4-segment indicator cannot be built until all four log types exist. Build all four in Phase 1 or the calendar renders empty.
- **Food log requires library:** You cannot log food that doesn't exist in the library. The food creation UI must be built before or alongside food log entry.
- **PT session requires template:** A session is "log against this template." Templates must exist first. Ship template creation in the same phase as session logging.
- **Macro bars require targets:** Showing progress % requires a denominator. Settings must ship with food logging, not after.
- **JSON export requires stable data models:** Export should come after the data model stabilizes (after all four logging areas ship). Exporting an early-phase schema and then changing it creates import incompatibility.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — the "working personal tool" milestone.

- [ ] Food library (create food with name + macros + optional photo) — foundational data layer
- [ ] Food log (log foods to today, per meal label, see macro progress bars) — primary daily interaction
- [ ] Daily macro targets (calories, P, C, F) in Settings — makes the progress bars meaningful
- [ ] PT templates (create reusable template: exercise name + target sets x reps) — setup once
- [ ] PT session log (log a session against a template with actual sets x reps + notes) — daily PT logging
- [ ] Manual step entry with step goal + progress indicator — simplest of the four areas
- [ ] Daily lift check-in (yes/no + optional note) — lowest-friction interaction
- [ ] 4-segment day indicator on today view (partial fill per area) — the core motivator
- [ ] Calendar month view (cells show per-day completion state) — streak loop closes here
- [ ] Installable PWA (manifest + service worker + offline IndexedDB) — phone home-screen delivery
- [ ] JSON export — data portability safety net before daily use begins
- [ ] Dark mode, minimal aesthetic

### Add After Validation (v1.x)

Add once the core loop is confirmed working and daily use is established.

- [ ] Pain/difficulty rating (0-5) on PT sessions — HIGH value for rehab feedback; LOW complexity; left out of v1 only because it's not yet in scope and should be validated as wanted
- [ ] Session history per exercise (see previous actuals when logging) — motivation + rehab signal
- [ ] Meal templates / combo recall (save a meal set, re-log with one tap) — major QoL for repeat eaters
- [ ] Streak count display (consecutive complete days counter) — amplifies calendar visual
- [ ] Progression notes on PT template exercises — captures PT advice in-app
- [ ] JSON import (restore from export) — completes the backup/restore loop

### Future Consideration (v2+)

Defer until v1.x is stable and there's evidence of demand.

- [ ] Per-exercise history chart (visual trend over time for a specific PT exercise)
- [ ] Weekly macro summary view (how the week is trending vs. targets)
- [ ] Year-view calendar heatmap (GitHub-style full-year overview once there's enough data to show)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 4-segment day indicator | HIGH | MEDIUM | P1 |
| Calendar month view | HIGH | MEDIUM | P1 |
| Food library + log | HIGH | MEDIUM | P1 |
| Macro progress bars | HIGH | LOW | P1 |
| PT templates + session log | HIGH | MEDIUM | P1 |
| Step entry + goal progress | HIGH | LOW | P1 |
| Lift check-in | HIGH | LOW | P1 |
| PWA install + offline | HIGH | MEDIUM | P1 |
| JSON export | MEDIUM | MEDIUM | P1 |
| Daily macro targets (Settings) | HIGH | LOW | P1 |
| Pain rating per PT session | HIGH | LOW | P2 |
| Session history per exercise | MEDIUM | MEDIUM | P2 |
| Meal templates / combo recall | HIGH | MEDIUM | P2 |
| Streak count display | MEDIUM | LOW | P2 |
| Progression notes on template | MEDIUM | LOW | P2 |
| JSON import | MEDIUM | MEDIUM | P2 |
| Per-exercise history chart | MEDIUM | MEDIUM | P3 |
| Weekly macro summary | LOW | LOW | P3 |
| Year-view heatmap | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

---

## Competitor Feature Analysis

| Feature | MyFitnessPal | MacroFactor | Cronometer | Strong / Hevy | This Project |
|---------|--------------|-------------|------------|---------------|--------------|
| Food logging | Barcode + search 14M DB | Verified DB, timeline log | Verified DB, 84+ nutrients | None | Custom personal library, recall by recents/name |
| Macro progress | Daily bars | Daily + weekly targets | Per-nutrient bars | None | Daily bars for cals + P + C + F only |
| Workout logging | Basic | None | None | Sets/reps/weight + templates | PT templates with target vs. actual, notes |
| Pain/difficulty tracking | None | None | None | RPE per set | Pain rating per session (proposed v1.x) |
| Streak / calendar | None | None | None | Calendar history | 4-segment month calendar (core differentiator) |
| Habit check-in | None | None | None | None | Lift check-in (yes/no + note) |
| Step tracking | Via integrations | Via integrations | Via integrations | None | Manual entry + goal |
| Offline / local | Cloud-required | Cloud-required | Cloud-required | Cloud sync | 100% local IndexedDB |
| Gamification | Badges, streaks | None | None | Progress graphs | 4-segment indicator only (no badge bloat) |
| Data export | CSV (Premium) | CSV | CSV | CSV | JSON (open format, free) |
| Auth required | Yes | Yes | Yes | Yes | None |

**Key insight:** No competitor combines PT rehab tracking + macro logging + habit check-ins + streak visualization in a single unified view. The 4-segment calendar is genuinely novel in this combination.

---

## Sources

- [MacroFactor vs MyFitnessPal 2025 comparison](https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/)
- [MacroFactor food logging speed benchmark](https://macrofactorapp.com/best-food-logging-app/)
- [MacroFactor favorite foods / recall patterns](https://macrofactor.com/favorite-foods/)
- [Cronometer vs MFP 2026](https://nutrifytracker.com/blog/cronometer-vs-mfp)
- [Strong vs Hevy 2026](https://gymgod.app/blog/strong-vs-hevy)
- [Hevy app features and user reviews](https://www.hotelgyms.com/blog/hevy-workout-app-review-the-up-and-comer-taking-the-fitness-world-by-storm)
- [Apple Watch activity rings psychology](https://trophy.so/blog/the-psychology-of-apple-watchs-close-your-rings)
- [Gamification S-curve research, Frontiers in Psychology 2025](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1671543/full)
- [Habit tracker streak retention patterns](https://habi.app/insights/best-streak-tracker-apps/)
- [GitHub-style heatmap adoption in fitness/habit apps](https://www.jqueryscript.net/blog/best-github-style-calendar-heatmap.html)
- [Physical therapy app features users want 2025](https://www.exer.ai/posts/best-physical-therapy-apps)
- [Tennis elbow rehab tracking and progression](https://orthoinfo.aaos.org/globalassets/pdfs/2022-therapeutic-exercise-program-for-epicondylitis.pdf)
- [Comprehensive rehab program for lateral elbow tendinopathy (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6769266/)
- [UX anti-patterns causing app abandonment 2025](https://www.newsletter.designproject.io/p/why-users-abandon-your-app-ux-psychology-insights-for-2025)
- [Fitness app UX design challenges 2025](https://www.uxmatters.com/mt/archives/2025/07/designing-a-fitness-platform-ux-design-challenges-and-solutions.php)
- [PWA best practices 2025](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/best-practices)

---

*Feature research for: Personal PWA health tracker (PT + macros + steps + lifts)*
*Researched: 2026-04-19*
