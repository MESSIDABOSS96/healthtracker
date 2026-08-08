---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Duo Redesign
status: roadmapped
stopped_at: Roadmap created — 5 phases (5-9), awaiting phase discussion/planning
last_updated: "2026-08-08T00:00:00.000Z"
last_activity: 2026-08-08
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-08)

**Core value:** Consistency through satisfying daily closure and visible long-term progress — AI-parsed food logging, one-tap lift/cardio, weight trends, ring-style day closure.
**Current focus:** v2.0 Duo Redesign — roadmap approved, starting with Phase 5 (Data Layer Migration)

## Current Position

Phase: 5 - Data Layer Migration (not started)
Plan: —
Status: Roadmap complete; next step is `/gsd-discuss-phase 5` then `/gsd-plan-phase 5`
Last activity: 2026-08-08 — ROADMAP.md written for v2.0 (Phases 5-9), REQUIREMENTS.md traceability updated

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Locked for v2.0 (2026-08-08):

- Two independent local installs — no backend, no shared data
- AI food parsing: Claude Haiku direct-from-client (user API key in settings), local structured parser fallback offline
- Smart auto-library replaces manual food creation (auto-save + dedupe parsed items, one-tap re-log)
- Manual one-tap lift + cardio check-offs; data model must accommodate future Hevy API sync (source field)
- Drop PT (~940 LOC) and steps tracking
- Day closure = calories/macros logged + lift + cardio addressed (ring-style; exact semantics + visual in design phase)
- Two-tab IA: Daily + Dashboard
- Design guided by .agents/skills/{apple-design,pick-ui-library,improve-animations}
- v2.0 phase numbering continues from v1.0 (Phase 1-4 closed); v2.0 phases are 5-9
- Phase order: schema migration (5) → check-offs/weight/targets (6) → AI food parsing (7) → closure+Dashboard+redesign (8) → backup/release verification (9), per research SUMMARY.md build-order recommendation

### v1 Carry-forward (technical)

- Dexie schema is append-only — v2 changes go in new `db.version(N)` blocks; existing 7 stores stay declared
- dayKey.ts, photoStore.ts (OPFS WebP), PWA shell, persist() startup call all reusable as-is
- Services layer (meals.svc, goals.svc, export.svc) largely reusable; streak.svc semantics change with closure model
- ~3,500 of 5,400 LOC (presentation layer) expected to be rebuilt

### Pending Todos

None yet — Phase 5 discussion/planning is next.

### Blockers/Concerns

- Closure semantics detail (does "calories/macros logged" mean any entry or hitting targets?) — lock before Phase 8 implementation (research recommends "hybrid": any-log closes the ring, secondary on-target indicator + Dashboard carry precision)
- Ring visual design (true rings vs other closure metaphor, segment geometry, bounce intensity, color palette) — lock during Phase 8 UI design pass, consult `.agents/skills/apple-design` and `improve-animations`
- AI parse prompt + output schema (strict JSON via structured outputs) — design during Phase 7 planning; re-verify exact Claude Haiku model slug and `output_config.format` shape against current docs before building
- Web Speech API standalone-iOS-PWA behavior — verify on both users' actual devices before presenting voice as more than best-effort (Phase 7)
- EMA alpha value (weight trend) and adherence-band thresholds (Dashboard) — reasonable defaults proposed in research, spot-check against real data once available (Phase 6/8)

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Integrations | Hevy API auto-sync for lift/cardio | Requires Hevy Pro | v2.0 scoping |
| Social | Shared progress view between the two users | Deliberate | v2.0 scoping |
| Backup | Weekly export auto-prompt | Carry from v1 | v1 roadmap |
| Food entry | Multi-item freeform parse ("chicken and rice with veggies") | v2.x refinement | v2.0 scoping |
| Dashboard | Adherence-band tuning beyond defaults | Tune after real usage data | v2.0 scoping |

## Session Continuity

Last session: 2026-08-08
Stopped at: v2.0 ROADMAP.md and REQUIREMENTS.md traceability written; ready for `/gsd-discuss-phase 5`
