import json

data = json.load(open("data/spells.json", encoding="utf-8"))
ids = [spell["id"] for spell in data["spells"] if spell["level"] in (0, 1)][:11]
array = json.dumps(ids, ensure_ascii=False)
script = "localStorage.setItem('pedinburgh:selection', JSON.stringify(" + array + ")); 'ok'"
open("tools/seed-selection.js", "w", encoding="utf-8").write(script)
print(len(ids), ids[:3])
