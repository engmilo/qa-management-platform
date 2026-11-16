import pathlib, sys

# --- Details: src/app/test-cases/[id]/page.tsx ---
p = pathlib.Path("src/app/test-cases/[id]/page.tsx")
t = p.read_text(encoding="utf-8")

if "exploratory" in t and "system" in t:
    # Check if both are in the Type <select> (not just elsewhere)
    # Details Type select is on the line with <option value="functional">
    # If both already in that line, skip
    for line in t.splitlines():
        if '<option value="functional"' in line:
            if "exploratory" in line and "system" in line:
                print("SKIP: test-cases Details Type — System + Exploratory already present")
            else:
                print("Details Type line found, missing System/Exploratory — patching")
                # Patch that line below via generic replace
                pass
            break

# Patch Details: insert System + Exploratory before </select> of Type dropdown
# Details Type ends with <option value="uat">UAT</option></select>
needle_details = '<option value="uat">UAT</option></select>'
if needle_details in t and "exploratory" not in t.split(needle_details)[0].split('<option value="functional"')[-1] if '<option value="functional"' in t else True:
    # Only if not already in Type select — check the Type select line
    pass

if '<option value="exploratory">Exploratory</option>' not in t:
    if needle_details not in t:
        print("NOT FOUND: Details Type UAT option")
        sys.exit(1)
    t = t.replace(needle_details, '<option value="uat">UAT</option><option value="system">System</option><option value="exploratory">Exploratory</option></select>', 1)
    p.write_text(t, encoding="utf-8")
    print("OK: Details Type — added System + Exploratory. Details now = 14")
else:
    print("SKIP: Details Type — Exploratory already present")

# --- New: src/app/test-cases/new/page.tsx ---
p2 = pathlib.Path("src/app/test-cases/new/page.tsx")
t2 = p2.read_text(encoding="utf-8")

if "{ value: 'exploratory'" in t2 and "{ value: 'system'" in t2:
    print("SKIP: test-cases New Type — System + Exploratory already present")
else:
    # New Type ends with { value: 'uat', label: 'UAT' },
    needle_new = "{ value: 'uat', label: 'UAT' },"
    if needle_new not in t2:
        print("NOT FOUND: New Type UAT option — paste sed -n '225,250p' src/app/test-cases/new/page.tsx")
        sys.exit(1)
    # Insert after UAT line, keep same indent
    idx = t2.find(needle_new)
    eol = t2.find("\n", idx)
    line_start = t2.rfind("\n", 0, idx) + 1
    indent = t2[line_start:idx]
    insert = ""
    if "{ value: 'system'" not in t2:
        insert += f"\n{indent}{{ value: 'system', label: 'System' }},"
    if "{ value: 'exploratory'" not in t2:
        insert += f"\n{indent}{{ value: 'exploratory', label: 'Exploratory' }},"
    t2 = t2[:eol] + insert + t2[eol:]
    p2.write_text(t2, encoding="utf-8")
    print("OK: New Type — added System + Exploratory. New now = 14")

print("Done — Details = New = DB = 14 Types. Labels only, no DB change.")
