# P0 — TestRail parity: execution + detail + suites + milestones + RBAC

## What this bundle fixes (from the audit)
1. Runs were dead: no way to mark Passed/Failed/Blocked/Retest. → NEW /test-runs/[id] + PATCH /api/test-executions/[id]
2. No detail/edit/delete for cases, plans, defects, requirements, projects. → NEW [id] APIs + detail pages for cases & plans
3. Suites + milestones existed in schema, never used. → NEW /api/test-suites + /api/releases (milestones)
4. RBAC defined but never enforced (first-org bug). → NEW require-org-permission.ts, enforced in all new/updated routes
5. Manual defect keys + no link from failure to defect. → defects POST auto-generates key + accepts testCaseId/testExecutionId
6. Steps were free-text. → test-cases PATCH now replaces test_case_steps; detail page has structured steps editor
7. Runs always included ALL cases. → test-runs POST now accepts testPlanId / suiteIds / caseIds / assignedTo / description / configuration

## Install
1. Run supabase_p0_migration.sql in Supabase SQL Editor.
   Run the ALTER TYPE line alone first if you get "cannot run inside transaction block":
     ALTER TYPE execution_status ADD VALUE IF NOT EXISTS 'retest';
2. Copy all files in this bundle over your repo, preserving paths.
   Overwrites: src/app/api/test-runs/route.ts, src/app/api/defects/route.ts, src/app/api/projects/[id]/route.ts, src/app/test-runs/new/page.tsx
   New: everything else.
3. Apply PATCH_LIST_PAGES.md (wrap list rows in Links).
4. Apply src/types/supabase-p0-patch.md.
5. `npm run dev` — test the checklist below.

## Test checklist (5 min)
- Create a project → create 2 test cases with steps → create a suite → add cases to suite via POST /api/test-suites/[id]/cases
- Create a milestone via POST /api/releases { projectId, versionName: "v1.0" } → create a plan linked to it
- Create a run from that plan + suite → open /test-runs/[id] → expand a case → mark Failed + comment → Save → Create Defect from this Failure → verify defect appears in /defects with test_case_id + test_execution_id
- Bulk: select 2 Not Run → Mark Passed → progress updates
- Complete Run → try to edit an execution → expect 409 → Reopen → edit works again
- As a viewer (second account): try PATCH /api/test-executions/[id] → expect 403. Try GET → expect 200.

## What P0 does NOT yet do (intentionally left for P1)
- Defect / Requirement detail UI pages (APIs exist)
- Suites UI page (API exists, used via run creation + plan detail)
- Milestones UI page (API exists, used via plan detail)
- Per-step execution results UI (API accepts stepResults)
- Notifications, audit log, custom fields, integrations

## Files in this bundle
- supabase_p0_migration.sql
- src/lib/auth/require-org-permission.ts
- src/app/api/test-executions/[id]/route.ts
- src/app/api/test-runs/[id]/route.ts, /executions/route.ts, route.ts (updated)
- src/app/api/test-cases/[id]/route.ts, test-plans/[id], defects/[id], requirements/[id], projects/[id] (updated)
- src/app/api/test-suites/route.ts, [id]/route.ts, [id]/cases/route.ts
- src/app/api/releases/route.ts, [id]/route.ts
- src/app/api/defects/route.ts (updated: auto-key + linking + RBAC)
- src/app/test-runs/[id]/page.tsx, test-cases/[id]/page.tsx, test-plans/[id]/page.tsx, test-runs/new/page.tsx (updated)
- PATCH_LIST_PAGES.md, src/types/supabase-p0-patch.md

