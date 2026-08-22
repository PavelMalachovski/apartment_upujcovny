import sys
from PIL import Image, ImageDraw

def side_by_side(photo_path, render_path, out, max_h=700):
    a = Image.open(photo_path).convert('RGB')
    b = Image.open(render_path).convert('RGB')
    scale_a = max_h / a.height
    scale_b = max_h / b.height
    a2 = a.resize((int(a.width*scale_a), max_h))
    b2 = b.resize((int(b.width*scale_b), max_h))
    w = a2.width + b2.width + 10
    canvas = Image.new('RGB', (w, max_h), (0,0,0))
    canvas.paste(a2, (0,0))
    canvas.paste(b2, (a2.width+10, 0))
    # gridlines every 0.1 of height
    d = ImageDraw.Draw(canvas)
    for i in range(1,10):
        y = int(max_h * i/10)
        d.line([(0,y),(w,y)], fill=(0,255,0), width=1)
        d.text((2,y+1), f'{i/10:.1f}', fill=(0,255,0))
    canvas.save(out)
    print(out, 'photo', a.size, 'render', b.size)

if __name__ == '__main__':
    side_by_side(sys.argv[1], sys.argv[2], sys.argv[3])
