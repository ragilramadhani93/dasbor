import openpyxl
from collections import Counter, defaultdict
wb = openpyxl.load_workbook('sheet.xlsx', read_only=True, data_only=True)
for name in ['Jul 2026','Aug 2026','Sep 2026','Oct 2026','Sales Report']:
    ws = wb[name]
    it = ws.iter_rows(values_only=True)
    hdr = next(it)
    idx = {h:i for i,h in enumerate(hdr)}
    dates=set(); outlets=set(); types=set(); pays=set(); statuses=set(); menus=set(); mtypes=set()
    n=0; rev=0.0; qty=0.0
    for row in it:
        if row is None or row[0] is None: continue
        n+=1
        od = str(row[idx['Opened Date']])[:10]
        dates.add(od)
        outlets.add(str(row[idx['Outlet Name']]).strip())
        types.add(str(row[idx['Transaction Type']]))
        if 'Payment Method' in idx: pays.add(str(row[idx['Payment Method']]).strip())
        statuses.add(str(row[idx['Status']]))
        menus.add(str(row[idx['Item Name']]))
        mtypes.add(str(row[idx['Menu Type']]))
        try: qty += float(row[idx['Qty']])
        except: pass
        try: rev += float(row[idx['Grand Total Final']])
        except: pass
    print(f'== {name}: rows={n} datespan={min(dates)}..{max(dates)} ndates={len(dates)}')
    print(f'   outlets={len(outlets)} rev={rev:,.0f} qty={qty:,.0f} menus={len(menus)} mtypes={mtypes}')
    print(f'   types={types}')
    print(f'   statuses={statuses}')
    print(f'   pays({len(pays)})={sorted(pays)[:20]}')
