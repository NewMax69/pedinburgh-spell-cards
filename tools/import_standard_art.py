import json
import re
from pathlib import Path

from PIL import Image

SRC = Path(r"C:\Users\Максим\Downloads\Иллюстрации заклинаний")
OUT = Path("public/art")


def norm(value: str) -> str:
    value = value.lower().replace("ё", "е")
    value = re.sub(r"\.[a-z0-9]{2,5}$", "", value)
    return re.sub(r"[^0-9a-zа-я]+", "", value)


manifest: dict[str, str] = {}
for folder in sorted(SRC.iterdir()):
    if not folder.is_dir():
        continue
    level = folder.name.split()[0]
    files = sorted(
        f for f in folder.iterdir() if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    for index, source in enumerate(files):
        image = Image.open(source).convert("RGB")
        image.thumbnail((512, 512), Image.LANCZOS)
        dest = OUT / level / f"{index:03d}.webp"
        dest.parent.mkdir(parents=True, exist_ok=True)
        image.save(dest, "WEBP", quality=82, method=6)
        manifest[norm(source.stem)] = f"/art/{level}/{index:03d}.webp"

Path("data/standard-art.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=0), encoding="utf-8"
)
total = sum(f.stat().st_size for f in OUT.rglob("*.webp"))
print(f"files: {len(manifest)}, size: {total / 1e6:.1f} MB")
