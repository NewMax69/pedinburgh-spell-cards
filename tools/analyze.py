import re, csv, json, collections, sys

html = open('sheet_edit.html', encoding='utf-8', errors='replace').read()
print("html len", len(html))
for kw in ['Круг', 'gid', 'sheetId', 'Уровень']:
    print(kw, html.count(kw))
m = re.findall(r'gid[^0-9]{0,10}(\d{3,})', html)
print("gid nums", m[:20])
idx = html.find('Уровень')
print("context:", html[max(0, idx-200):idx+200] if idx > 0 else 'no Уровень')

rows = list(csv.DictReader(open('sheet0.csv', encoding='utf-8-sig')))
print("\nrows", len(rows))
print("columns", list(rows[0].keys()))
for col in ['Школа', 'Ритуал', 'Накладывание', 'Статус']:
    c = collections.Counter(r[col] for r in rows)
    print(col, dict(c))
print("\nfirst row:")
for k, v in rows[0].items():
    print(" -", k, "=>", repr(v)[:220])
