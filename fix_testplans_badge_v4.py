import pathlib, sys

path = pathlib.Path("src/app/test-plans/page.tsx")
t = path.read_text()

# Find the status badge <span> by its start, not by exact full string
start_marker = "<span className={x.status==="
start = t.find(start_marker)
if start == -1:
    # fallback: any status span
    start = t.find("<span className={x.status")
    if start == -1:
        print("NOT FOUND: test-plans status span start")
        sys.exit(1)

# The span ends at the first " : ''}>" after start (the empty fallback)
end_marker = ": ''}>"
end_pos = t.find(end_marker, start)
if end_pos == -1:
    print("NOT FOUND: test-plans span end marker")
    sys.exit(1)
end = end_pos + len(end_marker)

old_span = t[start:end]
print("FOUND old span, length:", len(old_span))
print("OLD:", old_span[:200], "...")

new_span = """<span className={x.status==='active' ? 'inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal' : x.status==='draft' ? 'inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal' : x.status==='planning' ? 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal' : x.status==='in_progress' ? 'inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 capitalize font-normal' : x.status==='completed' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : x.status==='archived' ? 'inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 capitalize font-normal' : x.status==='cancelled' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal' : ''}>"""

t2 = t[:start] + new_span + t[end:]
path.write_text(t2)
print("OK: test-plans badge colors fixed — Planning slate, In Progress teal, Draft amber, Archived violet")
print("Verify with: grep -o \"in_progress[^>]*\" src/app/test-plans/page.tsx")
