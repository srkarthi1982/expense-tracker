⚠️ Mandatory: AI agents must read this file before writing or modifying any code.

# AGENTS.md

This file complements the workspace-level Ansiversa-workspace/AGENTS.md (source of truth). Read workspace first.

MANDATORY: After completing each task, update this repo’s AGENTS.md Task Log (newest-first) before marking the task done.

## Scope
- Mini-app repository for 'expense-tracker' within Ansiversa.
- Follow the parent-app contract from workspace AGENTS; do not invent architecture.

## Phase Status
- Freeze phase active: no new features unless explicitly approved.
- Allowed: verification, bug fixes, cleanup, behavior locking, and documentation/process hardening.

## Architecture & Workflow Reminders
- Prefer consistency over speed; match existing naming, spacing, and patterns.
- Keep Astro/Alpine patterns aligned with ecosystem standards (one global store pattern per app, actions via astro:actions, SSR-first behavior).
- Do not refactor or change established patterns without explicit approval.
- If unclear, stop and ask Karthikeyan/Astra before proceeding.

## Where To Look First
- Start with src/, src/actions/, src/stores/, and local docs/ if present.
- Review this repo's existing AGENTS.md Task Log history before making changes.

## Task Log (Recent)
- Keep newest first; include date and short summary.
- 2026-03-10 Slice 3 category insights and monthly view: enhanced `/app/expense-tracker` with current-month summary metrics, category expense insights with top category highlight, monthly-grouped transaction sections, and largest recent expense callout; added Slice 3 verification checklist at `docs/verification/expense-tracker-slice-3-checklist.md`; validated with `npm run typecheck` and `npm run build`.
- 2026-03-10 Slice 2 premium home and summary polish: rebuilt `src/pages/index.astro` with premium two-column hero, summary panel/strip, value-pillar section, and recent-transactions section (with empty state CTA); strengthened `/app/expense-tracker` top summary cards to use live Alpine totals and transaction count; added Slice 2 verification checklist at `docs/verification/expense-tracker-slice-2-checklist.md`; validated with `npm run typecheck` and `npm run build`.
- 2026-03-08 Follow-up deployment for Slice 1 verification: pushed commits `fe9143c` and `291c362` to `origin/main`, deployed production via Vercel (`dpl_2WWKDwHwGz5HiqYWsuMY16jN1T9y`), and confirmed deployment status `Ready` at `https://expense-tracker-57zqor6zu-srilakshmi-tailors-team.vercel.app` (alias `https://expense-tracker.ansiversa.com`). Manual browser CRUD verification remains pending.
- 2026-03-08 Slice 1 completion from existing baseline: reused existing middleware/session boundary, DB tables (`Accounts`, `Categories`, `Transactions`), and action handlers; added missing user app route (`/app/expense-tracker`) with summary cards, account/category create flows, transaction list/edit/delete, and drawer-based create/edit transaction UX via Alpine stores. Added summary contract baseline (`src/dashboard/summary.schema.ts`) and verification checklist (`docs/verification/expense-tracker-slice-1-checklist.md`), then validated with repo commands (`npm run typecheck`, `npm run build`).
- 2026-02-09 Added repo-level AGENTS.md enforcement contract (workspace reference + mandatory task-log update rule).
- 2026-02-09 Initialized repo AGENTS baseline for single-repo Codex/AI safety.
