import pathlib, sys

p = pathlib.Path("src/app/requirements/new/page.tsx")
t = p.read_text(encoding="utf-8")

if "under_review" in t:
    print("SKIP: requirements new — under_review already present")
    sys.exit(0)

needle = "{ value: 'draft', label: 'Draft' },"
idx = t.find(needle)
if idx == -1:
    print("NOT FOUND: draft option in requirements/new")
    sys.exit(1)

eol = t.find("\n", idx)
if eol == -1:
    print("NOT FOUND: end of draft line")
    sys.exit(1)

line_start = t.rfind("\n", 0, idx) + 1
indent = t[line_start:idx]
insert = f"\n{indent}{{ value: 'under_review', label: 'Under Review' }},"
t = t[:eol] + insert + t[eol:]
p.write_text(t, encoding="utf-8")
print("OK: requirements new — added Under Review. New now = Details = 7")
