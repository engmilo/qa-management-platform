"""
Fix: Traceability test cases order — src/app/api/traceability/route.ts ONLY
- Sort linkedCases by case_key numerically (TC-001 -> TC-028) before building testCaseList
- So Save (which deletes + re-inserts join rows) never changes display order
- Uses plain string replace, no regex

Run: python fix_traceability_sort.py
"""
import pathlib, sys
T = pathlib.Path("src/app/api/traceability/route.ts")
def main():
    if not T.exists():
        print(f"ERROR: Not found {T}")
        sys.exit(1)
    text = T.read_text(encoding="utf-8")
    orig = text
    old = """    const linkedCases = linkedCaseIds
      .map((id) => caseById.get(id))
      .filter(Boolean);"""
    new = """    const linkedCases = linkedCaseIds
      .map((id) => caseById.get(id))
      .filter(Boolean)
      .sort((a: any, b: any) => String(a.case_key ?? a.key ?? a.code ?? a.id).localeCompare(String(b.case_key ?? b.key ?? b.code ?? b.id), undefined, { numeric: true, sensitivity: 'base' }));"""
    if "localeCompare" in text and "case_key" in text and "linkedCases" in text:
        print("Already patched: linkedCases already sorted — nothing to do.")
        return
    if old not in text:
        print("ERROR: Exact linkedCases block not found. File may differ. NOT written.")
        print("Look for: const linkedCases = linkedCaseIds ... .filter(Boolean);")
        sys.exit(1)
    bak = T.with_suffix(".ts.bak_trace")
    if not bak.exists():
        bak.write_text(orig, encoding="utf-8")
        print(f"Backup: {bak}")
    text = text.replace(old, new, 1)
    T.write_text(text, encoding="utf-8")
    print("OK: Traceability API now sorts linkedCases by case_key (numeric) — TC-001 first")
if __name__ == "__main__":
    main()
