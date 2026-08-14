"""Hand-made lightmap pack for the guard proof, written BEFORE the baker
exists. Solid mid-grey images so an applied pack is unmistakable, and a
manifest whose hash is whatever the caller passes -- deliberately wrong on
the first run, correct on the second.

    python make_fixture.py wrong      # 64 zeros: the guard must reject
    python make_fixture.py correct    # the real hash: the guard must accept

*** THIS OVERWRITES tour/lightmaps/serenity/ *** -- the SHIPPED pack lives
there, and these fixtures are flat mid-grey, not light. Restore it when you
are done, or the flat's floors and ceilings ship unlit:

    git checkout -- tour/lightmaps/serenity

Reads dump.json (written by dump.mjs) for the surface list. It has no
dependency on tools/bake_lightmaps.mjs at all, which is what let the guard be
proved before the baker existed."""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
DUMP = os.path.join(HERE, 'dump.json')
OUT = os.path.join(ROOT, 'tour', 'lightmaps', 'serenity')

if len(sys.argv) < 2 or sys.argv[1] not in ('wrong', 'correct'):
    raise SystemExit(__doc__)
want = sys.argv[1]           # 'wrong' or 'correct'
d = json.load(open(DUMP, encoding='utf-8'))
real = d['hash']
h = ('0' * 64) if want == 'wrong' else real

os.makedirs(OUT, exist_ok=True)
entries = []
for s in d['surfaces']:
    name = 's%03d.webp' % s['i']
    im = Image.new('RGB', tuple(s['px']), (160, 150, 140))
    im.save(os.path.join(OUT, name), 'WEBP', lossless=True)
    entries.append({'i': s['i'], 'file': name, 'w': s['w'], 'h': s['h'],
                    'res': s['res'], 'lvl': s['lvl'], 'outdoor': s['outdoor'],
                    'pos': s['pos'], 'px': s['px']})

man = {'apt': 'serenity', 'hash': h, 'hashAlgo': 'sha256',
       'note': 'hand-made fixture for the staleness-guard proof, not a real bake',
       'baker': {'fixture': True},
       'surfaces': entries}
with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(man, f, indent=2)
print('wrote', OUT, 'hash=', h[:16], '(real', real[:16] + ')')
