# QA Management Platform

A full-stack test management application for planning, designing, executing, and tracking software quality — from requirements through test cases, runs, defects, traceability, and reports.

Built for a single QA team workflow: **one project → requirements → test plans / suites / cases → test runs → defects → traceability → reports**.

> Status: Actively developed. Core flows (Projects → Requirements → Test Plans / Suites / Cases → Runs → Defects → Traceability → Reports) are implemented and working in production. See [What is implemented](#what-is-implemented) and [Known gaps / roadmap](#known-gaps--roadmap).

---

## Table of Contents

- [Stack & Technologies](#stack--technologies)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Sidebar — All Features Explained](#sidebar--all-features-explained)
  - [Dashboard](#1-dashboard--overview)
  - [Projects](#2-projects--workspace)
  - [Milestones](#3-milestones--workspace)
  - [Requirements](#4-requirements--workspace)
  - [Test Plans](#5-test-plans--test-design)
  - [Test Suites](#6-test-suites--test-design)
  - [Test Cases](#7-test-cases--test-design)
  - [Test Runs & Results](#8-test-runs--results--execution)
  - [Defects](#9-defects--execution)
  - [Traceability](#10-traceability--execution)
  - [Reports](#11-reports--insights)
  - [AI Assistant](#12-ai-assistant--insights)
  - [Settings](#13-settings--insights)
- [Shared UI Conventions](#shared-ui-conventions)
- [Key Business Rules](#key-business-rules)
- [Folder Structure](#folder-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [What Is Implemented](#what-is-implemented)
- [Known Gaps / Roadmap](#known-gaps--roadmap)
- [Troubleshooting](#troubleshooting)

---

## Stack & Technologies

### Frontend

| Layer | Technology | Notes |
| --- | --- | --- |
| Framework | **Next.js (App Router)** | `src/app/` routing, Server Components + Client Components (`"use client"` for interactive pages). |
| UI Library | **React 18** | Hooks, client-side state, forms, modals. |
| Language | **TypeScript** | Strict typing for pages, API handlers, and Supabase row types. |
| Styling | **Tailwind CSS** | Utility-first. Dark mode via `dark:` variants. Shared palette: `#101622` background, `#182232` cards, `#28374d` borders, `#276fbf` primary blue, `#dc2626` delete/remove red, `#48a43f` brand green. |
| Icons | **Lucide React** (`lucide-react`) | Sidebar icons, warnings, close (`X`), etc. Emoji is avoided for icons except the Bin (`🗑`) which is used as a text glyph where SVG icons get stripped on copy-paste. |
| Forms | Native React controlled inputs + shared `FormField` / `FormSelect` components in `src/components/ui/form-fields.tsx` | `inputCls` / `labelCls` shared classes for consistent inputs. |
| Layout | `Sidebar` + `Header` on every dashboard page | `src/components/dashboard/sidebar.tsx`, `src/components/dashboard/header.tsx`. Full-height flex layout, `overflow-y-auto` main content. |

### Backend / Data

| Layer | Technology | Notes |
| --- | --- | --- |
| API | **Next.js Route Handlers** (`route.ts`) | `src/app/api/*/route.ts` — REST endpoints for every entity. `GET` list/detail, `POST` create, `PATCH` update, `DELETE` delete. |
| Database | **Supabase (PostgreSQL)** | Single source of truth. Tables + Row Level Security (RLS). |
| Auth | **Supabase Auth** | Email/password. `createRouteSupabaseClient()` in `src/lib/supabase/route-client.ts` for API routes. `getUser()` check on protected routes returns `401` when unauthenticated. |
| Client | **Supabase JS Client** | Browser + route clients. `cache: 'no-store'` on fetches for fresh data. |
| Types | **Generated Supabase Types** (`Database`) | `src/lib/supabase.ts` / `supabase.ts` — `organizations`, `profiles`, `organization_members`, `projects`, `requirements`, etc. |

### Tooling & Deployment

| Layer | Technology |
| --- | --- |
| Package Manager | `npm` |
| Lint / Types | `tsc --noEmit` (must pass before commit), ESLint |
| Version Control | Git |
| Hosting | **Vercel** (Next.js native) |
| E2E / Manual Specs | Playwright spec files (e.g. `TC-003-add-to-cart-updated-11steps.spec.ts`) for documented manual/automated cases |
| Environment | `.env.local` — Supabase URL + keys (see below) |

### Why this stack

- **Next.js App Router** keeps frontend + API in one repo, one deploy, no separate backend service to maintain.
- **Supabase** gives Postgres + Auth + RLS out of the box, so multi-tenant org isolation is enforced at the DB layer, not just in UI code.
- **Tailwind** keeps every page visually consistent without a heavy component library, and makes the dark-mode design system easy to maintain.

---

## Architecture

```
Browser
  └─ Next.js App Router (React + Tailwind)
       ├─ Pages: /dashboard, /projects, /requirements, /test-plans, ...
       ├─ Components: Sidebar, Header, form-fields, ConfirmDialog
       └─ API Routes: /api/projects, /api/requirements, /api/test-cases, ...
            └─ Supabase Route Client (Auth + RLS)
                 └─ PostgreSQL (Supabase)
```

**Request flow (example: Create Test Case)**

1. User fills `src/app/test-cases/new/page.tsx` → `POST /api/test-cases`
2. Route handler checks `supabase.auth.getUser()` → `401` if missing.
3. Handler inserts into `test_cases` + `test_case_requirements` join rows.
4. Page redirects to `/test-cases` list, which re-fetches with `cache: 'no-store'`.

**Multi-tenancy**

- Every user belongs to an `organization` via `organization_members` (`super_admin`, `org_admin`, `qa_manager`, `qa_engineer`, `developer`, `viewer`).
- Most tables carry `organization_id` / `project_id`.
- RLS + API filtering by `organization_id` / `project_id` keeps projects isolated.

**No separate backend**

- All business logic lives in Route Handlers + client pages. There is no Express / FastAPI / separate server.

---

## Getting Started

### Prerequisites

- Node.js 18+ (20 recommended)
- npm
- A Supabase project (URL + anon key + service key for local dev if needed)

### Install

```bash
git clone <repo-url>
cd <repo>
npm install
```

### Run locally

```bash
npm run dev
# open http://localhost:3000
```

### Type-check (required before commit)

```bash
npx tsc --noEmit
```

### Build / Production

```bash
npm run build
npm start
```

### Commit pattern used in this project

```bash
npx tsc --noEmit
git add <changed-file>
git commit -m "Area: what changed"
git push
```

---

## Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional, if used by route clients / AI features
OPENAI_API_KEY=...
```

> Never commit `.env.local`. Rotate keys if they leak. The anon key is safe for the browser; the service-role key must stay server-only.

---

## Database Schema

Core tables (PostgreSQL via Supabase). Field names use `snake_case` in DB, `camelCase` in some API JSON — both are accepted on writes.

| Table | Purpose | Key Fields |
| --- | --- | --- |
| `organizations` | Tenant / company | `id`, `name`, `slug`, `plan`, `created_at` |
| `profiles` | User profile | `id` (FK to auth user), `email`, `full_name`, `avatar_url` |
| `organization_members` | Who belongs to which org + role | `organization_id`, `user_id`, `role` (`super_admin` / `org_admin` / `qa_manager` / `qa_engineer` / `developer` / `viewer`) |
| `projects` | Top-level container | `id`, `organization_id`, `key`, `name`, `description`, `status` |
| `milestones` (releases) | Release / milestone | `id`, `project_id`, `version_name` / `name`, `status`, `start_date`, `end_date` |
| `requirements` | What must be built / tested | `id`, `project_id`, `organization_id`, `req_key` / `requirement_id` (`REQ-101`), `title`, `description`, `priority` (`low` / `medium` / `high` / `critical`), `status` (`draft` / `under_review` / `approved` / `implemented` / `verified` / `rejected`), `type` (`functional` / `non_functional` / `business` / `performance` / `security`), `version`, `owner_id` |
| `test_plans` | Plan for a project / milestone | `id`, `project_id`, `title`, `scope`, `status` (`planning` / `active` / `completed` / `archived`), `start_date`, `end_date`, `milestone_id` |
| `test_suites` | Group of test cases | `id`, `project_id`, `test_plan_id` (optional), `name`, `description` |
| `test_cases` | Single test | `id`, `project_id`, `case_key` / `case_id` (`TC-P1-001`), `title`, `description`, `preconditions`, `steps` (JSON), `category`, `type` / `test_type`, `priority`, `status` (`draft` / `ready` / `in_review` / `approved` / `archived`) |
| `test_case_requirements` | **Join table: Test Case ↔ Requirement** | `test_case_id`, `requirement_id` — **this is the source of truth for Coverage / Traceability** |
| `test_suite_cases` / suite-case link | Suite ↔ Case membership | `test_suite_id`, `test_case_id` (via `/api/test-suites/[id]/cases`) |
| `test_runs` | Execution of a suite / plan | `id`, `project_id`, `test_suite_id` / `test_plan_id`, `name`, `status` (`in_progress` / `completed` / `passed` / `failed` / etc.), `created_at` |
| `test_results` / `run_results` | Per-case result inside a run | `test_run_id`, `test_case_id`, `status` (`passed` / `failed` / `blocked` / `not_executed` / `skipped`) |
| `defects` | Bug / issue | `id`, `project_id`, `key` / `defect_key`, `title` / `summary`, `description`, `steps_to_reproduce`, `severity`, `priority`, `status` (`open` / `in_progress` / `fixed` / `closed` / `resolved` / `rejected`), `requirement_id`, `test_case_id`, `environment` |
| `test_case_steps` (where used) | Steps as rows | `test_case_id`, `step_number`, `action`, `expected_result` |

> **Important:** Test Case ↔ Requirement links live **only** in `test_case_requirements`. The `test_cases` row itself does **not** reliably carry `requirement_id`. Any code that reads coverage from `test_cases.requirement_id` will return 0%. Always read coverage from `/api/traceability` (which reads the join table) or from the join table directly.

---

## API Routes

All under `src/app/api/`. All return JSON, `Cache-Control: no-store` for fresh data.

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/projects` | `GET`, `POST` | List / create projects |
| `/api/projects/[id]` | `GET`, `PATCH`, `DELETE` | Project detail, update, delete |
| `/api/milestones` | `GET`, `POST` | List / create milestones |
| `/api/milestones/[id]` | `GET`, `PATCH`, `DELETE` | Milestone detail / update / delete |
| `/api/requirements` | `GET`, `POST` | List / create requirements |
| `/api/requirements/[id]` | `GET`, `PATCH`, `DELETE` | Requirement detail / update / delete |
| `/api/test-plans` | `GET`, `POST` | List / create test plans |
| `/api/test-plans/[id]` | `GET`, `PATCH`, `DELETE` | Test plan detail / update / delete |
| `/api/test-suites` | `GET`, `POST` | List / create suites |
| `/api/test-suites/[id]` | `GET`, `PATCH`, `DELETE` | Suite detail / update / delete |
| `/api/test-suites/[id]/cases` | `GET`, `POST`, `DELETE` | List cases in suite, add case (`{ testCaseId }`), remove case (`?testCaseId=`) |
| `/api/test-cases` | `GET`, `POST` | List / create test cases (also writes join rows) |
| `/api/test-cases/[id]` | `GET`, `PATCH`, `DELETE` | Test case detail / update / delete |
| `/api/test-runs` | `GET`, `POST` | List / create runs |
| `/api/test-runs/[id]` | `GET`, `PATCH`, `DELETE` | Run detail / update / delete |
| `/api/test-runs/[id]/results` | `GET`, `POST` / `PATCH` | Results inside a run |
| `/api/defects` | `GET`, `POST` | List / create defects |
| `/api/defects/[id]` | `GET`, `PATCH`, `DELETE` | Defect detail / update / delete |
| `/api/traceability` | `GET` | **Source of truth for Coverage** — returns `{ rows, covered, total, coveragePct }`, each row with `projectId`, `testCases`, `coverage` |
| `/api/reports` | `GET` | Summary counts (legacy — Reports page now prefers Traceability for Coverage) |
| `/api/dashboard` | `GET` | Dashboard aggregates |
| `/api/ai/generate` | `POST` | AI Assistant — generate test cases from a requirement / prompt |

**Common query patterns**

- Filtering by project: `?project_id=<id>` or client-side `String(r.project_id) === projectFilter`.
- No-store: every list fetch uses `{ cache: 'no-store' }` to avoid stale Vercel cache.

---

## Sidebar — All Features Explained

The sidebar is the primary navigation. It is grouped into **Overview / Workspace / Test Design / Execution / Insights**. Active item is highlighted in blue (`#276fbf`).

Brand bar at top: green shield + **QA Management Platform** + version badge `v2.4` + `Test Management` footer.

### 1. Dashboard — Overview

**Route:** `/dashboard`

**What it does:** At-a-glance health of the whole workspace.

**Features:**

- **Summary cards:** Total Projects, Total Requirements, Total Test Cases, Total Defects, Test Runs, Coverage.
- **Coverage:** Same definition as Traceability / Reports — % of requirements with ≥1 linked test case.
- **Recent Test Runs:** Latest 5 runs with status pills (Completed = green, In Progress = blue).
- **Defects by Status:** Grouped counts (Open, In Progress, Fixed, Closed) with colored bars.
- **Quick navigation:** Click any card / row to jump to its detail page.
- **Project filter:** When a project is selected, all counts filter to that project.

**Use it when:** You want to answer “are we covered, are we passing, what’s open?” in 10 seconds.

---

### 2. Projects — Workspace

**Routes:** `/projects` (list), `/projects/new` (create), `/projects/[id]` (detail)

**What it does:** Top-level container for everything else. Nothing exists without a project.

**List page:**

- Table / cards of all projects: Key, Name, Description, Status, Created date.
- Search + status filter.
- **New Project** button → `/projects/new`.

**New page:**

- Fields: Name *, Key *, Description, Status.
- Buttons **outside** the card, half/half: **Create** (green, 50%) + **Cancel** (50%) — see [Shared UI Conventions](#shared-ui-conventions).

**Detail page (`/projects/[id]`):**

- Breadcrumb: `← Projects` on its own line + big title below it (same pattern as Test Plans / Test Suites).
- Card header: **Project Details** + **Delete** (solid red, Bin icon).
- Fields: Name, Description, Status, Key.
- **Saved.** banner: subtle dark-green tint, thin green border, green text, **inside** the card under the header (same as Project Details reference).
- **Save Changes:** Full-width green button **outside** the card at page bottom.
- **Delete:** Confirmation modal (“This will permanently delete this project…”) — deletes project and unlinks its children; test cases themselves are kept where applicable.
- All other detail pages copy this pattern.

---

### 3. Milestones — Workspace

**Routes:** `/milestones`, `/milestones/new`, `/milestones/[id]`

**What it does:** Releases / milestones that group requirements, plans, and runs by timebox (e.g. `P1 - Hardening`, `v1.0`, `Sprint 3`).

**Features:**

- List: Version Name, Project, Status, Start / End dates.
- New: Project *, Version Name *, Status, Dates, Description.
- Detail: Edit version, status, dates; Delete with confirm; Save outside card, full-width.
- Linked from: Test Plans (`Milestone (Release)` dropdown) and Requirements (optional milestone).

**Statuses:** `planning` / `active` / `completed` / `archived` (displayed as Planning / Active / Completed / Archived).

---

### 4. Requirements — Workspace

**Routes:** `/requirements`, `/requirements/new`, `/requirements/[id]`

**What it does:** The “what must be built” — the anchor for Coverage and Traceability. Every test case should trace to at least one requirement.

**List page:**

- Columns: Key (`REQ-101`, `REQ-PROD-001`), Title, Project, Priority, Status, Type, Linked Test Cases count.
- Search by key / title, filter by Project / Status / Priority.
- **New Requirement** button.

**New / Detail:**

- Fields: Project *, Requirement Key * (`REQ-101`), Title *, Description, Priority (`low` / `medium` / `high` / `critical`), Status (`draft` / `under_review` / `approved` / `implemented` / `verified` / `rejected`), Type (`functional` / `non_functional` / `business` / `performance` / `security`), Owner, Version.
- Detail shows linked test cases + linked defects (via Traceability logic).
- Save outside card (full-width) / Create + Cancel half/half on new.
- Delete with confirm.

**Example data in this workspace:**

- `REQ-101` — QA Studio project
- `REQ-PROD-001` … `REQ-PROD-005`, `REQ-106` … `REQ-111` — QA Management Platform project

**Coverage rule:** A requirement is **Covered** if ≥1 test case is linked via `test_case_requirements`. Otherwise **Not Covered**.

---

### 5. Test Plans — Test Design

**Routes:** `/test-plans`, `/test-plans/new`, `/test-plans/[id]`

**What it does:** The plan for testing a project / milestone — scope, dates, status, what suites / cases it covers.

**List page:**

- Cards / table: Title, Project, Status, Milestone, Start / End, Suites / Cases count.
- Filter by Project / Status.

**New / Detail:**

- Breadcrumb pattern (reference for all detail pages):
  ```
  ← Test Plans
  Production Readiness - P1 - Hardening   ← big bold title, outside card
  [ Test Plan Details card ]
  ```
- Card header: **Test Plan Details** + Delete (solid red, Bin).
- Fields: Title *, Scope (auto-growing textarea, no scrollbar), Status (`planning` / `active` / `completed` / `archived`), Start / End dates, Milestone (Release) dropdown, Project.
- **Saved.** banner inside card, subtle green (same as Project Details).
- Save full-width outside card; Create + Cancel half/half on new.
- Linked suites / cases section (where applicable) — Add / Remove with confirm.

**Example:** `Production Readiness - P1 - Hardening` — Project: QA Management Platform, Milestone: P1.

---

### 6. Test Suites — Test Design

**Routes:** `/test-suites`, `/test-suites/new`, `/test-suites/[id]`

**What it does:** A named group of test cases, usually inside a test plan. The unit you execute in a Test Run.

**List page:**

- Columns: Suite Name, Project, Test Plan, # Cases, Description.
- Filter by Project / Plan.
- **New Suite** button.

**New page:**

- Fields: Project *, Test Plan (optional), Suite Name *, Description.
- Buttons outside card, half/half: **Create** + **Cancel**.

**Detail page (`/test-suites/[id]`) — heavily refined:**

- Breadcrumb + title (Test Plans pattern):
  ```
  ← Test Suites
  To Delete Test   ← big bold title, outside card
  [ Test Suite Details card ]
  ```
- Card 1 header: **Test Suite Details** + Delete (solid red, Bin icon). Subtitle: `{n} test case(s)`.
- Fields: Suite Name *, Description (auto-growing, no scrollbar).
- **Saved.** banner: subtle `bg-green-500/10 border-green-500/30 text-green-400`, inside card under header.
- Card 2: **Test Cases in this Suite**
  - Dropdown: `Select a test case to add...` + **Add Case** (blue, `#276fbf`).
  - Each row: `TC-xxx - Title` (link to test case) + **Remove** (solid red, white text, just `Remove`, no `x`).
  - Remove opens confirm modal: “Remove this test case from the suite? … The test case itself is kept, you can add it back later.”
  - Empty state: “No test cases in this suite yet.”
- **Save Changes:** Full-width green button outside cards at page bottom. `Saving...` state while saving.
- **Delete:** Confirm modal — “This will permanently delete this suite and unlink its test cases. The test cases themselves are kept.”
- **Data loading:** Tries `/api/test-suites/[id]/cases` first, then falls back to `suite.cases` / `suite.testCases` / ID list, then to filtering all cases by `suite_id` / `suite_ids`. This makes the detail resilient to different API shapes.

---

### 7. Test Cases — Test Design

**Routes:** `/test-cases`, `/test-cases/new`, `/test-cases/[id]`

**What it does:** The actual test — steps + expected results, linked to requirements, grouped into suites.

**List page:**

- Columns: Case Key (`TC-P1-001`, `TC-001`), Title, Project, Category, Type, Priority, Status, Linked Requirements.
- Search + filters (Project, Status, Priority, Category).
- **New Test Case** button.

**New page (`/test-cases/new`) — recently fixed:**

- Breadcrumb: `← Back to Test Cases`
- Card: **Add Test Case** header.
- Fields:
  - Project *, Test Plan (optional)
  - Case Key * (`TC-001`, auto-uppercased)
  - Title *, Description
  - Preconditions (auto-growing textarea)
  - **STEPS** — header row `flex justify-between items-center mb-2` (8px gap below `+ Add Step`, matching Defects / new). Each step row: `1.` + **Step** textarea (auto-grow, `rows=1`) + **Expected Result** textarea + **Remove** (solid red). `+ Add Step` (blue) adds a blank step. Remove opens confirm modal.
  - Category, Type (`functional` / `regression` / `smoke` / `security` / `performance` / `integration` / `ui` / `api` / `automation` / `e2e` / `uat` / `system` / `exploratory`), Priority (`low` / `medium` / `high` / `critical`), Status (`draft` / `ready` / `in_review` / `approved` / `archived`)
  - **Linked Requirements** — scrollable checkbox list (`max-h-40`), shows `REQ-xxx — Title`, count of selected.
- **Buttons outside the card:** `<form>` wraps the card + buttons. Buttons below card, `mt-4`, half/half: **Add Test Case** (green, 50%, `flex-1`) + **Cancel** (50%, `flex-1`, border, centered). Not `FormActions` (which rendered small left-aligned buttons) — explicit half/half.
- On submit: `POST /api/test-cases` with `steps` as `[{ step_number, action, expected_result }]` + `requirementIds`. Redirects to `/test-cases`.

**Detail page (`/test-cases/[id]`):**

- Same breadcrumb + title pattern, **Test Case Details** card.
- Steps editor (same as new), Preconditions, Category / Type / Priority / Status, Linked Requirements.
- **Remove** buttons for steps / linked requirements are solid red, no `x`.
- Save full-width outside card, Saved banner inside card.
- Delete with confirm.

**Example:** `TC-P1-001` — used in the P1 hardening run.

---

### 8. Test Runs & Results — Execution

**Routes:** `/test-runs`, `/test-runs/new`, `/test-runs/[id]`

**What it does:** Executing a suite / plan and recording per-case Pass / Fail / Blocked results.

**List page:**

- Columns: Run Name, Project, Suite / Plan, Status, Passed / Failed / Blocked / Total, Created date.
- **Project filter** (new): dropdown at top, filters runs to one project. Uses **UNION** logic — a run matches if its own `project_id` matches OR its suite/plan’s `project_id` matches. This fixes the bug where runs created from a suite showed under the wrong project.
- **EMPTY = NONE** rule: If a run has no cases (empty suite / empty selection), it shows **0 cases, 0%**, not a phantom 100% or 1/1. A clean run with only `TC-P1-001` correctly shows **1/1**.
- **New Run** button.

**New page:**

- Fields: Project *, Test Suite * (or Test Plan), Run Name *, Environment, Notes.
- Selecting a suite loads its cases (via `/api/test-suites/[id]/cases` + fallbacks).
- Buttons outside card, half/half: **Create Run** + **Cancel**.

**Detail page (`/test-runs/[id]`):**

- Header: Run Name + Status pill + **Delete** / **Complete Run** actions.
- **Results table:** Each case row with result dropdown / buttons: `Passed` (green), `Failed` (red), `Blocked` (yellow), `Not Executed` / `Skipped` (gray).
- **Progress:** `X of Y cases completed` + % bar. `EMPTY = NONE` applies here too.
- **Summary:** Passed / Failed / Blocked / Not Executed counts.
- Save / Complete: Completing a run sets `status = completed` and freezes results (or prompts if incomplete).
- Defect creation: From a Failed result, **Create Defect** pre-fills requirement / case / steps.

**Statuses:** `in_progress` / `completed` (displayed as In Progress / Completed), plus per-result statuses above.

---

### 9. Defects — Execution

**Routes:** `/defects`, `/defects/new`, `/defects/[id]`

**What it does:** Bugs found during runs or manual testing, linked to requirements / cases / runs.

**List page:**

- Columns: Key (`DEF-001`), Title / Summary, Project, Severity, Priority, Status, Linked Requirement / Case.
- Filters: Project, Status, Severity, Priority.
- **Report Defect** button.

**New page (`/defects/new`):**

- Fields: Project *, Title / Summary *, Description, Severity (`critical` / `high` / `medium` / `low`), Priority, Status (`open` / `in_progress` / `fixed` / `closed` / `resolved` / `rejected`), Environment, Linked Requirement, Linked Test Case.
- **Steps to Reproduce** — header `flex justify-between items-center mb-2` (reference for the STEPS gap fix). Each step: `1.` + textarea (`rows=2`, auto-grow) + **Remove** (solid red). `+ Add Step` (blue).
- Buttons outside card, half/half: **Report Defect** + **Cancel**.
- On submit: `POST /api/defects`, redirect to `/defects`.

**Detail page:**

- Same layout: Defect Details card, Steps to Reproduce, Linked items.
- Status transitions: Open → In Progress → Fixed → Closed / Resolved. Rejected is terminal.
- Save full-width outside card, Delete with confirm.
- **Defects by Status** on Reports uses these statuses.

---

### 10. Traceability — Execution

**Route:** `/traceability`

**What it does:** The audit view: **Requirement → Test Cases → Defects**. Answers “is every requirement tested, and where are the gaps?”

**Features:**

- Search: filter by requirement key / title.
- Header pill: `{covered} of {total} covered · {pct}%` — e.g. **8 of 12 covered · 67%**.
- Table columns: **Requirement** (`REQ-xxx — Title` + linked test cases listed below), **Project**, **Test Cases** (count), **Defects** (count + list), **Coverage** pill (`Covered` green / `Not Covered` gray).
- Each row shows linked test cases (`TC-xxx — Title`) and linked defects (`DEF-xxx — Summary`) inline.
- Footer note: *“Coverage = Covered if at least 1 test case is linked to the requirement. Defects count = defects linked to that requirement, or to any of its linked test cases.”*
- Project column repeats the project name per row — this is expected (11 requirements in QA Management Platform show that project 11 times; `REQ-101` shows `QA Studio` because it belongs to the other project).

**Data source:** `GET /api/traceability` — reads `requirements`, `test_cases`, `defects`, `projects` + join logic. Returns `{ rows, covered, total, coveragePct }`. Each row has `projectId`, `testCases`, `coverage`.

**Coverage definition (single source of truth):**

```
Covered = at least 1 test case linked via test_case_requirements
Coverage % = round(covered / total * 100)
```

**Example (current workspace):**

- Overall: 8 of 12 = 67%
- QA Management Platform: 7 of 11 = 64% — PROD-003 (5 cases), PROD-004 (4), PROD-005 (4), REQ-106 (1), REQ-111 (1), PROD-001 (5), PROD-002 (5)

---

### 11. Reports — Insights

**Route:** `/reports`

**What it does:** Summary of testing coverage and quality, filterable by project.

**Features:**

- **Project filter:** Dropdown `All Projects` / specific project. All cards + charts filter to that project.
- **4 cards (centered):**
  - **TOTAL REQUIREMENTS** — e.g. `11` for QA Management Platform, `12` for All Projects
  - **COVERAGE** — e.g. `64%` for QA Management Platform, `67%` for All Projects — **same definition as Traceability**
  - **FIXED DEFECTS** — defects with status `fixed` / `closed` / `resolved`
  - **OPEN DEFECTS** — defects with status not in `fixed` / `closed` / `resolved` / `rejected`
- **Subline:** `{total} requirements · {completed} of {totalRuns} runs completed.` — e.g. `11 requirements · 0 of 7 runs completed.` This is **execution**, not link coverage. 0 completed runs does not mean 0% coverage.
- **Defects by Status:** Grouped bars (Open red, In Progress yellow, Fixed/Closed green).
- **Recent Test Runs:** Latest 5 runs with status pills.
- Footer: *“Coverage = Covered if at least 1 test case is linked via test_case_requirements — same definition as Traceability.”*

**Bug fixed:** Reports previously recomputed coverage from `/api/test-cases` rows (which strip join-table links) and only used Traceability when **no** project was selected. Picking a project fell back to the broken calc → **0%** while Traceability showed **67%**. Now Reports **always** uses `/api/traceability` rows, filtered by `projectId`, for Coverage. `TOTAL REQUIREMENTS` uses the same denominator as Coverage, so `64% = 7/11` is consistent.

---

### 12. AI Assistant — Insights

**Route:** `/ai-assistant`

**What it does:** Generate test cases / test ideas from a requirement or free-text prompt, to speed up test design.

**Features:**

- Input: Select a requirement (or paste a description / acceptance criteria) + optional project / count.
- **Generate** button → `POST /api/ai/generate` → returns draft test cases (Title, Steps, Expected Results).
- Review drafts in a table / list, edit inline, then **Add to Test Cases** / **Save as Draft**.
- History: Previous generations for the same requirement.
- Safety: AI output is always a draft — user must review and save. No auto-creation without confirmation.

> AI generation is an accelerator, not a replacement for review. Always verify steps against the actual requirement.

---

### 13. Settings — Insights

**Route:** `/settings`

**What it does:** Workspace + account configuration.

**Features:**

- **Organization:** Name, Slug, Plan. (Project Details pattern — Save outside card, Saved banner inside card.)
- **Profile:** Full Name, Email (read-only from Auth), Avatar URL.
- **Members:** List of `organization_members` with roles (`super_admin` / `org_admin` / `qa_manager` / `qa_engineer` / `developer` / `viewer`). Invite / remove (admin only).
- **Preferences:** Theme (Light / Dark / System), Default Project, Date format.
- **Danger Zone:** Delete organization (admin only, confirm modal).

---

## Shared UI Conventions

These are enforced across all pages — if you add a new page, follow them.

### Save / Create buttons

| Page type | Pattern |
| --- | --- |
| **Detail** (`/x/[id]`) | **Save Changes** — full-width green `bg-green-600`, **outside** cards at page bottom, `mt-4`, `py-2.5`, `Saving...` while saving |
| **New** (`/x/new`) | **Half/half, outside card:** `Create` / `Add X` (green, `flex-1`, 50%) + **Cancel** (border, `flex-1`, 50%, centered). `<form>` wraps card + buttons. Do **not** use `FormActions` (it renders small left-aligned buttons). |

### Saved banner

- **Inside** the top card, under the header, above the first field.
- Subtle, **not** solid bright green:
  ```
  w-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded px-3 py-2.5
  Saved.
  ```
- Error banner is the red mirror: `bg-red-500/10 border-red-500/30 text-red-400`.
- Auto-hides after 3s (`setTimeout(..., 3000)`).

### Breadcrumb + Title (detail pages)

```
← Test Plans                    ← link, text-xs, blue, on its own line
Production Readiness - P1 - Hardening   ← h1, text-lg font-bold, mt-2, outside card
[ Test Plan Details card ]      ← card header is "Test Plan Details", not the title again
```

- Do **not** use `← Test Plans / Title` on one line (clips, duplicates title).
- Card header uses the entity name: `Project Details`, `Test Plan Details`, `Test Suite Details`, `Test Case Details`, `Defect Details`.

### Remove / Delete

| Action | Style |
| --- | --- |
| **Remove** (remove from suite / step / link) | Solid red, white text, just `Remove`, **no `x`**: `shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs px-3.5 py-2 rounded` |
| **Delete** (delete entity) | Solid red button with Bin icon + `Delete` text: `bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs px-3 py-1.5 rounded` + `🗑` glyph |
| **Confirm modals** | Warning icon (`!` in red circle) + title + explanation + **Cancel** (border) + **Delete / Remove** (solid red). Centered, `max-w-md`, `bg-black/50` overlay. |

### Add Case / Add Step

- **Add Case** / **Add Step**: Blue `bg-[#2563eb]` / `bg-[#276fbf]`, white text, `text-xs px-2.5 py-1 rounded` (Add Step) / `px-3.5 py-2` (Add Case).
- **STEPS gap:** Header row must be `flex justify-between items-center mb-2` (8px gap) — same on Test Cases / new and Defects / new. Missing `mb-2` makes `+ Add Step` sit flush on `Remove`.

### Inputs

- `inputCls`: `text-xs bg-white dark:bg-[#101622] text-slate-900 dark:text-white border border-[#b6c2cf] dark:border-[#28374d] rounded px-3 py-2 w-full`
- `labelCls`: `text-xs font-semibold text-slate-500 dark:text-slate-400`
- Textareas: `resize-none overflow-hidden`, auto-grow via `onInput` (`height = auto; height = scrollHeight`), `rows=1..3` initial, no scrollbar.

### Cards / Layout

- Page: `flex h-screen bg-[#f5f7f9] dark:bg-[#101622]` + `Sidebar` + `flex-1 flex flex-col overflow-hidden` + `Header` + `main flex-1 overflow-y-auto p-6`.
- Content: `w-full mx-auto` (detail / new) or `w-full max-w-none` (list / reports).
- Card: `bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] rounded-md overflow-hidden` (or `overflow-visible` where dropdowns need to escape).
- Card header: `flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700/50`, title `text-base font-bold`, subtitle `text-xs text-slate-500`.
- Card body: `px-5 py-4 space-y-4` (detail) / `p-6 space-y-6` (new).

### Font weights

- Page titles (outside card): `text-lg font-bold` (700) — same as Test Plans, Test Suites, etc.
- Card headers: `text-base font-bold`.
- Labels: `text-xs font-semibold`.
- Body / inputs: `text-xs font-normal`.
- Do not use `font-medium` for titles — `font-bold` is the standard.

---

## Key Business Rules

1. **Coverage = Link Coverage (not execution)**
   ```
   Covered = ≥1 test case linked via test_case_requirements
   Coverage % = round(covered / total * 100)
   ```
   Reports, Dashboard, and Traceability all use this. Execution (`0 of 7 runs completed`) is separate.

2. **EMPTY = NONE**
   - A run / suite with 0 cases shows **0 cases, 0%**, never 100% or 1/1.
   - A clean run with only `TC-P1-001` shows **1/1**.

3. **Test Runs Project Filter = UNION**
   - A run matches a project filter if `run.project_id == filter` **OR** `suite.project_id == filter` **OR** `plan.project_id == filter`.
   - Fixes runs created from a suite showing under the wrong project.

4. **Test Case ↔ Requirement links live in the join table**
   - Never compute coverage from `test_cases.requirement_id`. Always use `/api/traceability` or `test_case_requirements`.

5. **Delete vs Remove**
   - **Delete** = permanently delete the entity (suite, case, project, etc.).
   - **Remove** = unlink from a parent (remove case from suite, remove step, remove requirement link). The child entity is kept and can be re-added.

6. **Save is explicit**
   - No auto-save. User clicks **Save Changes** / **Create** / **Add**. Saved banner confirms.

7. **Copy-paste safety**
   - No raw SVG tags in pasted files (they get stripped by the editor). Use text glyphs (`🗑`, `!`, `←`) or Lucide components imported from `lucide-react`.

---

## Folder Structure

```
src/
  app/
    dashboard/page.tsx
    projects/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    milestones/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    requirements/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    test-plans/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    test-suites/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    test-cases/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    test-runs/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    defects/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    traceability/page.tsx
    reports/page.tsx
    ai-assistant/page.tsx
    settings/page.tsx
    api/
      projects/...
      requirements/...
      test-cases/...
      test-suites/[id]/cases/route.ts
      test-runs/...
      defects/...
      traceability/route.ts
      reports/route.ts
      dashboard/route.ts
      ai/generate/route.ts
  components/
    dashboard/
      sidebar.tsx
      header.tsx
    ui/
      form-fields.tsx
      confirm-dialog.tsx
  lib/
    supabase/
      route-client.ts
      browser-client.ts
    supabase.ts
```

---

## Testing

### Manual

- Use the app: Create Project → Requirement → Test Plan → Test Suite → Test Case → Test Run → Defect → Traceability → Reports. Verify counts match at each step.

### Playwright specs (documented cases)

- `TC-003-add-to-cart-updated-11steps.spec.ts` — example E2E spec for add-to-cart flow (11 steps). Run with Playwright where configured:
  ```bash
  npx playwright test
  ```

### Type-check

```bash
npx tsc --noEmit
```

---

## Deployment

- **Vercel:** Connect repo → set env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) → Deploy.
- **Supabase:** Run migrations / `supabase_schema.sql` in SQL Editor. Enable RLS on all tables. Verify `test_case_requirements` join table exists.
- **Post-deploy checks:**
  1. Login works.
  2. `/projects` lists projects.
  3. `/traceability` shows `8 of 12 covered · 67%` (or current counts).
  4. `/reports` with `QA Management Platform` shows `11 · 64%` (not `0%`).
  5. `/test-runs` with Project filter shows correct runs (UNION).
  6. `/test-suites/[id]` Save shows subtle Saved banner inside card, not solid green.

---

## What Is Implemented

- [x] Auth (Supabase) + org / member roles
- [x] Dashboard with summary cards, recent runs, defects by status
- [x] Projects CRUD + detail (Save outside, Saved banner inside, Delete Bin)
- [x] Milestones CRUD
- [x] Requirements CRUD + linked cases / defects
- [x] Test Plans CRUD + milestone link + scope auto-grow
- [x] Test Suites CRUD + detail (Add Case, Remove solid red, Save outside, breadcrumb + title like Test Plans)
- [x] Test Cases CRUD + new (STEPS `mb-2` gap fix, buttons outside card half/half, Linked Requirements checkboxes, auto-grow steps)
- [x] Test Runs CRUD + Project filter (UNION) + EMPTY = NONE + results (Passed / Failed / Blocked / Not Executed)
- [x] Defects CRUD + Steps to Reproduce (`mb-2` reference) + severity / priority / status
- [x] Traceability (Requirements → Cases → Defects, Coverage from join table, 8/12 = 67%)
- [x] Reports (Coverage from Traceability, filtered by project, 11 · 64% for QA Management Platform, Defects by Status, Recent Runs)
- [x] AI Assistant (generate drafts from requirement)
- [x] Settings (Organization, Profile, Members, Preferences)
- [x] Shared UI conventions (Save outside, Saved subtle, Remove solid red, Delete Bin, breadcrumb + title, font-bold titles)
- [x] Dark mode (Tailwind `dark:`) across all pages

---

## Known Gaps / Roadmap

- [ ] **REQ-107** — needs Title + Description (currently a placeholder row with 0 cases). Add full requirement text before it can be covered.
- [ ] **Test Runs:** Bulk result entry, run cloning, export to CSV / PDF.
- [ ] **Reports:** Export to CSV / PDF, trend charts over time, execution coverage (Passed / Total in completed runs) as a separate card from link coverage.
- [ ] **Defects:** Attachments / screenshots, comments / activity log, Jira / GitHub sync.
- [ ] **AI Assistant:** Save drafts directly as Test Cases with one click, bulk generation for a whole Test Plan.
- [ ] **Settings:** Role-based permissions enforcement in UI (currently RLS + API, UI still shows all actions), audit log.
- [ ] **Mobile:** Sidebar collapses on small screens; some tables need horizontal scroll polish.
- [ ] **Tests:** Add automated Playwright + unit tests for Coverage / UNION / EMPTY = NONE rules.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| Reports shows `0%` but Traceability shows `67%` | Reports recomputed from `test_cases` rows instead of join table | Reports now uses `/api/traceability` rows (fixed). Re-deploy `src/app/reports/page.tsx`. |
| Test Run shows wrong project | Run filtered by `run.project_id` only | Use UNION: run OR suite OR plan `project_id` (fixed in Test Runs). |
| Run shows `1/1` when it should be `0/0` | Empty suite counted as 1 | Apply EMPTY = NONE: `total == 0 → 0%`, not `100%`. |
| Save banner is solid bright green | Old `bg-green-600 text-white` banner | Use subtle `bg-green-500/10 border-green-500/30 text-green-400` inside card. |
| Buttons are small / left-aligned | Using `FormActions` | Replace with explicit half/half `flex gap-2` + `flex-1` buttons outside card. |
| Buttons inside card | Buttons inside `<form>` inside card | Move `<form>` to wrap card + buttons, buttons in `flex gap-2 mt-4` below card. |
| STEPS gap different between Test Cases / Defects | Test Cases header missing `mb-2` | Header must be `flex justify-between items-center mb-2` on both. |
| Breadcrumb clips / duplicates title | `← Test Suites / Title` on one line + H1 inside card | Use two lines: `← Test Suites` + `h1` outside card, card header = `Test Suite Details`. |
| `401 Unauthorized` on API | No session / expired token | Re-login. Check `createRouteSupabaseClient()` + cookies. |
| `npx tsc` fails | Type mismatch / missing import | Fix types, remove unused `FormActions` import, re-run. |

---

## License

Internal / proprietary — QA Management Platform. Do not distribute without permission.

## Contributing

1. Branch from `main`.
2. Follow [Shared UI Conventions](#shared-ui-conventions).
3. Run `npx tsc --noEmit`.
4. Commit with `Area: what changed` message.
5. Open PR with screenshot for any UI change (especially Save / Delete / Remove / STEPS gap).
