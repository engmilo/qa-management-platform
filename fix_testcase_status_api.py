"""
Fix 2/3: Test Case Status API — src/app/api/test-cases/[id]/route.ts
- Allow unified 5: draft, in_review, ready, approved, archived
- Map legacy review -> in_review, deprecated -> archived (no data loss)
- Fix silent-drop: old code deleted patch.status on ANY error containing
  'comment' or 'status' and returned ok:true, so Save looked OK but status
  never changed. Now: only 'comment' errors drop comment; status errors
  are returned as 400 so you actually see them.

Run: python fix_testcase_status_api.py
"""
import re, pathlib, sys
TARGET = pathlib.Path("src/app/api/test-cases/[id]/route.ts")
def main():
    if not TARGET.exists():
        print(f"ERROR: Not found: {TARGET} — run from project root")
        sys.exit(1)
    text = TARGET.read_text(encoding="utf-8")
    orig = text
    # Backup
    bak = TARGET.with_suffix(".ts.bak")
    if not bak.exists():
        bak.write_text(orig, encoding="utf-8")
        print(f"Backup: {bak}")
    else:
        print(f"Backup exists, not overwritten: {bak}")

    # --- 1. Replace status allow-list with mapping ---
    # Old: if (typeof body.status === 'string' && ['draft', 'ready', 'approved', 'review', 'deprecated'].includes(body.status)) patch.status = body.status;
    pat_status = re.compile(r"if\s*\(typeof body\.status === 'string' && \[[^\]]+\]\.includes\(body\.status\)\)\s*patch\.status = body\.status;")
    m = pat_status.search(text)
    if not m:
        if "in_review" in text and "archived" in text and "review" not in text.split("patch.status")[0][-500:]:
            print("Already patched? status allow-list not found in old form. Aborting to avoid double-patch.")
            print("Check file manually.")
            sys.exit(1)
        print("ERROR: Could not find old status allow-list line. Aborting, file NOT written.")
        print("Look for line with: typeof body.status ... includes(body.status)")
        sys.exit(1)
    new_status = """if (typeof body.status === 'string') {
    const _raw = body.status;
    const _mapped = _raw === 'review' ? 'in_review' : _raw === 'deprecated' ? 'archived' : _raw;
    if (['draft', 'in_review', 'ready', 'approved', 'archived'].includes(_mapped)) patch.status = _mapped;
  }"""
    text = pat_status.sub(new_status, text, count=1)
    print("Patched: status allow-list -> draft, in_review, ready, approved, archived + legacy mapping")

    # --- 2. Fix silent-drop retry ---
    # Old: if (msg.includes('comment') || msg.includes('status')) { delete patch.comment; delete patch.status;
    pat_retry = re.compile(r"if\s*\(msg\.includes\('comment'\)\s*\|\|\s*msg\.includes\('status'\)\)\s*\{\s*delete patch\.comment;\s*delete patch\.status;")
    m2 = pat_retry.search(text)
    if not m2:
        print("WARNING: Silent-drop retry pattern not found — maybe already fixed. Skipping retry fix.")
    else:
        new_retry = "if (msg.includes('comment')) {\n        delete patch.comment;"
        text = pat_retry.sub(new_retry, text, count=1)
        print("Patched: retry now drops ONLY comment, never status (status errors now return 400)")

    # --- Verify ---
    if "in_review" not in text or "archived" not in text:
        print("ERROR: Verify failed — in_review/archived not in file. NOT written.")
        sys.exit(1)
    if "delete patch.status" in text:
        print("ERROR: 'delete patch.status' still present — silent-drop not fixed. NOT written.")
        sys.exit(1)
    if "['draft', 'in_review', 'ready', 'approved', 'archived']" not in text:
        print("ERROR: Unified allow-list not found after patch. NOT written.")
        sys.exit(1)
    TARGET.write_text(text, encoding="utf-8")
    print("OK: Patched", TARGET)
    print("")
    print("Also check POST route (create) — if it has its own status list, it needs the same fix:")
    print("  grep -n \"body.status\\|status.*includes\" \"src/app/api/test-cases/route.ts\"")
if __name__ == "__main__":
    main()
