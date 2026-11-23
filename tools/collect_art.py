import json
import os
import re
import sys

from PIL import Image

mapping_file, raw_dir, out_dir = sys.argv[1:4]
data = json.load(open(mapping_file, encoding="utf-8"))
os.makedirs(out_dir, exist_ok=True)

INVALID = r'[<>:"/\\|?*\x00-\x1f]'


def safe_name(name: str) -> str:
    value = re.sub(INVALID, "-", name.replace("/", "-"))
    value = re.sub(r"\s+", " ", value).strip(" .-")
    return value[:120] or "Без названия"


def fix_notches(image: Image.Image, notch_pt: float = 3.4) -> Image.Image:
    """Заделывает вырезанные углы рамки: отражает прилегающую полосу в угол."""
    width, height = image.size
    scale = width / 52.0
    n = max(1, int(round(notch_pt * scale)))
    out = image.copy()
    patches = [
        ((0, n, n, 2 * n), (0, 0), Image.FLIP_TOP_BOTTOM),
        ((width - n, n, width, 2 * n), (width - n, 0), Image.FLIP_TOP_BOTTOM),
        ((0, height - 2 * n, n, height - n), (0, height - n), Image.FLIP_TOP_BOTTOM),
        ((width - n, height - 2 * n, width, height - n), (width - n, height - n), Image.FLIP_TOP_BOTTOM),
    ]
    for box, pos, flip in patches:
        patch = out.crop(box).transpose(flip)
        out.paste(patch, pos)
    return out


rows = []
missing = []
for sheet in data.get("sheets", []):
    for card in sheet.get("cards", []):
        best = None
        for cid in card.get("candidates", []):
            tail = cid.split(":")[-1]
            path = os.path.join(raw_dir, f"{tail}.png")
            if not os.path.exists(path):
                continue
            if best is None or os.path.getsize(path) > os.path.getsize(best):
                best = path
        if not best or os.path.getsize(best) < 20000:
            missing.append(card.get("name"))
            continue
        image = Image.open(best).convert("RGB")
        scale = image.width / 60.0
        box = (
            round(4 * scale),
            round(4 * scale),
            round(56 * scale),
            round(56 * scale),
        )
        crop = fix_notches(image.crop(box))
        name = safe_name(card["name"])
        target = os.path.join(out_dir, f"{name}.jpg")
        crop.save(target, quality=92, optimize=True)
        rows.append((name, crop.width, os.path.getsize(target)))

rows.sort()
print(f"saved {len(rows)} files in {out_dir}")
for name, width, size in rows:
    print(f"  {name}.jpg  {width}px  {size // 1024} KB")
if missing:
    print("БЕЗ ИЛЛЮСТРАЦИИ:", ", ".join(missing))
