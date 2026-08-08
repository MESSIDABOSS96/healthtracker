# Stack Research — v2.0 Duo Redesign

**Domain:** Additions to an existing fully-local React/Vite/Dexie PWA — browser-direct LLM calls, voice input, weight/adherence charting, ring-closure UI animation
**Researched:** 2026-08-08
**Confidence:** HIGH (Anthropic docs fetched live; npm versions verified against registry; Web Speech API caveats cross-checked against multiple sources)

**Scope note:** This file covers ONLY new capabilities for v2. Existing validated stack (React 19, Vite 7, TypeScript, Dexie 4 + `useLiveQuery`, Tailwind 4, shadcn/ui, React Hook Form + Zod, `react-activity-calendar`, Recharts) is unchanged and not re-justified here — see the v1 STACK.md history in git for that rationale.

---

## Recommended Stack (New for v2)

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Anthropic Messages API via hand-rolled `fetch` (no SDK) | API version `2023-06-01` | AI food parsing (Claude Haiku) called directly from the browser | Browser-direct calls to `https://api.anthropic.com/v1/messages` work by sending the header `anthropic-dangerous-direct-browser-access: true` alongside `x-api-key` and `anthropic-version`. This is a **confirmed, intentional Anthropic feature** (announced 2024, still current) for BYOK client-side apps — not an undocumented hack. A single non-streaming JSON call needs ~40 lines of `fetch` + `try/catch`; pulling in `@anthropic-ai/sdk` (which bundles Node-oriented retry/backoff, streaming helpers, the batches API, MCP helpers, file upload polyfills) is unjustified weight for one endpoint in an app that fights for every KB of PWA install size. Write retry/backoff (2 attempts, exponential) by hand — it's ~15 lines. |
| `claude-haiku-4-5-20251001` | current dated snapshot | The model called for parsing | Confirmed via official Claude Platform docs (fetched live) to support **structured outputs** (`output_config.format` with a JSON Schema) — this is what guarantees valid macro JSON instead of prose-wrapped JSON. Pricing ~$1/$5 per million input/output tokens — matches the project's "~$0.001/parse" assumption for short food-description prompts. |
| Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) — native browser API, no package | N/A (browser built-in) | Voice input for freeform food entry | No maintained wrapper library is needed or wanted (see "What NOT to Use"). Requires a **hand-written hook** (~60–80 lines) because this project has unusual constraints the API doesn't handle for you: detecting standalone-PWA mode to disable/relabel the mic button on iOS, feature-detecting `SpeechRecognition` at all, and falling back cleanly to the text field. See Pitfalls below — this is the riskiest new integration in the milestone. |
| `motion` (formerly Framer Motion) | 13.0.0 | Ring-closure daily UI animation, micro-interactions | Per this project's `pick-ui-library` skill: reach for `motion` specifically for springs, layout animations, exit animations, gesture-driven values — which is exactly what an Apple-Fitness-style ring closing/bouncing on completion needs. Full React 19 concurrent-rendering support confirmed in current changelog. Import path is `motion/react` (the `framer-motion` package name still works as an alias but `motion` is the current canonical package). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/dom-speech-recognition` | 0.0.12 (dev dep) | TypeScript types for `SpeechRecognition` | `lib.dom.d.ts` does not ship Web Speech API types (Microsoft requires 2+ browser engines to agree before adding a DOM lib type, and Speech Recognition still isn't there). Install as a dev dependency so `window.SpeechRecognition` / `webkitSpeechRecognition` type-check without hand-rolled ambient declarations. |
| `@number-flow/react` | 0.6.2 | Animated calorie/macro counters | Per `pick-ui-library`: use for animating numbers (counters, stats) rather than re-rendering text — good fit for a "1,847 / 2,200 kcal" readout ticking up as items are logged, reinforcing the closure-loop feedback the app is built around. |
| Sonner | 2.0.7 | Toasts for parse success/failure, offline-fallback notice | Not present in v1. Needed in v2 because AI parsing can fail (network down, bad API key, malformed response) and the user needs quiet, non-blocking feedback ("Parsed offline using basic parser — edit if needed", "Couldn't reach Claude, check your API key"). Per `pick-ui-library`, this is exactly Sonner's job — don't hand-roll toast state. |
| Zod (existing, already installed) | 4.4.x | Validate Claude's JSON response and the local parser's output | Reuse the existing Zod dependency — define one `FoodParseResult` schema, `.safeParse()` both the Claude structured-output JSON and the offline deterministic parser's output through the same schema. Keeps the two entry paths (online AI / offline fallback) producing identically-shaped data with no new dependency. |
| Recharts (existing, already installed) | 3.10.x | Weight trend line chart, eating-adherence bars, training-consistency visualization on the Dashboard tab | **Sufficient as-is — no new charting library needed.** All three Dashboard visualizations (weight over time = line chart, calorie/macro adherence = bar or area chart, lift/cardio consistency = bar or heatmap-style grid) are squarely inside Recharts' composable SVG chart set. Compute any moving average / trend line in plain TypeScript (a simple windowed average is ~10 lines) rather than adding a statistics library. |
| `react-activity-calendar` (existing, already installed) | 3.1.x | Possible reuse for Dashboard's month/week consistency view | The v1 4-quadrant `DayCell` custom render is being replaced by the ring-closure model on the **Daily** tab, but the underlying calendar-grid component is still a reasonable fit for a **Dashboard** "consistency over weeks/months" heatmap if that's the direction chosen during design. Don't discard the dependency reflexively — confirm during Dashboard UI design whether a heatmap or a Recharts bar/line view better serves "weight/eating/training trends," and drop the package only if truly unused. |

### Development Tools

No new dev tooling required beyond `@types/dom-speech-recognition` above. Existing ESLint/Prettier/TypeScript setup covers the new code.

---

## Installation

```bash
# Core additions
npm install motion sonner @number-flow/react

# Dev dependency (Web Speech API types)
npm install -D @types/dom-speech-recognition

# NOT installed: @anthropic-ai/sdk, react-speech-recognition, any chart library, any circular-progress library
```

No package is needed for the Anthropic API call itself (hand-rolled `fetch`) or for voice input (native `SpeechRecognition`).

---

## Anthropic API Browser-Direct Pattern (Confirmed)

Verified live against `platform.claude.com/docs` on 2026-08-08.

**Request:**

```ts
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": userSuppliedKey, // read from Dexie/localStorage settings, never sent anywhere else
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true", // REQUIRED for CORS to succeed from a browser origin
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: freeformFoodText }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            calories: { type: "number" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
          },
          required: ["name", "calories", "protein_g", "carbs_g", "fat_g"],
          additionalProperties: false,
        },
      },
    },
  }),
});
```

**Key facts:**
- The `anthropic-dangerous-direct-browser-access: true` header is the load-bearing piece — without it, the request is blocked by CORS. This is an intentional, documented opt-in for BYOK client apps, not a workaround.
- If using `@anthropic-ai/sdk` instead of raw `fetch`, the equivalent is `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })` — the SDK sets the header for you. Recommended against here only for bundle-size reasons (see Core Technologies), not because the flag is unsafe for this project's BYOK model.
- **Structured outputs** (`output_config.format`, `type: "json_schema"`) is confirmed supported on `claude-haiku-4-5-20251001` specifically — this was checked because the project locked in Haiku for cost, and structured outputs docs list model support explicitly rather than applying universally. Response lands as valid JSON text in `content[0].text` — still `JSON.parse()` it and validate through the shared Zod schema (never trust the network).
- An older beta header (`anthropic-beta: structured-outputs-2025-11-13`) exists from an earlier rollout and still works, but current docs say the dedicated `output_config.format` parameter no longer requires it. Use `output_config.format` directly.
- Rate limiting / 4xx handling: a 401 almost always means a bad/missing user-supplied key — surface this specifically ("Check your API key in Settings"), don't just show a generic "AI parse failed" toast, since debugging a silent 401 from a solo user's own key is otherwise painful.
- **Never log or persist the API key anywhere except the on-device settings store.** No analytics, no error-reporting service (there isn't one in this project, but it's worth stating as a rule for future contributors).

---

## Web Speech API — iOS Safari & Standalone-PWA Caveats (Critical)

This is flagged with unusual weight because it directly threatens a v2 requirement ("speak or type freeform") and because the failure mode is silent (feature-detection passes, nothing happens).

| Environment | Status | Source confidence |
|---|---|---|
| Safari (browser tab, not installed) on iOS 14.5+ | Works via `webkitSpeechRecognition`, prompts before sending audio to Apple's recognition service | MEDIUM (Apple developer forums, cross-referenced) |
| **Safari, installed to Home Screen (standalone PWA)** | **Does not work.** Feature detection reports the API exists; calling `.start()` silently does nothing — no error, no result. Multiple independent reports confirm this, not a single anecdote. | MEDIUM-HIGH (multiple Apple Developer Forum threads agree) |
| iOS Chrome / any iOS third-party browser | Does not support `SpeechRecognition` at all — iOS forces all browsers onto WebKit, which is the actual root cause of the above, not a Chrome-specific gap | MEDIUM |
| Chrome desktop / Android Chrome (not installed) | Works, but is cloud-based by default — **requires network**, audio is sent to Google's servers. Chrome 139+ (Aug 2025+) added an optional on-device mode, but real-world reports show it's inconsistent on Android (works in Samsung Internet, silently unavailable in Chrome/Brave on the same device) | MEDIUM |

**Implication for this project specifically:** because HealthTracker is designed to be *installed* (it's a PWA, install is a core requirement), the single most likely real-world deployment — an iPhone user who installed the app to their home screen, which is exactly the intended usage — is the one environment where voice input silently breaks on iOS.

**Required mitigation (architecture-level, not just a code detail):**
1. Feature-detect `SpeechRecognition` **and** detect standalone mode (`window.navigator.standalone === true` on iOS, or `window.matchMedia('(display-mode: standalone)').matches` generally).
2. If iOS + standalone: hide or disable the mic button and show the text-entry path as primary, rather than presenting a mic button that appears to work but does nothing. A silently-broken mic button actively damages trust in a low-friction-entry product.
3. Voice input should be treated as a "nice-to-have when it works" enhancement layered on top of a typing flow that always works — never the only path to log food. This matches the milestone's own design ("speak OR type") but the iOS standalone gap makes it load-bearing: typing cannot be a degraded fallback UX, it must be fully first-class.
4. Voice input requires network in effectively all currently-shipping configurations (see table) — it should be gated behind the same online/offline check that gates the AI parser, and disabled (not just silently failing) when offline.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Hand-rolled `fetch` for Anthropic calls | `@anthropic-ai/sdk` with `dangerouslyAllowBrowser: true` | Use the SDK if the team later adds streaming responses (nicer "Claude is thinking…" UX), multiple Anthropic endpoints, or wants first-party TypeScript response types over hand-maintained Zod schemas. For a single non-streaming JSON call, the SDK's Node-oriented surface (retries, batches, MCP helpers, file uploads) is dead weight. |
| Native `SpeechRecognition` + custom hook | `react-speech-recognition` (npm) | Only if the team wants a maintained community abstraction and is fine with its constraints. Current confidence: **avoid** — last published roughly a year ago, and its abstraction actively works against the standalone-PWA/iOS detection this project specifically needs to build. A thin custom hook gives full control over exactly the edge cases that matter here. |
| `motion` for ring-closure animation | Plain CSS `stroke-dashoffset` transitions | Use plain CSS if the ring only ever animates linearly on mount/update with no spring bounce and no gesture interaction — cheaper, zero JS. Use `motion` once the design wants the Apple-Fitness "overshoot and settle" bounce on ring closure, since that specific feel is a spring, not an easing curve, and `motion`'s `useMotionValue`/`animate()` is built for exactly this. Given the design brief explicitly cites Apple Fitness rings, expect the bounce to be wanted — but confirm during the animation-design pass rather than assuming. |
| Recharts for all Dashboard charts | A dedicated library for calendar heatmaps (e.g., building a second heatmap component) | Only if `react-activity-calendar` is dropped entirely and a bespoke Dashboard consistency view is designed that Recharts can't express cleanly (unlikely — Recharts' `BarChart`/`ComposedChart` cover weekly/monthly consistency grids fine with custom cell rendering). |
| `output_config.format` (current structured-outputs parameter) | The older `anthropic-beta: structured-outputs-2025-11-13` header + `output_format` param | Only if targeting an older API version pinned before the parameter migration — not applicable here since this is a new integration being built today. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@anthropic-ai/sdk` | Node/server-oriented surface (streaming helpers, batches API, MCP helpers, file upload polyfills, proxy config) is unnecessary weight for one browser-side JSON call in a PWA that should stay lean; also nudges toward `dangerouslyAllowBrowser` ceremony for something a plain `fetch` + one header handles directly | Hand-rolled `fetch()` wrapper (~40 lines) against `/v1/messages` |
| `react-speech-recognition` | Not actively maintained (≈1 year since last publish); its global-state abstraction is the wrong shape for the standalone-PWA / iOS detection logic this project specifically needs; adds a dependency for what's fundamentally a ~15-line wrapper over two browser globals | Native `window.SpeechRecognition` / `webkitSpeechRecognition` behind a custom hook |
| Any additional chart library (Chart.js, Victory, Nivo, visx, etc.) | Recharts is already installed, already proven in v1, and covers every Dashboard chart type this milestone needs (line, bar, area). Adding a second charting library for "just the trend chart" duplicates SVG-rendering code paths and bundle weight for no capability gain | Recharts (existing dependency) |
| A dedicated circular-progress / ring library (e.g., `react-circular-progressbar`) | The v1 project already built a bespoke SVG `DayCell` for the 4-segment indicator — the ring-closure component is the same category of problem (a handful of custom SVG arcs/circles) and benefits from the same approach: full control over segment count, color, and the specific bounce-on-close animation, none of which a generic circular-progress package is designed to express well | Custom SVG component + `motion` for the animated stroke/scale values |
| Whisper / any speech-to-text API (OpenAI Whisper, Deepgram, etc.) | Out of scope per project constraints — adds a second paid API dependency and a second on-device key to manage, when the milestone explicitly scopes voice input to the free, built-in Web Speech API with typing as the always-available primary path | Native Web Speech API, gated behind feature + environment detection; typing as the first-class fallback |
| A fuzzy-matching library (Fuse.js) for auto-library dedupe, added preemptively | Same guidance as v1 STACK.md: normalized exact-match (lowercased, trimmed name) on Dexie handles dedupe for the realistic library size (tens to low hundreds of items for two users); fuzzy matching is solving a problem that doesn't exist yet | Dexie `where().equals(normalizedName)` dedupe check on save; revisit only if users report near-duplicate clutter |
| A statistics/regression library for weight trend lines | A weight trend line is a simple moving average or linear fit over dozens of points — trivial to hand-write in TypeScript, and a stats library would be justified only at a data scale/complexity this app will never reach | Plain TypeScript windowed-average function |

---

## Stack Patterns by Variant

**If the Anthropic API call needs to become streaming later (e.g., showing partial parse results):**
- Reconsider `@anthropic-ai/sdk` at that point — its streaming helpers (`messages.stream()`) are genuinely valuable once SSE parsing is needed, versus hand-rolling an `EventSource`/`ReadableStream` reader.
- Until then, a single non-streaming call is simpler and faster to respond to for a short food-description prompt.

**If Chrome's on-device Web Speech mode becomes reliable across desktop + Android (revisit in 6–12 months):**
- Offline voice input becomes viable on Chrome; the current recommendation (gate voice behind an online check) can be relaxed for Chrome specifically, but iOS standalone-PWA breakage is independent of this and will still need the same mitigation.

**If the Dashboard's consistency view ends up wanting a GitHub-style heatmap instead of Recharts bars:**
- Keep `react-activity-calendar` for that one view; don't force Recharts to fake a heatmap grid it isn't well-suited for.

**If API key management grows (e.g., supporting Anthropic + a second provider later):**
- This is explicitly out of scope for v2, but if it happens, the hand-rolled `fetch` wrapper approach scales better than the SDK, since a second provider means a second SDK anyway — a small shared `callLLM()` abstraction is provider-agnostic from the start.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `motion@13.0.0` | `react@19.x` | Full concurrent-rendering support confirmed in current changelog; import from `motion/react`, not the legacy `framer-motion` import path, for the current API surface. |
| `sonner@2.0.7` | `react@19.x`, Tailwind 4 | Standard shadcn/ui-adjacent toast library; styles via CSS variables, composes cleanly with the existing Tailwind 4 dark theme. |
| `@number-flow/react@0.6.2` | `react@19.x` | Lightweight, no known React 19 issues. |
| `@types/dom-speech-recognition@0.0.12` | TypeScript 5.x (existing) | Pure ambient type declarations — no runtime code, zero compatibility risk. |
| Anthropic Messages API (`2023-06-01`) | Any `fetch`-capable browser | CORS via `anthropic-dangerous-direct-browser-access` header is a server-side (Anthropic API) capability, not a client library version concern — works identically regardless of frontend stack. |
| Recharts (existing) | No change | Already validated against React 19 in v1 research; no version bump required for new chart types (Recharts 3.x's `LineChart`/`BarChart`/`AreaChart` cover all new Dashboard needs). |

---

## Sources

- [Claude Platform Docs — TypeScript SDK](https://platform.claude.com/docs/en/api/sdks/typescript) — browser usage, `dangerouslyAllowBrowser`, fetched live 2026-08-08 (HIGH confidence)
- [Claude Platform Docs — Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — `output_config.format`, model support list including `claude-haiku-4-5-20251001`, fetched live 2026-08-08 (HIGH confidence)
- [Simon Willison — Claude's API now supports CORS requests](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/) — origin and intent of the `anthropic-dangerous-direct-browser-access` header (HIGH confidence, corroborated by official docs)
- [anthropics/anthropic-sdk-typescript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) — SDK browser-support accordion, React Native unsupported note (HIGH confidence)
- npm registry (`npm view`) — live version checks for `motion`, `sonner`, `@number-flow/react`, `@types/dom-speech-recognition`, `@anthropic-ai/sdk`, `zod`, `recharts`, `zustand` on 2026-08-08 (HIGH confidence)
- Anthropic Haiku 4.5 pricing — cross-referenced via multiple 2026 pricing aggregator pages (MEDIUM confidence; treat exact $/token as approximate, re-verify at implementation time against `platform.claude.com/docs/en/about-claude/pricing`)
- MDN — Web Speech API usage notes, cloud vs. on-device recognition (MEDIUM confidence, general web knowledge, cross-checked)
- Apple Developer Forums (multiple threads: #733229, #699881, #748048, #775699) — standalone-PWA `SpeechRecognition` failure reports (MEDIUM-HIGH confidence — multiple independent reports agree, no single-source reliance)
- [Medium — On-Device Speech UIs in Chrome 139](https://medium.com/@roman_fedyskyi/on-device-speech-uis-in-chrome-139-4b9f0397b9c9) and [bagrounds.org — Why On-Device Speech Fails on Android Chrome](https://bagrounds.org/ai-blog/2026-05-11-1-word-meter-android-rca) — Chrome on-device mode inconsistency (MEDIUM confidence)
- `pick-ui-library` skill (`.agents/skills/pick-ui-library/SKILL.md`) — `motion`, Sonner, `NumberFlow`, Recharts recommendations (project-internal, treated as HIGH confidence per project convention)
- `improve-animations` skill (`.agents/skills/improve-animations/SKILL.md`) — informs the "spring vs. plain CSS" framing for ring-closure animation, to be applied during the dedicated animation pass rather than this research

---

*Stack research for: v2.0 Duo Redesign new features (AI food parsing, voice input, auto-library, weight trends, ring-closure UI, Dashboard tab)*
*Researched: 2026-08-08*
