"""
Fix 3/3 v2 — Details ONLY, corrected.
Previous v1 regex broke the file because [^>]* stopped at '=>' in onChange.
This v2 finds the opening tag end by looking for the '>' BEFORE the first <option>,
so '=>' inside onChange is ignored.

Target: src/app/test-cases/[id]/page.tsx ONLY (does NOT touch List yet)

Run: python fix_testcase_status_ui_v2.py
"""
import pathlib, sys
TARGET = pathlib.Path("src/app/test-cases/[id]/page.tsx")
def main():
    if not TARGET.exists():
        print(f"ERROR: Not found {TARGET}")
        sys.exit(1)
    text = TARGET.read_text(encoding="utf-8")
    # If already fixed (no duplicate Review in Status select), exit
    # Quick check: if file has syntax error from v1, it will have a truncated select
    # Detect v1 damage: look for 'value={form.status} onChange={(e) =>' without closing '>'
    # If damaged, abort and tell user to restore from .bak2 first
    if "value={form.status}" in text and "</select>" not in text.split("value={form.status}")[1][:2000]:
        print("File looks damaged from v1 (no </select> after form.status). Restore first:")
        print('  cp "src/app/test-cases/[id]/page.tsx.bak2" "src/app/test-cases/[id]/page.tsx"')
        sys.exit(1)
    start = text.find("<select value={form.status}")
    if start == -1:
        print("ERROR: <select value={form.status}> not found. File may already be damaged or different. Abort.")
        sys.exit(1)
    end_select = text.find("</select>", start)
    if end_select == -1:
        print("ERROR: No </select> after Status select. Abort — restore from .bak2")
        sys.exit(1)
    first_option = text.find("<option", start, end_select)
    if first_option == -1:
        print("ERROR: No <option> inside Status select. Abort.")
        sys.exit(1)
    opening_end = text.rfind(">", start, first_option)
    if opening_end == -1:
        print("ERROR: Could not find opening tag end. Abort.")
        sys.exit(1)
    opening = text[start:opening_end+1]
    print(f"Opening tag OK ({len(opening)} chars): {opening[:80]}...")
    # Backup (only if v2 backup not exists)
    bak = TARGET.with_suffix(".tsx.bak_v2")
    if not bak.exists():
        bak.write_text(text, encoding="utf-8")
        print(f"Backup: {bak}")
    new_options = '\n<option value="draft">Draft</option>\n<option value="in_review">In Review</option>\n<option value="ready">Ready</option>\n<option value="approved">Approved</option>\n<option value="archived">Archived</option>\n'
    new_text = text[:start] + opening + new_options + text[end_select:]
    # Verify: new Status select has no duplicate Review, has all 5
    seg_start = new_text.find("<select value={form.status}")
    seg_end = new_text.find("</select>", seg_start)
    seg = new_text[seg_start:seg_end]
    if 'value="review"' in seg:
        print("ERROR: duplicate Review still in Status select after patch. NOT written.")
        sys.exit(1)
    for v in ['value="draft"', 'value="in_review"', 'value="ready"', 'value="approved"', 'value="archived"']:
        if v not in seg:
            print(f"ERROR: missing {v} in Status select. NOT written.")
            sys.exit(1)
    TARGET.write_text(new_text, encoding="utf-8")
    print("OK: Details Status dropdown -> Draft, In Review, Ready, Approved, Archived (no duplicate)")
if __name__ == "__main__":
    main()
