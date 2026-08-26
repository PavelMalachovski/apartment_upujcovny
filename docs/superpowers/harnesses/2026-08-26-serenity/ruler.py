import sys, os
from PIL import Image, ImageDraw
def ruler(path, out, max_w=1400, step=0.05):
    im = Image.open(path).convert('RGB')
    s = min(1.0, max_w/im.width); im = im.resize((int(im.width*s), int(im.height*s)))
    d = ImageDraw.Draw(im)
    W,H = im.size
    i = 0
    x = 0.0
    while x <= 1.0001:
        px = int(x*(W-1))
        col = (255,0,0) if abs(x*20 - round(x*20))<1e-6 and round(x*20)%2==0 else (0,255,0)
        d.line([(px,0),(px,H)], fill=col, width=1)
        d.text((px+2, 4), f'{x:.2f}', fill=(255,255,0))
        x += step
    y = 0.0
    while y <= 1.0001:
        py = int(y*(H-1))
        d.line([(0,py),(W,py)], fill=(0,180,255), width=1)
        d.text((3, py+2), f'{y:.2f}', fill=(255,255,0))
        y += step
    im.save(out); print(out, im.size)
if __name__=='__main__':
    ruler(sys.argv[1], sys.argv[2])
