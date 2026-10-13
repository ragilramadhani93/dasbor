import openpyxl, json, os
wb = openpyxl.load_workbook('sheet.xlsx', read_only=True, data_only=True)
sheets = ['Summary','Delivery Schedule','API_Data','BOM Master','Ingredient Usage','Stock_Balance']
os.makedirs('extract', exist_ok=True)
for ws in wb.worksheets:
    if ws.title not in sheets: continue
    with open(f'extract/{ws.title.replace(" ","_")}.txt','w') as f:
        n=0
        for row in ws.iter_rows(values_only=True):
            cells=[('' if c is None else str(c)) for c in row]
            f.write(f'[{n}] ' + ' | '.join(cells) + '\n')
            n+=1
    print(ws.title, 'lines', n)
