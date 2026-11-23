import base64
import io
import json
import os
import re
import sys

from PIL import Image

mapping_file, svg_dir, out_dir = sys.argv[1:4]
data = json.load(open(mapping_file, encoding="utf-8"))
os.makedirs(out_dir, exist_ok=True)

INVALID = r'[<>:"/\\|?*\x00-\x1f]'
IMAGE_RE = re.compile(r'data:image/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)')


def safe_name(name: str) -> str:
    value = re.sub(INVALID, "-", name.replace("/", "-"))
    value = re.sub(r"\s+", " ", value).strip(" .-")
    return value[:120] or "Без названия"


rows = []
missing = []
for sheet in data.get("sheets", []):
    for card in sheet.get("cards", []):
        name = safe_name(card["name"])
        found = None
        for cid in reversed(card.get("candidates", [])):
            tail = cid.split(":")[-1]
            for fname in (cid.replace(":", "_"), tail):
                path = os.path.join(svg_dir, f"{fname}.svg")
                if os.path.exists(path):
                    break
            else:
                continue
            if not os.path.exists(path):
                continue
            text = open(path, encoding="utf-8", errors="ignore").read()
            match = IMAGE_RE.search(text)
            if match:
                found = (match.group(1).lower(), base64.b64decode(match.group(2)))
                break
        if not found:
            missing.append(name)
            continue

        fmt, payload = found
        target = os.path.join(out_dir, f"{name}.jpg")
        if fmt in ("jpeg", "jpg"):
            with open(target, "wb") as handle:
                handle.write(payload)
            size = Image.open(io.BytesIO(payload)).size
        else:
            image = Image.open(io.BytesIO(payload)).convert("RGB")
            image.save(target, "JPEG", quality=95, optimize=True)
            size = image.size
        rows.append((name, size, os.path.getsize(target)))

rows.sort()
print(f"saved {len(rows)} files in {out_dir}")
for name, size, weight in rows:
    print(f"  {name}.jpg  {size[0]}x{size[1]}  {weight // 1024} KB")
if missing:
    print("БЕЗ ИЛЛЮСТРАЦИИ:", ", ".join(missing))
