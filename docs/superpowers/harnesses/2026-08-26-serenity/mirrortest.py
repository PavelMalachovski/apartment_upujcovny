import sys, os, json
import numpy as np
from PIL import Image
sys.path.insert(0, 'tools')
from delta_e import srgb_to_lab, ciede2000, GRID

def cells(im, grid=GRID):
    a = np.asarray(im.convert('RGB'), float)/255.0
    H,W,_ = a.shape
    out = np.zeros((grid,grid,3))
    for j in range(grid):
        for i in range(grid):
            r = a[int(j*H/grid):int((j+1)*H/grid), int(i*W/grid):int((i+1)*W/grid)]
            out[j,i] = r.reshape(-1,3).mean(axis=0)
    return out

def score(photo, render):
    return float(np.mean(ciede2000(srgb_to_lab(cells(photo)), srgb_to_lab(cells(render)))))

d = json.load(open('tour/apartments/serenity.json'))
srcdir = sys.argv[1]
print(f'{"spot":10s} {"normal":>8s} {"mirrored":>9s}  verdict')
tot_n = tot_m = 0; n = 0
for s in d['photoSpots']:
    if not s.get('compare'): continue
    f = s['file']
    p = Image.open(f'tour/photos/serenity/{f}')
    r = Image.open(f'{srcdir}/render_serenity_{f.replace(".webp",".jpg")}')
    a = score(p, r); b = score(p.transpose(Image.FLIP_LEFT_RIGHT), r)
    tot_n += a; tot_m += b; n += 1
    print(f'{f:10s} {a:8.2f} {b:9.2f}  {"MIRROR better" if b < a - 0.15 else ("normal better" if a < b - 0.15 else "tie")}')
print(f'{"MEAN":10s} {tot_n/n:8.2f} {tot_m/n:9.2f}')
