import pathlib, re, sys
# Usage:
#   python remove-automation.py
# Run from repo root: C:\Users\engmi\.claude\qa-management-platform
# This ONLY hides the AUTOMATION & TOOLS group in the sidebar.
# It does NOT delete pages, logic, or any other group.
# To fully delete pages too, also delete the 4 folders (see bottom).

ROOT = pathlib.Path(__file__).parent
p = ROOT / "src/components/dashboard/sidebar.tsx"
t = p.read_text(encoding="utf-8")
orig = t

# Try common patterns - sidebar groups are usually an array like:
#   { title: "AUTOMATION & TOOLS", items: [...] },
#   { label: "AUTOMATION & TOOLS", ... },
#   "AUTOMATION & TOOLS" with following items
# We comment out that one block only.

# Pattern 1: { title/label/name: "AUTOMATION & TOOLS", ... },  (non-greedy to next },)
pat = re.compile(r"\s*\{[^}]*?(?:title|label|name)\s*:\s*[\"']AUTOMATION[^\"']*[\"'][^}]*?\},?", re.DOTALL | re.IGNORECASE)
if pat.search(t):
    t = pat.sub("\n  // AUTOMATION & TOOLS hidden - removed from sidebar, pages still exist by URL\n", t, count=1)
    print("HID 1 AUTOMATION group via title/label pattern")
else:
    # Pattern 2: just comment the lines containing AUTOMATION and the next 10 lines with its 4 items
    lines = t.splitlines()
    for i, line in enumerate(lines):
        if "AUTOMATION" in line.upper():
            print(f"Found AUTOMATION at line {i+1}: {line.strip()}")
            # Comment that line + following lines until next group header or closing bracket
            # Simplest: comment 1 line + 4 item lines if they look like items
            for j in range(i, min(i+8, len(lines))):
                if not lines[j].strip().startswith("//"):
                    lines[j] = "// " + lines[j]
                # Stop after we have commented 4 items (Functional, Performance, API, Visual)
                if j > i and any(k in lines[j] for k in ["Visual", "visual-testing"]):
                    break
            t = "\n".join(lines) + "\n"
            break

if t != orig:
    p.write_text(t, encoding="utf-8")
    print(f"FIXED {p}")
    print(" - AUTOMATION & TOOLS hidden from sidebar only")
    print(" - Other groups untouched")
    print("Next: npm run dev, refresh localhost, sidebar should NOT show AUTOMATION")
else:
    print("NO CHANGE - AUTOMATION not found in sidebar.tsx. It may already be hidden, or the label is different.")
    print("Run: grep -n AUTOMATION src/components/dashboard/sidebar.tsx  and paste the line.")
