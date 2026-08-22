import sys, os
from PIL import Image

def crop_row(path, row_frac, out, band=0.10, label=None):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    row = int(row_frac * (h-1))
    y0 = max(0, row - int(band*h))
    y1 = min(h, row + int(band*h))
    c = im.crop((0, y0, w, y1))
    # draw a line at the target row
    from PIL import ImageDraw
    d = ImageDraw.Draw(c)
    ly = row - y0
    d.line([(0, ly), (w, ly)], fill=(255,0,0), width=2)
    c.save(out)
    print(out, im.size, 'row', row, 'of', h)

if __name__ == '__main__':
    path, row_frac, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
    band = float(sys.argv[4]) if len(sys.argv) > 4 else 0.10
    crop_row(path, row_frac, out, band)
