"""
Fix everywhere: raw snake_case display -> Title Case labels
Pattern used (same as Defects/Test Runs already use, proven safe):
  String(x ?? '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
Only display text changes. Dropdown values (value="in_progress") untouched, so Save still works.
Uses plain string replace only — no <select> regex.

Files:
- src/app/milestones/page.tsx — {x.status}
- src/app/test-plans/page.tsx — {x.status}
- src/app/requirements/page.tsx — {r.type}
- src/app/reports/page.tsx — {status.replace('_',' ')} (only first _)
- src/app/projects/page.tsx — {p.status ?? 'Active'}
- src/app/projects/[id]/page.tsx — {project?.status ?? 'Active'}
- src/app/test-plans/[id]/page.tsx — milestone option {m.status}

Run: python fix_all_status_labels.py
"""
import pathlib, sys
JOBS = [
    ("src/app/milestones/page.tsx",
     ">{x.status}</span>",
     ">{String(x.status ?? '').replaceAll('_', ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())}</span>",
     "Milestones list {x.status}"),
    ("src/app/test-plans/page.tsx",
     ">{x.status}</span>",
     ">{String(x.status ?? '').replaceAll('_', ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())}</span>",
     "Test Plans list {x.status}"),
    ("src/app/requirements/page.tsx",
     ">{r.type}</span>",
     ">{String(r.type ?? '').replaceAll('_', ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())}</span>",
     "Requirements list Type {r.type}"),
    ("src/app/reports/page.tsx",
     "{status.replace('_', ' ')}",
     "{String(status ?? '').replaceAll('_', ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())}",
     "Reports {status.replace}"),
    ("src/app/projects/page.tsx",
     ">{p.status ?? 'Active'}</span>",
     ">{String(p.status ?? 'Active').replaceAll('_', ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())}</span>",
     "Projects list {p.status}"),
    ("src/app/projects/[id]/page.tsx",
     ">{project?.status ?? 'Active'}</span>",
     ">{String(project?.status ?? 'Active').replaceAll('_', ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())}</span>",
     "Projects details {project.status}"),
    ("src/app/test-plans/[id]/page.tsx",
     "{m.version_name ?? m.name} — {m.status}",
     "{m.version_name ?? m.name} — {String(m.status ?? '').replaceAll('_', ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())}",
     "Test Plans details milestone option {m.status}"),
]
def main():
    for path_s, old, new, label in JOBS:
        T = pathlib.Path(path_s)
        if not T.exists():
            print(f"SKIP {label}: not found {path_s}")
            continue
        text = T.read_text(encoding="utf-8")
        if new in text:
            print(f"SKIP {label}: already patched")
            continue
        if old not in text:
            print(f"WARNING {label}: exact pattern not found — skipping, file NOT changed. Paste grep for this file.")
            continue
        bak = T.with_suffix(".tsx.bak_labels")
        if not bak.exists():
            bak.write_text(text, encoding="utf-8")
            print(f"Backup: {bak}")
        text = text.replace(old, new, 1)
        T.write_text(text, encoding="utf-8")
        print(f"OK {label}")
    print("")
    print("Done. Verify: npm run dev -> Milestones should show 'In Progress', not 'In_progress'")
if __name__ == "__main__":
    main()
