from PIL import Image
import numpy as np
im = np.array(Image.open('ref/card_sample.png').convert('L'))
col = im[:, 48:672]
dark = (col < 140).sum(axis=1)
# print rows with counts for body area
for y in range(80, 600, 2):
    c = dark[y]
    bar = '#' * min(60, c // 2)
    print(f"{y/4:6.1f} {c:4d} {bar}")
