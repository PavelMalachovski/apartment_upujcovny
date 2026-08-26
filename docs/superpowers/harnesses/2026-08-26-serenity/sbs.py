import sys, os
from PIL import Image, ImageDraw
ROOT='/home/user/apartment_upujcovny'
def sbs(apt, files, srcdir, out, max_h=560):
    tiles=[]
    for f in files:
        p = Image.open(f'{ROOT}/tour/photos/{apt}/{f}.webp').convert('RGB')
        r = Image.open(f'{srcdir}/render_{apt}_{f}.jpg').convert('RGB')
        def sc(im):
            s=max_h/im.height; return im.resize((max(1,int(im.width*s)),max_h))
        p,r=sc(p),sc(r)
        t=Image.new('RGB',(p.width+r.width+8,max_h+22),(20,20,20))
        t.paste(p,(0,22)); t.paste(r,(p.width+8,22))
        d=ImageDraw.Draw(t); d.text((4,5), f'{f}.webp  PHOTO (left)  |  RENDER (right)', fill=(0,255,120))
        tiles.append(t)
    W=max(t.width for t in tiles); H=sum(t.height+6 for t in tiles)
    cv=Image.new('RGB',(W,H),(20,20,20)); y=0
    for t in tiles: cv.paste(t,(0,y)); y+=t.height+6
    cv.save(out); print(out, cv.size)
if __name__=='__main__':
    sbs(sys.argv[1], sys.argv[2].split(','), sys.argv[3], sys.argv[4])
