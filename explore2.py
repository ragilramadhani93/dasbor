import openpyxl

wb = openpyxl.load_workbook('sheet.xlsx', read_only=True, data_only=True)
for ws in wb.worksheets:
    print('=' * 90)
    try:
        dim = ws.calculate_dimension(force=True)
    except Exception as e:
        dim = f"n/a ({e})"
    print(f"SHEET: {ws.title}  dims={dim}")
    n = 0
    try:
        for row in ws.iter_rows(values_only=True):
            cells = [('' if c is None else str(c)) for c in row]
            while cells and cells[-1] == '':
                cells.pop()
            if not cells:
                continue
            cells = [(c[:70] + ('...' if len(c) > 70 else '')) for c in cells]
            print(f"  [{n}] {cells}")
            n += 1
            if n >= 8:
                break
    except Exception as e:
        print("  err", e)
