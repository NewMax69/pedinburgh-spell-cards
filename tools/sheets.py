import openpyxl, collections, json

wb = openpyxl.load_workbook('workbook.xlsx', data_only=True)
print("SHEETS:", wb.sheetnames)
for ws in wb.worksheets:
    print(f"\n=== {ws.title!r} dims={ws.dimensions} max_row={ws.max_row} max_col={ws.max_column}")
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        continue
    header = rows[0]
    print("HEADER:", [str(h) for h in header])
    data = [r for r in rows[1:] if any(c not in (None, "") for c in r)]
    print("DATA ROWS:", len(data))
    if data:
        print("SAMPLE:", [str(c)[:80] for c in data[0]])
