"""Supplementary blind inspection aid for the task 6 A/B.

Still blind: it re-cuts the SAME composites pair.py wrote and never reads
reveal/mapping.json.

For each pair it takes one patch of a LIGHTMAPPED surface -- a floor or a
ceiling, never a wall, because walls carry no lightmap and their pixels
cannot move at all -- magnifies it 3-4x nearest-neighbour and butts the A
patch straight against the B patch. Two flat samples meeting on a hard
edge is the most sensitive readout available for a small uniform
brightness difference. Left of the join = A, right = B.

The `b` entries are second, deliberately more shadowed regions added
after the first pass read as near-seamless: the ceiling right at the wall
junction and the floor near an obstruction are where the 0.65 m gather
closes most and the fill is largest.

An earlier mirror-seam aid (A strip over the same strip from B flipped
vertically) was built and discarded as unreadable against this geometry;
it is not preserved because nothing was concluded from it.

Run from this directory, after pair.py: python patches.py
"""
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PAIRS = os.path.join(HERE, 'pairs')
OUT = os.path.join(HERE, 'patch')
os.makedirs(OUT, exist_ok=True)

W, GAP = 900, 10

# key: (pair, x0, y0, x1, y1, zoom, what)
REGIONS = {
    '1':  (1, 150,  25, 330,  95, 3, 'ceiling, entrance'),
    '2':  (2, 120, 400, 300, 470, 3, 'floor, entrance looking down'),
    '3':  (3, 360,  10, 540,  80, 3, 'ceiling, bathroom'),
    '4':  (4, 505, 480, 625, 550, 3, 'floor, bedroom doorway'),
    '5':  (5, 240,  15, 420,  75, 3, 'ceiling, living room'),
    '6':  (6, 250,  10, 430,  70, 3, 'ceiling, kitchen and hall'),
    '3b': (3, 380,  58, 560, 108, 4, 'ceiling, bathroom, at the wall junction'),
    '6b': (6, 250, 470, 450, 550, 4, 'floor, kitchen and hall'),
    '1b': (1, 560, 430, 760, 540, 4, 'floor, entrance, right of frame'),
}

for key, (i, x0, y0, x1, y1, z, what) in REGIONS.items():
    im = Image.open(os.path.join(PAIRS, 'pair%d.png' % i)).convert('RGB')
    a = im.crop((x0, y0, x1, y1))
    b = im.crop((W + GAP + x0, y0, W + GAP + x1, y1))
    w, h = a.size
    a = a.resize((w * z, h * z), Image.NEAREST)
    b = b.resize((w * z, h * z), Image.NEAREST)
    canvas = Image.new('RGB', (w * z * 2, h * z))
    canvas.paste(a, (0, 0))
    canvas.paste(b, (w * z, 0))
    canvas.save(os.path.join(OUT, 'patch%s.png' % key))
    print('patch%-3s %-40s A | B, %dx%d each, %dx' % (key + '.png', what, w, h, z))
