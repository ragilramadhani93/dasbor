#!/usr/bin/env python3
"""Bangun dashboard.html mandiri (single file) dari template + data + chart.js + app.js."""
import os, re
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p):
    with open(os.path.join(BASE,p), encoding='utf-8') as f: return f.read()
tpl=rd('dashboard_template.html')
data=rd('data/dashboard_data.json')
data=data.replace('</', '<\\/')
chartjs=rd(os.environ.get('CHARTJS','vendor/chart.umd.min.js'))
appjs=rd('app.js')
out=tpl.replace('/*__CHARTJS__*/', chartjs)
out=out.replace('/*__DASHBOARD_DATA__*/', data)
out=out.replace('/*__APPJS__*/', appjs)
p=os.path.join(BASE,'dashboard.html')
with open(p,'w',encoding='utf-8') as f: f.write(out)
print('Wrote', p, os.path.getsize(p), 'bytes')
