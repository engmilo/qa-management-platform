import pathlib, re
# Run from repo root: C:\Users\engmi\.claude\qa-management-platform  (NO Modern)
# Fixes Reports <h1> font-weight to match Projects <h1> exactly.
# Tiny patch - only the Reports heading class, nothing else.

root = pathlib.Path("src/app")
reports = root / "reports/page.tsx"
projects = root / "projects/page.tsx"

def get_h1_class(text):
    # Find first <h1 ... className="...">
    m = re.search(r"<h1[^>]*className=\"([^\"]+)\"", text)
    if m:
        return m.group(1)
    m = re.search(r"<h1[^>]*className=\{`([^`]+)`\}", text)
    return m.group(1) if m else None

rt = reports.read_text(encoding="utf-8")
pt = projects.read_text(encoding="utf-8")

pc = get_h1_class(pt)
rc = get_h1_class(rt)
print(f"Projects h1: {pc}")
print(f"Reports  h1: {rc}")

if not pc:
    print("Could not find Projects h1 - paste first <h1> line from projects/page.tsx")
    raise SystemExit(1)
if not rc:
    print("Could not find Reports h1 - paste first <h1> line from reports/page.tsx")
    raise SystemExit(1)

if pc == rc:
    print("Already same - no change needed")
else:
    # Replace only the first Reports h1 class with Projects h1 class
    nt, n = re.subn(r"(<h1[^>]*className=\")([^\"]+)(\")", lambda m: m.group(1) + pc + m.group(3), rt, count=1)
    if n == 0:
        # Try template literal form
        nt, n = re.subn(r"(<h1[^>]*className=\{`)([^`]+)(`\})", lambda m: m.group(1) + pc + m.group(3), rt, count=1)
    if n > 0:
        reports.write_text(nt, encoding="utf-8")
        print(f"FIXED Reports h1: '{rc}' -> '{pc}'")
        print("Next: npm run build  then refresh /reports - heading should now be bold like Projects")
    else:
        print("No replacement - paste the <h1> line from reports/page.tsx")
