"""
Fix: statusBadge colors in src/app/test-cases/page.tsx
- Add in_review (violet) + archived (slate)
- Keep legacy review -> in_review color, deprecated -> archived color
- Uses plain string replace, no regex on <select>

Run: python fix_testcase_badge.py
"""
import pathlib, sys
T = pathlib.Path("src/app/test-cases/page.tsx")
def main():
    if not T.exists():
        print(f"ERROR: Not found {T}")
        sys.exit(1)
    text = T.read_text(encoding="utf-8")
    orig = text
    old = "    if (v === 'deprecated') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';"
    new = "    if (v === 'in_review' || v === 'review') return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300';\n    if (v === 'archived' || v === 'deprecated') return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';"
    if "in_review" in text and "bg-violet" in text:
        print("Already patched: in_review violet already present — nothing to do.")
        return
    if old not in text:
        print("ERROR: Exact deprecated line not found. File may differ. NOT written.")
        print("Paste lines 34-42 again if this fails.")
        sys.exit(1)
    bak = T.with_suffix(".tsx.bak_badge")
    if not bak.exists():
        bak.write_text(orig, encoding="utf-8")
        print(f"Backup: {bak}")
    text = text.replace(old, new, 1)
    T.write_text(text, encoding="utf-8")
    print("OK: Badge -> In Review = violet, Archived = slate, legacy review/deprecated mapped")
if __name__ == "__main__":
    main()
