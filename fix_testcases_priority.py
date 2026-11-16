import pathlib, sys

p = pathlib.Path("src/app/test-cases/page.tsx")
t = p.read_text(encoding="utf-8")

# Priority: line 103 — always amber. Replace opening <span> only, display value untouched.
if "String(c.priority" in t and "toLowerCase()==='critical'" in t:
    print("SKIP: test-cases priority — already fixed")
else:
    idx = t.find("{c.priority}</span>")
    if idx == -1:
        print("NOT FOUND: test-cases priority span")
        sys.exit(1)
    span_start = t.rfind("<span", 0, idx)
    if span_start == -1:
        print("NOT FOUND: test-cases priority <span")
        sys.exit(1)
    new_open = """<span className={String(c.priority ?? '').toLowerCase()==='critical' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal' : String(c.priority ?? '').toLowerCase()==='high' ? 'inline-block px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 capitalize font-normal' : String(c.priority ?? '').toLowerCase()==='medium' ? 'inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal' : String(c.priority ?? '').toLowerCase()==='low' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal'}>"""
    t = t[:span_start] + new_open + t[idx:]
    print("OK: test-cases priority — Critical red, High orange, Medium amber, Low green")

p.write_text(t, encoding="utf-8")
print("Done — labels / DB values untouched, display only.")
