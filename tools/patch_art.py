from pathlib import Path

p = Path("src/lib/art.ts")
s = p.read_text(encoding="utf-8")
pairs = [
    ("  const color = meta.color;", "  const color = meta.color;\n  const accent = shiftHue(color, ((hash(key) >>> 8) % 46) - 23);"),
    ('base.addColorStop(0, "#10141b");', 'base.addColorStop(0, "#1a2030");'),
    ('base.addColorStop(1, "#080a0e");', 'base.addColorStop(1, "#0a0d13");'),
    ("g.addColorStop(0, rgba(color, 0.5));", "g.addColorStop(0, rgba(i === 0 ? color : accent, 0.6));"),
    ("g.addColorStop(0.5, rgba(color, 0.16));", "g.addColorStop(0.5, rgba(i === 0 ? color : accent, 0.2));"),
    (
        'ctx.strokeStyle = index === 1 ? rgba(color, 0.5) : "rgba(255,255,255,0.16)";',
        'ctx.strokeStyle = index === 1 ? rgba(accent, 0.65) : "rgba(255,255,255,0.18)";',
    ),
    ("ctx.strokeStyle = rgba(color, 0.75);", "ctx.strokeStyle = rgba(color, 0.9);"),
    (
        'ctx.strokeStyle = i % 4 === 0 ? rgba(color, 0.55) : "rgba(255,255,255,0.14)";',
        'ctx.strokeStyle = i % 4 === 0 ? rgba(accent, 0.6) : "rgba(255,255,255,0.16)";',
    ),
    ('vignette.addColorStop(1, "rgba(0,0,0,0.6)");', 'vignette.addColorStop(1, "rgba(0,0,0,0.5)");'),
    ("const n = (rnd() - 0.5) * 16;", "const n = (rnd() - 0.5) * 10;"),
]
for old, new in pairs:
    if old not in s:
        print("MISS:", old[:60])
    s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("art patched")
