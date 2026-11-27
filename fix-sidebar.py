import pathlib, re
p = pathlib.Path("src/components/dashboard/sidebar.tsx")
t = p.read_text(encoding="utf-8")
orig = t
lines = t.splitlines()
out = []
removed = []
for line in lines:
    s = line.strip()
    if any(x in s for x in ["'Performance Testing'", '"Performance Testing"', "'API Testing'", '"API Testing"', "'Visual Testing'", '"Visual Testing"', "'Functional Testing'", '"Functional Testing"']):
        if "-testing" in line and "href" in line:
            removed.append(line.strip())
            continue
    out.append(line)
t = "\n".join(out) + "\n"
# Remove stray "]}," that was closing the deleted AUTOMATION group, right before Execution group
t = re.sub(r"\n\s*\]\},\s*\n(\s*\{\s*label:\s*'Execution')", r"\n\1", t, count=1)
# Remove now-unused icon imports if they are no longer used outside import
for name in ["Gauge", "Webhook", "Eye", "FlaskConical"]:
    if name in t:
        uses = [l for l in t.splitlines() if name in l and "import" not in l]
        if not uses:
            t = re.sub(r",?\s*" + name + r"\b", "", t, count=1)
            print(f"Removed unused import {name}")
t = re.sub(r"import\s*\{\s*,", "import { ", t)
t = re.sub(r",\s*\}", " }", t)
if t != orig:
    p.write_text(t, encoding="utf-8")
    print("FIXED sidebar.tsx")
    for r in removed:
        print(" -", r)
else:
    print("NO CHANGE")
print("Next: npm run build")
