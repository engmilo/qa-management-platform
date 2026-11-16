"""
Fix 3/3: Test Case Status UI
- Details: src/app/test-cases/[id]/page.tsx — remove duplicate Review, keep unified 5:
  Draft, In Review, Ready, Approved, Archived (in lifecycle order)
- List: src/app/test-cases/page.tsx — show "In Review" not raw "In_review"
  via a label map. Safe: only replaces {x.status} display, not filter logic.

Run: python fix_testcase_status_ui.py
"""
import re, pathlib, sys

def patch_details():
    TARGET = pathlib.Path("src/app/test-cases/[id]/page.tsx")
    if not TARGET.exists():
        print(f"ERROR Details: Not found {TARGET}")
        return False
    text = TARGET.read_text(encoding="utf-8")
    orig = text
    bak = TARGET.with_suffix(".tsx.bak2")
    if not bak.exists():
        bak.write_text(orig, encoding="utf-8")
        print(f"Details backup: {bak}")
    # Find the case Status <select value={form.status}>...</select>
    pat = re.compile(r"(<select value=\{form\.status\}[^>]*>).*?</select>", re.DOTALL)
    m = pat.search(text)
    if not m:
        print("ERROR Details: Could not find <select value={form.status}> — aborting Details, file NOT written")
        return False
    opening = m.group(1)
    new_options = '\n<option value="draft">Draft</option><option value="in_review">In Review</option><option value="ready">Ready</option><option value="approved">Approved</option><option value="archived">Archived</option>'
    # Keep opening tag as-is, replace inner options
    new_block = opening + new_options + "</select>"
    text = pat.sub(lambda _: new_block, text, count=1)
    if 'value="review"' in text and 'value={form.status}' in text:
        # Check if the Review option still exists inside the Status select (not elsewhere)
        # Re-extract select to verify
        m2 = pat.search(text)
        if m2 and 'value="review"' in m2.group(0):
            print("ERROR Details: duplicate Review option still present in Status select. NOT written.")
            return False
    if 'value="in_review"' not in text or 'value="archived"' not in text:
        print("ERROR Details: unified options missing after patch. NOT written.")
        return False
    TARGET.write_text(text, encoding="utf-8")
    print("OK Details: Status dropdown -> Draft, In Review, Ready, Approved, Archived (no duplicate Review)")
    return True

def patch_list():
    TARGET = pathlib.Path("src/app/test-cases/page.tsx")
    if not TARGET.exists():
        print(f"WARNING List: Not found {TARGET} — skipping List, Details still patched")
        return True
    text = TARGET.read_text(encoding="utf-8")
    orig = text
    # If already has a label map, skip
    if "formatTestCaseStatus" in text or "in_review': 'In Review'" in text or 'in_review": "In Review"' in text:
        print("List: Already has In Review label mapping — skipping")
        return True
    # Add helper near top (after first 'useState' or 'export default' line) — insert after imports
    # Find last import line
    lines = text.splitlines()
    last_import_idx = -1
    for i, ln in enumerate(lines):
        if ln.strip().startswith("import "):
            last_import_idx = i
    if last_import_idx == -1:
        print("WARNING List: No import lines found — cannot insert helper safely. Skipping List.")
        return True
    helper = "\nconst formatTestCaseStatus = (s?: string | null) => { const m: Record<string, string> = { draft: 'Draft', in_review: 'In Review', ready: 'Ready', approved: 'Approved', archived: 'Archived' }; return m[s ?? ''] ?? (s ?? ''); };\n"
    lines.insert(last_import_idx + 1, helper)
    text = "\n".join(lines)
    # Replace display usages {x.status} -> {formatTestCaseStatus(x.status)}
    # Only JSX display: {var.status} where var is a short identifier, not in comparisons
    pat_disp = re.compile(r"\{(\w+)\.status\}")
    matches = pat_disp.findall(text)
    print(f"List: Found {{x.status}} display usages: {len(matches)} -> {matches[:5]}")
    if not matches:
        print("WARNING List: No {x.status} display found — List file may use a different variable. Skipping List replace, helper still added (harmless).")
        # Remove helper again to avoid unused var? Keep it, TS may warn but not break. Remove to be clean:
        text = orig
        print("List: Reverted (no display pattern found) — tell me the grep for list status display")
        return True
    # Replace all, but avoid double-wrapping if already formatted
    text = pat_disp.sub(r"{formatTestCaseStatus(\1.status)}", text)
    bak = TARGET.with_suffix(".tsx.bak2")
    if not bak.exists():
        bak.write_text(orig, encoding="utf-8")
        print(f"List backup: {bak}")
    TARGET.write_text(text, encoding="utf-8")
    print(f"OK List: {len(matches)} status displays now use formatTestCaseStatus (In_review -> In Review)")
    return True

def main():
    ok1 = patch_details()
    ok2 = patch_list()
    if ok1:
        print("")
        print("Next: npm run dev, verify Details dropdown has no duplicate + List shows 'In Review'")
    else:
        sys.exit(1)
if __name__ == "__main__":
    main()
