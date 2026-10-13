import openpyxl
wb = openpyxl.load_workbook('sheet.xlsx', read_only=True, data_only=True)
targets = ['Aug 2026','BOM Master','Ingredient Usage','Delivery Schedule','Sales Report']
for ws in wb.worksheets:
    if ws.title not in targets: continue
    print('='*90)
    try: dim = ws.calculate_dimension(force=True)
    except Exception as e: dim = f'n/a'
    print(f'SHEET: {ws.title} dims={dim}')
    n=0
    for row in ws.iter_rows(values_only=True):
        cells=[('' if c is None else str(c)) for c in row]
        while cells and cells[-1]=='': cells.pop()
        if not cells: continue
        cells=[(c[:80]+('...' if len(c)>80 else '')) for c in cells]
        print(f'  [{n}] {cells}')
        n+=1
        if n>=12: break
