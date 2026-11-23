from PIL import Image
im = Image.open('ref/card_sample.png').convert('RGB')
w, h = im.size
print('size', w, h)
pts = {
 'header bg': (400, 40),
 'header bg2': (700, 200),
 'body bg': (400, 400),
 'text': (60, 700),
 'top-left corner': (0, 0),
 'edge left': (0, 500),
 'edge right': (w-1, 500),
 'edge top': (400, 0),
 'edge bottom': (400, h-1),
 'divider': (400, 148*4),
 'divider2': (400, 149*4),
 'school text': (300, 158*4),
}
for k, p in pts.items():
    print(k, p, im.getpixel(p))

# vertical scan at x=10 to find border colors
print('\nscan x=1:', [im.getpixel((1, y)) for y in range(0, h, 60)])
print('scan y=1:', [im.getpixel((x, 1)) for x in range(0, w, 60)])
print('scan bottom y=h-2:', [im.getpixel((x, h-2)) for x in range(0, w, 60)])

sh = Image.open('ref/sheet0.png').convert('RGB')
print('\nsheet size', sh.size)
# find separator line between columns
for x in range(400, 430):
    px = sh.getpixel((x, 400))
    if px != (255, 255, 255):
        print('col sep x', x, px)
print('sheet bg', sh.getpixel((10, 10)), sh.getpixel((600, 1650)))
