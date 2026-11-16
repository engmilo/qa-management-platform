import pathlib, sys
p = pathlib.Path("src/app/api/test-suites/route.ts")
t = p.read_text(encoding="utf-8")

old1 = "  const projectId = typeof body.projectId === 'string' ? body.projectId : '';"
new1 = "  const projectId = typeof body.projectId === 'string' && body.projectId ? body.projectId : typeof body.project_id === 'string' ? body.project_id : '';"
if new1 in t:
    print("SKIP: projectId already accepts both")
else:
    if old1 not in t:
        print("NOT FOUND: projectId line")
        sys.exit(1)
    t = t.replace(old1, new1, 1)
    print("OK: projectId now accepts projectId + project_id")

old2 = "  if (typeof body.testPlanId === 'string' && body.testPlanId) {\n    const { data: plan } = await supabase.from('test_plans').select('id').eq('id', body.testPlanId).eq('project_id', project.id).maybeSingle();"
new2 = "  const rawTestPlanId = typeof body.testPlanId === 'string' && body.testPlanId ? body.testPlanId : typeof body.test_plan_id === 'string' ? body.test_plan_id : '';\n  if (rawTestPlanId) {\n    const { data: plan } = await supabase.from('test_plans').select('id').eq('id', rawTestPlanId).eq('project_id', project.id).maybeSingle();"
if new2 in t:
    print("SKIP: testPlanId already accepts both")
else:
    if old2 not in t:
        print("NOT FOUND: testPlanId block")
        sys.exit(1)
    t = t.replace(old2, new2, 1)
    print("OK: testPlanId now accepts testPlanId + test_plan_id")

p.write_text(t, encoding="utf-8")
print("Done — API only, frontend untouched.")
