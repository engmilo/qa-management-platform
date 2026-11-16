from pathlib import Path
p = Path("src/app/api/ai-assistant/generate-test-cases/route.ts")
t = p.read_text(encoding="utf-8")
old = ".select('id, req_key, title, description, acceptance_criteria, project_id')"
assert old in t, "Select line not found"
# Use * so we never fail on a missing column, and surface Supabase error if any
new = ".select('*')"
t = t.replace(old, new)
# Fix error handling: check Supabase error, not just null
old2 = "    const { data: reqRow } = await supabase.from('requirements').select('*').eq('id', requirementId).eq('project_id', projectId).maybeSingle();\n    if (!reqRow) return NextResponse.json({ error: 'Requirement not found in this project.' }, { status: 400 });"
new2 = "    const { data: reqRow, error: reqErr } = await supabase.from('requirements').select('*').eq('id', requirementId).eq('project_id', projectId).maybeSingle();\n    if (reqErr) return NextResponse.json({ error: `Could not load requirement: ${reqErr.message}` }, { status: 400 });\n    if (!reqRow) return NextResponse.json({ error: 'Requirement not found in this project.' }, { status: 400 });"
assert old2 in t, "reqRow block not found"
t = t.replace(old2, new2)
# Acceptance criteria is now optional — use whatever field exists, fallback to empty
old3 = "Acceptance Criteria: ${reqRow.acceptance_criteria || ''}"
new3 = "Acceptance Criteria: ${(reqRow as any).acceptance_criteria || (reqRow as any).acceptanceCriteria || ''}"
if old3 in t:
    t = t.replace(old3, new3)
    print("Made acceptance_criteria optional")
p.write_text(t, encoding="utf-8")
print("Fixed generate-test-cases: select(*) + real Supabase error")
print("DONE")
