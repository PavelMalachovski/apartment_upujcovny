"""Fetch GTAOPass.js and its relative-import closure from unpkg at three@0.185.0.

Writes into tour/lib/three-0.185.0/ at the natural upstream paths.
Reports every bare specifier seen (must all be 'three') and every relative
specifier (must all resolve to a file that ends up on disk).
"""
import os, re, sys, json, posixpath, urllib.request

VER = '0.185.0'
BASE = 'https://unpkg.com/three@%s/' % VER
ROOT = r'C:\Git\AirBNB\tour\lib\three-0.185.0'
ENTRY = 'examples/jsm/postprocessing/GTAOPass.js'

IMPORT_RE = re.compile(
    r"""(?:^|\n)\s*(?:import|export)\b[^;'"]*?from\s*['"]([^'"]+)['"]|"""
    r"""(?:^|\n)\s*import\s*['"]([^'"]+)['"]|"""
    r"""\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)""",
    re.M)


def fetch(rel):
    url = BASE + rel
    with urllib.request.urlopen(url) as r:
        if r.status != 200:
            raise RuntimeError('%s -> HTTP %s' % (url, r.status))
        return r.read().decode('utf-8')


def specifiers(src):
    out = []
    for m in IMPORT_RE.finditer(src):
        out.append(next(g for g in m.groups() if g))
    return out


def main():
    seen = {}          # rel path -> source
    bare = {}          # bare specifier -> [importers]
    edges = {}         # rel -> [resolved rel]
    queue = [ENTRY]
    while queue:
        rel = queue.pop(0)
        if rel in seen:
            continue
        src = fetch(rel)
        seen[rel] = src
        edges[rel] = []
        for spec in specifiers(src):
            if spec.startswith('.'):
                target = posixpath.normpath(posixpath.join(posixpath.dirname(rel), spec))
                edges[rel].append(target)
                if target not in seen:
                    queue.append(target)
            else:
                bare.setdefault(spec, []).append(rel)

    # write
    for rel, src in sorted(seen.items()):
        dest = os.path.join(ROOT, *rel.split('/'))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'w', encoding='utf-8', newline='') as f:
            f.write(src)

    print('=== files fetched (%d) ===' % len(seen))
    for rel in sorted(seen):
        print('  ', rel, len(seen[rel]), 'bytes')
    print('=== bare specifiers ===')
    for spec, importers in sorted(bare.items()):
        print('  ', repr(spec), '<-', sorted(set(importers)))
    print('=== relative edges ===')
    for rel in sorted(edges):
        for t in edges[rel]:
            ok = 'OK' if t in seen else 'MISSING'
            print('  ', rel, '->', t, ok)
    json.dump({'files': sorted(seen), 'bare': {k: sorted(set(v)) for k, v in bare.items()},
               'edges': edges},
              open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'closure.json'), 'w'),
              indent=2)


if __name__ == '__main__':
    main()
