"""Hand-made lightmap pack for the guard proof, written BEFORE the baker
exists. Solid mid-grey images so an applied pack is unmistakable, and a
manifest whose hash is whatever the caller passes -- deliberately wrong on
the first run, correct on the second."""
import json
import os
import sys

from PIL import Image

ROOT = r'C:\Git\AirBNB'
DUMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dump.json')
OUT = os.path.join(ROOT, 'tour', 'lightmaps', 'serenity')

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
