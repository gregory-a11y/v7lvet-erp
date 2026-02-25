# Project Memory — V7LVET ERP

## Current State
- Phase: PRD complete, ready for build
- Last action: all PRD documents and meta-prompts generated
- Next action: run /build to start construction (Phase 1: schema + auth)

## Architecture Decisions
- Better Auth 1.4.9 pinned (Convex compatibility)
- ConvexBetterAuthProvider used (not separate providers)
- Auth runs on Convex via @convex-dev/better-auth@0.10.11 adapter
- No dark mode (light only, corporate tone)
- Sidebar uses Océan Profond (#063238) dark background
- Gantt view is MANDATORY for runs timeline
- In-app notifications only (no email for MVP)
- French only interface
- 4 roles: associé > manager > collaborateur > assistante (cascade permissions)

## PRD Documents
- `docs/prd.md` — Full PRD (53 KB, ~700 lines)
- `docs/schema-draft.ts` — 13 tables with indexes (16 KB)
- `docs/pages.md` — 16 pages with components and states (74 KB)
- `docs/execution-plan.md` — 6 phases, dependency graph
- `docs/agent-team-blueprint.md` — Team config for parallel build
- `docs/prompts/` — 13 meta-prompts (00 to 11 + 02b)

## Key Module: Fiscal Engine (03-runs)
- 21 conditions generating fiscal tasks automatically
- Covers: IR, IS, TVA, CVAE, CFE, DAS2, TS, taxe foncière, TASCOM, DECLOYER, TSB, TVE
- Reference: `/Users/gregorygiunta/PROJETS DEV/V7LVET/CONDITIONS CREATION DE TACHE FISCAL.MD`
- IS acomptes have 4 patterns based on clôture period
- TVA can generate 12 monthly or 4 quarterly tasks

## Patterns Discovered
- authSchema import doesn't exist in @convex-dev/better-auth@0.10.11 — auth tables are managed automatically
- create-next-app interactive prompts need --no-eslint and piped input for non-interactive terminals
- shadcn toast is deprecated → use sonner
- Convex login requires interactive terminal (user must do it manually)

## Known Issues
- Convex env SITE_URL set to localhost:3000 — must update for production
- Coolify not installed on VPS yet
- No domain configured yet
