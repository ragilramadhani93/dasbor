import openpyxl
from collections import Counter, defaultdict
wb = openpyxl.load_workbook('sheet.xlsx', read_only=True, data_only=True)
rev=Counter(); qty=Counter(); outlets=set()
for name in ['Jul 2026','Aug 2026','Sep 2026','Oct 2026']:
    ws=wb[name]; it=ws.iter_rows(values_only=True); hdr=next(it)
    idx={h:i for i,h in enumerate(hdr)}
    for row in it:
        if row is None or not row[0]: continue
        m=str(row[idx['Item Name']]); rev[m]+=float(row[idx['Grand Total Final']] or 0); qty[m]+=float(row[idx['Qty']] or 0)
        outlets.add(str(row[idx['Outlet Name']]).strip())
print('OUTLETS in sales:', len(outlets))
for o in sorted(outlets): print('  ', repr(o))
print('MENUS', len(rev))
for m,r in rev.most_common():
    print(f'  {r:14,.0f}  q={qty[m]:9,.0f}  {m}')
