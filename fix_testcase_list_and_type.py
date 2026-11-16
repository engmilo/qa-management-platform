"""
Fix: List status label + filter + Type dropdown space
- List: src/app/test-cases/page.tsx
  * Filter: Deprecated -> In Review + Archived (unified 5)
  * Pill: {c.status} -> {formatTestCaseStatus(c.status)} so In_review -> In Review
  * Adds helper formatTestCaseStatus after last import (line-based, no <select> regex)
- Details Type: src/app/test-cases/[id]/page.tsx
  * Native <select> cannot be forced down via HTML/CSS (browser decides).
  * Minimal safe workaround: onFocus scrolls Type into center of viewport,
    so there is space below for the 12-option list to open down.
  * Uses plain string replace, NOT [^>]* regex (that broke v1).

Run: python fix_testcase_list_and_type.py
"""
import pathlib, sys
def patch_list():
    T = pathlib.Path("src/app/test-cases/page.tsx")
    if not T.exists():
        print(f"ERROR List: Not found {T}")
        return False
    text = T.read_text(encoding="utf-8")
    orig = text
    bak = T.with_suffix(".tsx.bak_list")
    if not bak.exists():
        bak.write_text(orig, encoding="utf-8")
        print(f"List backup: {bak}")
    # 1. Filter options — exact string from grep line 84
    old_filter = '<option value="">All Status</option><option value="draft">Draft</option><option value="ready">Ready</option><option value="approved">Approved</option><option value="deprecated">Deprecated</option>'
    new_filter = '<option value="">All Status</option><option value="draft">Draft</option><option value="in_review">In Review</option><option value="ready">Ready</option><option value="approved">Approved</option><option value="archived">Archived</option>'
    if old_filter in text:
        text = text.replace(old_filter, new_filter, 1)
        print("List: Filter -> Draft, In Review, Ready, Approved, Archived")
    else:
        print("WARNING List: Filter exact string not found — maybe already patched or spacing differs. Skipping filter.")
    # 2. Add helper if missing
    if "formatTestCaseStatus" not in text:
        lines = text.splitlines()
        last_imp = -1
        for i, ln in enumerate(lines):
            if ln.strip().startswith("import "):
                last_imp = i
        if last_imp == -1:
            print("ERROR List: No import lines — cannot insert helper. Abort.")
            return False
        helper = "const formatTestCaseStatus = (s?: string | null) => { const m: Record<string, string> = { draft: 'Draft', in_review: 'In Review', ready: 'Ready', approved: 'Approved', archived: 'Archived' }; return m[s ?? ''] ?? (s ?? ''); };"
        lines.insert(last_imp + 1, helper)
        text = "\n".join(lines)
        print("List: Added formatTestCaseStatus helper")
    # 3. Pill display — exact string from grep line 106: >{c.status}</span>
    if ">{c.status}</span>" in text:
        text = text.replace(">{c.status}</span>", ">{formatTestCaseStatus(c.status)}</span>", 1)
        print("List: Pill {c.status} -> {formatTestCaseStatus(c.status)}")
    elif "formatTestCaseStatus(c.status)" in text:
        print("List: Pill already uses formatTestCaseStatus — skipping")
    else:
        print("WARNING List: Pill pattern >{c.status}</span> not found — skipping pill. Paste lines 100-110 for exact pattern.")
    T.write_text(text, encoding="utf-8")
    print("OK List patched")
    return True

def patch_type():
    T = pathlib.Path("src/app/test-cases/[id]/page.tsx")
    if not T.exists():
        print(f"ERROR Details: Not found {T}")
        return False
    text = T.read_text(encoding="utf-8")
    orig = text
    if "scrollIntoView" in text and "form.type" in text:
        print("Details Type: Already has scrollIntoView — skipping")
        return True
    old = "<select value={form.type} onChange"
    new = "<select value={form.type} onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'center' })} onChange"
    if old not in text:
        print("WARNING Details Type: <select value={form.type} onChange not found — skipping Type.")
        return True
    bak = T.with_suffix(".tsx.bak_type")
    if not bak.exists():
        bak.write_text(orig, encoding="utf-8")
        print(f"Details backup: {bak}")
    text = text.replace(old, new, 1)
    T.write_text(text, encoding="utf-8")
    print("OK Details Type: Added onFocus scrollIntoView(center) so list has space below to open down")
    return True

def main():
    ok1 = patch_list()
    ok2 = patch_type()
    if ok1 and ok2:
        print("")
        print("Verify: npm run dev -> List TC-007 should show 'In Review', Type dropdown should open down when focused")
    else:
        sys.exit(1)
if __name__ == "__main__":
    main()
