from PIL import Image
import numpy as np
im = np.array(Image.open('ref/card_sample.png').convert('L')) / 255.0
# body region in card coords: x 12..168 -> px 48..672; y 22..140 -> 88..560
body = 1.0 - im[88:560, 48:672]
rows = body.mean(axis=1)
# find dark line bands
thr = rows.max() * 0.25
bands = []
inb = False
for i, v in enumerate(rows):
    if v > thr and not inb:
        start = i; inb = True
    elif v <= thr and inb:
        bands.append((start, i)); inb = False
print('bands', len(bands))
print([(round(a/4,1), round(b/4,1)) for a, b in bands])
tops = [a for a, b in bands]
if len(tops) > 2:
    diffs = [round((tops[i+1]-tops[i])/4, 2) for i in range(len(tops)-1)]
    print('pitch pt', diffs)
