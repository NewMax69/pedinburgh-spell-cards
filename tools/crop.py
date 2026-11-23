from PIL import Image
import os
os.makedirs('ref/crops', exist_ok=True)

card = Image.open('ref/card_sample.png')  # 720x1008 = 4x of 180x252
card.crop((0, 0, 420, 330)).resize((840, 660), Image.LANCZOS).save('ref/crops/header_zoom.png')
card.crop((0, 560, 720, 1008)).resize((1080, 672), Image.LANCZOS).save('ref/crops/footer_zoom.png')

sheet = Image.open('ref/sheet0.png')  # 1190x1684 = 2x
sheet.crop((50, 1080, 280, 1190)).resize((920, 440), Image.LANCZOS).save('ref/crops/ritual_badge.png')
sheet.crop((0, 0, 1190, 120)).resize((1190, 120), Image.LANCZOS).save('ref/crops/top_margin.png')

# sample school names area
sheet.crop((50, 1400, 700, 1620)).resize((1300, 440), Image.LANCZOS).save('ref/crops/body_zoom.png')
print('ok')
