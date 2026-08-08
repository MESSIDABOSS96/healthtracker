---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Duo Redesign
status: defining-requirements
stopped_at: Milestone v2.0 started — defining requirements
last_updated: "2026-08-08T00:00:00.000Z"
last_activity: 2026-08-08
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-08)

**Core value:** Consistency through satisfying daily closure and visible long-term progress — AI-parsed food logging, one-tap lift/cardio, weight trends, ring-style day closure.
**Current focus:** v2.0 Duo Redesign — defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-08-08 — Milestone v2.0 started

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

### v1 Carry-forward (technical)

- Dexie schema is append-only — v2 changes go in new `db.version(N)` blocks; existing 7 stores stay declared
- dayKey.ts, photoStore.ts (OPFS WebP), PWA shell, persist() startup call all reusable as-is
- Services layer (meals.svc, goals.svc, export.svc) largely reusable; streak.svc semantics change with closure model
- ~3,500 of 5,400 LOC (presentation layer) expected to be rebuilt

### Pending Todos

None yet.

### Blockers/Concerns

- Closure semantics detail (does "calories/macros logged" mean any entry or hitting targets?) — lock during discuss/design phase
- Ring visual design (true rings vs other closure metaphor) — lock during UI phase
- AI parse prompt + output schema (strict JSON via structured outputs) — design during planning

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Integrations | Hevy API auto-sync for lift/cardio | Requires Hevy Pro | v2.0 scoping |
| Social | Shared progress view between the two users | Deliberate | v2.0 scoping |
| Backup | Weekly export auto-prompt | Carry from v1 | v1 roadmap |

## Session Continuity

Last session: 2026-08-08
Stopped at: Milestone v2.0 initialized
