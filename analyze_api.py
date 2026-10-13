import json
raw = open('extract/API_Data.txt').read()
raw = raw[raw.index('{'):]
d = json.loads(raw)
print('TOP KEYS:', list(d.keys()))
for k,v in d.items():
    if isinstance(v,list):
        print(f'  {k}: list[{len(v)}] sample={json.dumps(v[0])[:200] if v else None}')
    elif isinstance(v,dict):
        print(f'  {k}: dict keys={list(v.keys())}')
        for kk,vv in v.items():
            if isinstance(vv,list):
                print(f'      {kk}: list[{len(vv)}] sample={json.dumps(vv[0])[:200] if vv else None}')
            else:
                print(f'      {kk}: {json.dumps(vv)[:200]}')
    else:
        print(f'  {k}: {v}')
