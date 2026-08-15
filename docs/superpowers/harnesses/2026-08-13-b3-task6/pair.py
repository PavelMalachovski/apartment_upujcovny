"""Task 6 blind A/B compositor.

Takes the six pack-on and six pack-off frames from capture.mjs and writes
one side-by-side composite per pose. For each pose it flips an UNSEEDED
random.SystemRandom coin for which side gets the pack. Left half = A,
right half = B.

The mapping goes to reveal/mapping.json. Nothing about the assignment is
printed, and the caller must not open that file until the calls are
written down -- a blind test you can see through launders a guess as
evidence.

Run from this directory: python pair.py
"""
import json
import os
import random

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(HERE, 'frames')
REVEAL = os.path.join(HERE, 'reveal')
PAIRS = os.path.join(HERE, 'pairs')
os.makedirs(REVEAL, exist_ok=True)
os.makedirs(PAIRS, exist_ok=True)

NAMES = {1: 'entrance-spawn', 2: 'entrance-floor-down', 3: 'bathroom-spawn',
         4: 'bedroom-spawn', 5: 'living-room-spawn', 6: 'kitchen-hall-spot5'}

GAP = 10
rng = random.SystemRandom()
mapping = {}
for i in range(1, 7):
    on = Image.open(os.path.join(FRAMES, 'packon', 'pose%d.png' % i)).convert('RGB')
    off = Image.open(os.path.join(FRAMES, 'packoff', 'pose%d.png' % i)).convert('RGB')
    assert on.size == off.size, 'size mismatch on pose %d' % i
    pack_left = rng.choice([True, False])
    left, right = (on, off) if pack_left else (off, on)
    w, h = on.size
    canvas = Image.new('RGB', (w * 2 + GAP, h), (128, 128, 128))
    canvas.paste(left, (0, 0))
    canvas.paste(right, (w + GAP, 0))
    canvas.save(os.path.join(PAIRS, 'pair%d.png' % i))
    mapping['pair%d' % i] = {'pose': NAMES[i], 'A': 'pack-on' if pack_left else 'pack-off',
                             'B': 'pack-off' if pack_left else 'pack-on'}

with open(os.path.join(REVEAL, 'mapping.json'), 'w') as f:
    json.dump(mapping, f, indent=2)

print('wrote 6 composites to %s (left half = A, right half = B)' % PAIRS)
print('mapping sealed in %s -- do not open until the calls are written' % REVEAL)
for i in range(1, 7):
    print('  pair%d.png  pose: %s' % (i, NAMES[i]))
