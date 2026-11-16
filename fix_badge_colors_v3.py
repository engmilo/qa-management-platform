import pathlib, sys

def replace_or_skip(path, olds, new, label, already_marker):
    p = pathlib.Path(path)
    t = p.read_text()
    # Already fixed to the target?
    if new in t:
        print(f"SKIP: {label} — already fixed")
        return
    for old in olds:
        if old in t:
            p.write_text(t.replace(old, new))
            print(f"OK: {label}")
            return
    if already_marker and already_marker in t:
        print(f"SKIP: {label} — already fixed (variant)")
        return
    print(f"NOT FOUND: {label} in {path}")
    sys.exit(1)

# 0) Milestones — already fixed by v1 (Planning amber, In Progress blue). Skip.
# Verify it is fixed, don't re-patch.
mt = pathlib.Path("src/app/milestones/page.tsx").read_text()
if "x.status==='planned'" in mt and "bg-amber-100" in mt and "bg-blue-100" in mt:
    print("SKIP: milestones badge colors — already fixed")
else:
    print("WARNING: milestones does not look fixed, check manually")
    sys.exit(1)

# 1) Test Plans — handle BOTH states:
#  - original (never patched)
#  - v1-patched (Draft amber / Archived violet, but no Planning / In Progress)
ORIG_TP = """<span className={x.status==='active' ? 'inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal' : x.status==='completed' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : x.status==='draft' ? 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal' : x.status==='archived' ? 'inline-block px-2py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal' : x.status==='cancelled' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal' : ''}>"""
V1_TP = """<span className={x.status==='active' ? 'inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal' : x.status==='completed' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : x.status==='draft' ? 'inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal' : x.status==='archived' ? 'inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 capitalize font-normal' : x.status==='cancelled' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal' : ''}>"""
V2_TP = """<span className={x.status==='active' ? 'inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal' : x.status==='draft' ? 'inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal' : x.status==='planning' ? 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal' : x.status==='in_progress' ? 'inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 capitalize font-normal' : x.status==='completed' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : x.status==='archived' ? 'inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 capitalize font-normal' : x.status==='cancelled' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal' : ''}>"""
replace_or_skip("src/app/test-plans/page.tsx", [ORIG_TP, V1_TP], V2_TP, "test-plans badge colors (adds Planning slate + In Progress teal)", "x.status==='planning'")

# 2) Requirements Status — v1 and v2 identical, skip if already done
REQ_STATUS_OLD = """<span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal">{r.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>"""
REQ_STATUS_NEW = """<span className={r.status==='draft' ? 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal' : r.status==='under_review' ? 'inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 capitalize font-normal' : r.status==='in_review' ? 'inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal' : r.status==='approved' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : r.status==='implemented' ? 'inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 capitalize font-normal' : r.status==='verified' ? 'inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 capitalize font-normal' : r.status==='rejected' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal' : 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal'}>{r.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>"""
replace_or_skip("src/app/requirements/page.tsx", [REQ_STATUS_OLD], REQ_STATUS_NEW, "requirements status badge colors", "r.status==='draft'")

# 3) Requirements Priority — v1 and v2 identical, skip if already done
REQ_PRIO_OLD = """<span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal">{r.priority}</span>"""
REQ_PRIO_NEW = """<span className={String(r.priority ?? '').toLowerCase()==='critical' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal' : String(r.priority ?? '').toLowerCase()==='high' ? 'inline-block px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 capitalize font-normal' : String(r.priority ?? '').toLowerCase()==='medium' ? 'inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal' : String(r.priority ?? '').toLowerCase()==='low' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal'}>{r.priority}</span>"""
replace_or_skip("src/app/requirements/page.tsx", [REQ_PRIO_OLD], REQ_PRIO_NEW, "requirements priority badge colors", "String(r.priority")

# 4) Projects — v1 and v2 identical, skip if already done
PROJ_OLD = """<span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal text-xs">{String(p.status ?? 'Active').replaceAll('_', ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())}</span>"""
PROJ_NEW = """<span className={String(p.status ?? 'Active').toLowerCase()==='active' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal text-xs' : String(p.status ?? '').toLowerCase()==='completed' ? 'inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal text-xs' : String(p.status ?? '').toLowerCase()==='on_hold' ? 'inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal text-xs' : String(p.status ?? '').toLowerCase()==='archived' ? 'inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 capitalize font-normal text-xs' : String(p.status ?? '').toLowerCase()==='cancelled' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal text-xs' : String(p.status ?? '').toLowerCase()==='planning' ? 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal text-xs' : 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal text-xs'}>{String(p.status ?? 'Active').replaceAll('_', ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())}</span>"""
replace_or_skip("src/app/projects/page.tsx", [PROJ_OLD], PROJ_NEW, "projects badge colors", "String(p.status ?? 'Active').toLowerCase()")

print("Done — Milestones already fixed, Test Plans now has Planning + In Progress, others fixed/skipped if already done.")
