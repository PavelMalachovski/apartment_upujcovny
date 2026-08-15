"""Assert that spawnlum_exp.mjs's measurement body is task 5's spawnlum.mjs
RUN(), unchanged apart from the exposure override.

The isolation number in task 7's report only means anything if the pixels are
gathered exactly the way the before/after pair gathered them.  Rather than
assert that in prose, diff the two RUN bodies here: the only permitted
differences are the three lines marked `// ADDED` / `// CHANGED` in
spawnlum_exp.mjs and the function's own signature line.

    python check_run_identical.py        # prints OK, or the offending diff
"""
import difflib
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
HARNESSES = os.path.dirname(HERE)
A = os.path.join(HARNESSES, '2026-08-13-b3-task5', 'spawnlum.mjs')
B = os.path.join(HERE, 'spawnlum_exp.mjs')


def run_body(path):
    src = open(path, encoding='utf-8').read()
    start = src.index('function RUN(')
    end = src.index('\nconst browser = await launch();', start)
    lines = src[start:end].rstrip().splitlines()
    return [ln for ln in lines if not re.search(r'//\s*(ADDED|CHANGED)\s*$', ln)]


a, b = run_body(A), run_body(B)
# the signature differs by the injected argument, by construction
a[0] = b[0] = '<signature>'
if a == b:
    print('OK: %d lines of RUN() identical between\n  %s\n  %s'
          % (len(a), os.path.relpath(A, HARNESSES), os.path.relpath(B, HARNESSES)))
    sys.exit(0)
print('MISMATCH:')
for line in difflib.unified_diff(a, b, 'task5/spawnlum.mjs', 'task7/spawnlum_exp.mjs', lineterm=''):
    print(line)
sys.exit(1)
