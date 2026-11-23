import openpyxl, json, re, collections, os

os.makedirs('data', exist_ok=True)
wb = openpyxl.load_workbook('workbook.xlsx', data_only=True)
out = []
for ws in wb.worksheets:
    if 'круг' not in ws.title:
        continue
    level = int(ws.title.split()[0])
    rows = list(ws.iter_rows(values_only=True))
    header = [str(h).strip() if h is not None else '' for h in rows[0]]
    idx = {h: i for i, h in enumerate(header) if h}
    up_col = idx.get('Урон на высоких уровнях', idx.get('Накладывание более высокой ячейкой'))
    for r in rows[1:]:
        def g(name=None, i=None):
            j = idx.get(name) if name else i
            if j is None or j >= len(r) or r[j] is None:
                return ''
            return str(r[j]).strip()
        name = g('Название заклинания')
        if not name:
            continue
        out.append({
            'name': name, 'level': level,
            'ritual': g('Ритуал').lower() in ('да', 'yes', 'true'),
            'school': g('Школа'),
            'casting': g('Накладывание'),
            'range': g('Дистанция'),
            'duration': g('Длительность'),
            'components': g('Компоненты'),
            'description': g('Описание'),
            'upgrade': g(i=up_col) if up_col is not None else '',
            'overhaul': g('Описание (Пединбург)'),
            'status': g('Статус'),
            'source': g('Ссылка'),
            'prompt': g('Promt для иллюстрации'),
        })

empty = [x for x in out if not x['school'] or not x['casting']]
print('EMPTY ROWS:', [(x['level'], x['name'], x['school'], x['casting']) for x in empty])
names = collections.Counter((x['level'], x['name']) for x in out)
print('DUPES:', [k for k, v in names.items() if v > 1][:10])

over = [x for x in out if x['upgrade']]
print('with upgrade col:', len(over))
already = [x for x in over if 'высоких уровнях' in x['overhaul'].lower()]
print('upgrade already inside overhaul:', len(already))
print('upgrade sample not inside:', [(x['name'], x['upgrade'][:100]) for x in over if x not in already][:5])

print('markdown:', sum(1 for x in out if re.search(r'\*\*|<b>|__', x['overhaul'])))
buckets = collections.Counter()
for x in out:
    n = len(x['overhaul'] or x['description'])
    b = '<=400' if n <= 400 else '<=600' if n <= 600 else '<=800' if n <= 800 else '<=1000' if n <= 1000 else '<=1400' if n <= 1400 else '>1400'
    buckets[b] += 1
print('length buckets:', dict(buckets))
print('no overhaul:', [(x['level'], x['name'], len(x['description'])) for x in out if not x['overhaul']])

# what do paragraphs look like?
paras = collections.Counter()
for x in out:
    for p in [p for p in (x['overhaul'] or '').split('\n') if p.strip()]:
        first = p.split(':')[0][:30]
        paras[first] += 1
print('para starts:', paras.most_common(12))

json.dump(out, open('data/spells.raw.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('written', len(out))
