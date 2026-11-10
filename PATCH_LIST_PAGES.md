# P0 — List-page patches (apply by hand, 2 minutes each)
Your existing list pages render rows as plain <span>/<td> with no link.
Make them clickable so the new detail pages are reachable:

## src/app/test-runs/page.tsx
Find the row that renders run.name. Wrap it:
  <Link href={`/test-runs/${run.id}`} className="text-[#276fbf] hover:underline font-semibold">{run.name}</Link>
And add a second link in the actions column: <Link href={`/test-runs/${run.id}`}>Open →</Link>

## src/app/test-cases/page.tsx
  <Link href={`/test-cases/${tc.id}`} className="text-[#276fbf] hover:underline font-semibold">{tc.case_key} — {tc.title}</Link>

## src/app/test-plans/page.tsx
  <Link href={`/test-plans/${plan.id}`} className="text-[#276fbf] hover:underline font-semibold">{plan.title}</Link>

## src/app/defects/page.tsx
Defect detail API exists at /api/defects/[id]. Add a detail page later (P1) — for P0 the
defect row in the run page already creates + links defects. In defects list, keep the
existing row but add a status-change affordance: call PATCH /api/defects/[id] with { status }.
Example:
  await fetch(`/api/defects/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'fixed' }) });

## src/app/requirements/page.tsx
Same pattern: wrap title in <Link href={`/requirements/${id}`}> — API exists, UI detail is P1
(you can copy src/app/test-cases/[id]/page.tsx and swap fields).

## src/components/dashboard/sidebar.tsx
Optional: add Milestones entry pointing to /test-plans (milestones are managed per-plan
in P0) or create src/app/milestones/page.tsx that calls GET /api/releases?projectId=.

