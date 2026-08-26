import sys, json
import numpy as np
from PIL import Image
sys.path.insert(0,'tools')
from delta_e import srgb_to_lab, ciede2000, GRID
def cells(im, grid=GRID):
    a=np.asarray(im.convert('RGB'),float)/255.0; H,W,_=a.shape
    return np.array([[a[int(j*H/grid):int((j+1)*H/grid), int(i*W/grid):int((i+1)*W/grid)].reshape(-1,3).mean(axis=0)
                      for i in range(grid)] for j in range(grid)])
def sc(p,r): return float(np.mean(ciede2000(srgb_to_lab(cells(p)), srgb_to_lab(cells(r)))))
d=json.load(open('tour/apartments/serenity.json'))
dirs=sys.argv[1:]
print(f'{"spot":10s} ' + ' '.join(f'{x.split("/")[-1]:>16s}' for x in dirs))
tot=[0.0]*len(dirs); n=0
for s in d['photoSpots']:
    if not s.get('compare'): continue
    f=s['file']; p=Image.open(f'tour/photos/serenity/{f}')
    vals=[sc(p, Image.open(f'{dd}/render_serenity_{f.replace(".webp",".jpg")}')) for dd in dirs]
    for i,v in enumerate(vals): tot[i]+=v
    n+=1
    print(f'{f:10s} ' + ' '.join(f'{v:16.2f}' for v in vals))
print(f'{"MEAN":10s} ' + ' '.join(f'{t/n:16.2f}' for t in tot))
