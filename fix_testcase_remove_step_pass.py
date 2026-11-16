"""
Fix: Option B — Remove step Pass/Fail from Test Case Details ONLY.
Cautious, frontend-only, one file: src/app/test-cases/[id]/page.tsx

WHAT IT DOES:
- Removes ONLY the <select value={step.status}> Pass / Fail dropdown in Details
- Keeps: Title, Project, Priority, Status (Draft/Approved — test_cases.status),
  Type, Category, Preconditions, Description, Steps Action + Expected,
  Add Step, Remove, Save Changes, Linked Requirements, Comment, Delete

WHAT IT DOES NOT DO:
- Does NOT touch backend PATCH (src/app/api/test-cases/[id]/route.ts)
- Does NOT touch Test Runs / test_executions — Pass/Fail still lives there
- Does NOT delete test_case_steps.status data in DB — existing values stay
  in DB but are no longer shown/editable in Details. Save keeps sending
  the internal status (defaults to not_run for new steps) so PATCH keeps working.
- Does NOT touch form.status dropdown (line ~171) — that is the case Status.

Run: python fix_testcase_remove_step_pass.py
"""
import re
import pathlib
import sys

TARGET = pathlib.Path("src/app/test-cases/[id]/page.tsx")

def main():
    if not TARGET.exists():
        print(f"ERROR: Not found: {TARGET}")
        print("Run this from your project root (where src/ lives).")
        sys.exit(1)

    text = TARGET.read_text(encoding="utf-8")
    orig = text

    # --- Safety checks before touching anything ---
    if "value={form.status}" not in text:
        print("ERROR: Could not find case Status dropdown value={form.status}. Aborting — file looks different.")
        sys.exit(1)
    if "value={step.status}" not in text:
        print("Already patched: no step.status dropdown found. Nothing to do.")
        print("Verify: form.status dropdown still exists =", "value={form.status}" in text)
        return
    if "Steps (structured" not in text and "steps.map" not in text:
        print("WARNING: Could not find steps section markers, but continuing with targeted select removal.")

    # Backup
    backup = TARGET.with_suffix(".tsx.bak")
    if not backup.exists():
        backup.write_text(orig, encoding="utf-8")
        print(f"Backup created: {backup}")
    else:
        print(f"Backup already exists: {backup} (not overwritten)")

    # --- Remove ONLY the step status <select>...</select> ---
    # This pattern matches ONLY value={step.status}, NOT value={form.status}
    pattern = re.compile(r"\s*<select value=\{step\.status\}.*?</select>", re.DOTALL)
    matches = pattern.findall(text)
    print(f"Found step.status <select> blocks: {len(matches)}")
    if len(matches) != 1:
        print(f"ERROR: Expected exactly 1 step.status select, found {len(matches)}. Aborting — file structure differs.")
        sys.exit(1)

    text = pattern.sub("", text, count=1)

    # --- Verify after ---
    if "value={step.status}" in text:
        print("ERROR: step.status select still present after patch. Aborting, file NOT written.")
        sys.exit(1)
    if "value={form.status}" not in text:
        print("ERROR: Case Status dropdown was accidentally removed! Aborting, file NOT written.")
        sys.exit(1)
    # Core functionality must still exist
    for must in ["addStep", "updateStep", "Save Changes", "linkedRequirementIds", "steps.map", "Remove"]:
        if must not in text:
            print(f"ERROR: Required token missing after patch: {must}. Aborting, file NOT written.")
            sys.exit(1)
    # Steps state / addStep must still default to not_run so PATCH keeps working
    if 'status: "not_run"' not in text and "status: 'not_run'" not in text:
        print("WARNING: Could not find status: not_run default. Save will still work (PATCH defaults to not_run), but check addStep.")

    TARGET.write_text(text, encoding="utf-8")
    print("OK: Patched", TARGET)
    print("Removed: step Pass/Fail dropdown (Not Run / Pass / Fail) from Details steps.")
    print("Kept:   case Status dropdown (Draft/Approved/...), Action, Expected, Add/Remove, Save, Linked Requirements.")
    print("")
    print("Next: verify on localhost — see instructions below.")

if __name__ == "__main__":
    main()
