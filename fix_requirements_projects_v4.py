import pathlib, sys

# --- Requirements ---
p = pathlib.Path("src/app/requirements/page.tsx")
t = p.read_text()

# Status: find {r.status.split...} then go back to its <span
if "r.status==='draft'" in t:
    print("SKIP: requirements status — already fixed")
else:
    idx = t.find("{r.status.split")
    if idx == -1:
        print("NOT FOUND: requirements status span")
        sys.exit(1)
    span_start = t.rfind("<span", 0, idx)
    if span_start == -1:
        print("NOT FOUND: requirements status <span")
        sys.exit(1)
    new_open = """<span className={r.status==='draft' ? 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal' : r.status==='under_review' ? 'inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 capitalize font-normal' : r.status==='in_review' ? 'inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal' : r.status==='approved' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : r.status==='implemented' ? 'inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 capitalize font-normal' : r.status==='verified' ? 'inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 capitalize font-normal' : r.status==='rejected' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal' : 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal'}>"""
    # t[span_start:idx] is "<span className=...>" — replace it, keep "{r.status..." intact
    t = t[:span_start] + new_open + t[idx:]
    print("OK: requirements status — Draft slate, Under Review violet, In Review blue, Approved green, Implemented teal, Verified emerald, Rejected red")

# Priority: find {r.priority}</span> then go back to its <span
if "String(r.priority" in t and "toLowerCase()==='critical'" in t:
    print("SKIP: requirements priority — already fixed")
else:
    idx2 = t.find("{r.priority}</span>")
    if idx2 == -1:
        print("NOT FOUND: requirements priority span")
        sys.exit(1)
    span_start2 = t.rfind("<span", 0, idx2)
    if span_start2 == -1:
        print("NOT FOUND: requirements priority <span")
        sys.exit(1)
    new_open2 = """<span className={String(r.priority ?? '').toLowerCase()==='critical' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal' : String(r.priority ?? '').toLowerCase()==='high' ? 'inline-block px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 capitalize font-normal' : String(r.priority ?? '').toLowerCase()==='medium' ? 'inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal' : String(r.priority ?? '').toLowerCase()==='low' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal'}>"""
    t = t[:span_start2] + new_open2 + t[idx2:]
    print("OK: requirements priority — Critical red, High orange, Medium amber, Low green")

p.write_text(t)

# --- Projects ---
p2 = pathlib.Path("src/app/projects/page.tsx")
t2 = p2.read_text()

if "String(p.status ?? 'Active').toLowerCase()==='active'" in t2:
    print("SKIP: projects status — already fixed")
else:
    idx3 = t2.find("{String(p.status")
    if idx3 == -1:
        print("NOT FOUND: projects status span")
        sys.exit(1)
    span_start3 = t2.rfind("<span", 0, idx3)
    if span_start3 == -1:
        print("NOT FOUND: projects status <span")
        sys.exit(1)
    new_open3 = """<span className={String(p.status ?? 'Active').toLowerCase()==='active' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal text-xs' : String(p.status ?? '').toLowerCase()==='completed' ? 'inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal text-xs' : String(p.status ?? '').toLowerCase()==='on_hold' ? 'inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal text-xs' : String(p.status ?? '').toLowerCase()==='archived' ? 'inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 capitalize font-normal text-xs' : String(p.status ?? '').toLowerCase()==='cancelled' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal text-xs' : String(p.status ?? '').toLowerCase()==='planning' ? 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal text-xs' : 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal text-xs'}>"""
    t2 = t2[:span_start3] + new_open3 + t2[idx3:]
    print("OK: projects status — Active green, Completed blue, On Hold amber, Archived violet, Cancelled red, Planning slate")
    p2.write_text(t2)

print("Done — labels / DB values untouched, display only.")
