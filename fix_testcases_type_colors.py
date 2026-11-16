import pathlib, sys

p = pathlib.Path("src/app/test-cases/page.tsx")
t = p.read_text(encoding="utf-8")

# Priority already fixed (line 103 shows Critical red etc.) — skip it.
# Fix Type badge (line 104): smoke typo px-2py-0.5 + missing usability / system / exploratory (no color → blank)

start_marker = "<span className={(c.test_type"
start = t.find(start_marker)
if start == -1:
    print("NOT FOUND: test-cases Type span")
    sys.exit(1)

end_marker = ": ''}>"
end_pos = t.find(end_marker, start)
if end_pos == -1:
    print("NOT FOUND: test-cases Type span end")
    sys.exit(1)
end = end_pos + len(end_marker)

old_span = t[start:end]
print("FOUND Type span, length:", len(old_span))
if "usability" in old_span and "exploratory" in old_span:
    print("SKIP: test-cases Type — usability/system/exploratory already present")
    sys.exit(0)

new_span = """<span className={(c.test_type ?? c.type ?? '')==='functional' ? 'inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='regression' ? 'inline-block px-2 py-0.5 rounded bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='smoke' ? 'inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='usability' ? 'inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='security' ? 'inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='performance' ? 'inline-block px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='integration' ? 'inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='system' ? 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='exploratory' ? 'inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='ui' ? 'inline-block px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='api' ? 'inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='automation' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='e2e' ? 'inline-block px-2 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='uat' ? 'inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 capitalize font-normal' : ''}>"""

t2 = t[:start] + new_span + t[end:]
p.write_text(t2, encoding="utf-8")
print("OK: test-cases Type — fixed Smoke typo, added Usability violet, System slate, Exploratory emerald")
print("Priority already fixed — not touched.")
