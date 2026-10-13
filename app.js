'use strict';
const D = window.DASH || {};
const META = D.meta || {};
const MONTHS = META.months || [];
const AREAS = META.areas || [];

/* ---------- helpers ---------- */
const nf = new Intl.NumberFormat('id-ID');
function rp(v){ v=+v||0; return 'Rp ' + nf.format(Math.round(v)); }
function rpShort(v){ v=+v||0; const a=Math.abs(v);
  if(a>=1e9) return 'Rp '+(v/1e9).toFixed(2).replace('.',',')+' M';
  if(a>=1e6) return 'Rp '+(v/1e6).toFixed(1).replace('.',',')+' jt';
  if(a>=1e3) return 'Rp '+(v/1e3).toFixed(0)+' rb';
  return 'Rp '+nf.format(Math.round(v)); }
function num(v){ return nf.format(Math.round(+v||0)); }
function pctTxt(v){ return ((+v||0)*100).toFixed(1).replace('.',',')+'%'; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function pillClass(p){ return p>=1?'g':p>=0.7?'w':'b'; }
function pill(p){ const c=pillClass(p); return `<span class="pill ${c}">${pctTxt(p)}</span>`; }
function sum(arr,f){ return arr.reduce((a,x)=>a+(+f(x)||0),0); }
function byArea(list, area){ return area==='Semua'? list : list.filter(x=>x.area===area); }

const charts = {};
function mkChart(id, cfg){
  const el=document.getElementById(id); if(!el) return;
  if(charts[id]){ charts[id].destroy(); }
  charts[id]=new Chart(el.getContext('2d'), cfg);
}
const PALETTE=['#0f6f5c','#12946f','#2563eb','#f59e0b','#dc2626','#7c3aed','#0891b2','#be123c','#65a30d','#c2410c','#4f46e5','#0d9488'];
const PALETTE_A=['rgba(15,111,92,.75)','rgba(37,99,235,.75)','rgba(245,158,11,.8)','rgba(220,38,38,.75)','rgba(124,58,237,.75)','rgba(8,145,178,.75)'];
Chart.defaults.font.family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
Chart.defaults.font.size=11;
Chart.defaults.plugins.legend.labels.boxWidth=12;

/* ---------- state ---------- */
const state={ area:'Semua', month: MONTHS[MONTHS.length-1]||'', search:'' };

/* ---------- ringkasan ---------- */
function renderRingkasan(){
  const daily=byArea(D.sales.daily||[], state.area);
  const mtd=byArea(D.sales.mtd||[], state.area);
  const dRev=sum(daily,x=>x.revenue), dTar=sum(daily,x=>x.target), dShort=sum(daily,x=>x.shortfall);
  const mRev=sum(mtd,x=>x.revenue), mTar=sum(mtd,x=>x.target), mShort=sum(mtd,x=>x.shortfall);
  const dPct=dTar?dRev/dTar:0, mPct=mTar?mRev/mTar:0;
  const snack=D.sales.snack||{};
  const sNat=snack.byMenuNational||[];
  const sRevD=sum(sNat,x=>x.dRev), sRevM=sum(sNat,x=>x.mRev);
  const active=daily.filter(x=>x.revenue>0).length;
  const kpi=(label,val,sub,ratio,color)=>`<div class="card kpi"><div class="label">${label}</div><div class="val">${val}</div><div class="sub">${sub}</div>${ratio!=null?`<div class="bar"><span style="width:${Math.min(100,ratio*100)}%;background:${color}"></span></div>`:''}</div>`;
  const cc = p=>p>=1?'var(--good)':p>=0.7?'var(--warn)':'var(--bad)';
  document.getElementById('tab-ringkasan').innerHTML=`
    <div class="sect-title">Ringkasan Eksekutif <small>Kondisi penjualan harian &amp; month-to-date per ${esc(META.reportDate||'')}</small></div>
    <div class="grid kpis" style="margin-bottom:14px">
      ${kpi('Omset Harian', rpShort(dRev), pctTxt(dPct)+' dari target '+rpShort(dTar), dPct, cc(dPct))}
      ${kpi('Omset MTD', rpShort(mRev), pctTxt(mPct)+' dari target '+rpShort(mTar), mPct, cc(mPct))}
      ${kpi('Kekurangan Harian', rpShort(dShort), 'shortfall vs target harian')}
      ${kpi('Kekurangan MTD', rpShort(mShort), 'shortfall vs target MTD')}
      ${kpi('Outlet Aktif', active+' / '+daily.length, 'transaksi &gt; 0 hari ini')}
      ${kpi('Omset Snack Harian', rpShort(sRevD), 'roti/pastry hari ini')}
      ${kpi('Omset Snack MTD', rpShort(sRevM), 'roti/pastry bulan berjalan')}
    </div>
    <div class="grid g2">
      <div class="card"><h3>Realisasi vs Target per Area <small>harian</small></h3><div class="chart-wrap"><canvas id="cAreaDT"></canvas></div></div>
      <div class="card"><h3>Kontribusi Area <small>MTD</small></h3><div class="chart-wrap"><canvas id="cAreaPie"></canvas></div></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Pencapaian Outlet <small>harian &amp; MTD</small></h3><div class="tbl-wrap"><table id="tblOutlet"><thead><tr>
      <th data-k="area">Area</th><th data-k="outlet">Outlet</th><th class="num" data-k="revenue">Omset Harian</th><th class="num" data-k="target">Target</th><th class="num" data-k="pct">%</th><th class="num" data-k="shortfall">Shortfall</th><th class="num" data-k="mtdRev">Omset MTD</th><th class="num" data-k="mtdPct">% MTD</th></tr></thead><tbody></tbody></table></div></div>`;
  // charts
  const aD=AREAS.map(a=>({a,rev:sum((D.sales.daily||[]).filter(x=>x.area===a),x=>x.revenue),tar:sum((D.sales.daily||[]).filter(x=>x.area===a),x=>x.target)}));
  mkChart('cAreaDT',{type:'bar',data:{labels:aD.map(x=>x.a),datasets:[
    {label:'Realisasi',data:aD.map(x=>x.rev),backgroundColor:PALETTE_A[0]},
    {label:'Target',data:aD.map(x=>x.tar),backgroundColor:'rgba(148,163,184,.45)'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+rp(c.raw)}}},scales:{y:{ticks:{callback:v=>rpShort(v)}}}}});
  const aM=AREAS.map(a=>({a,rev:sum((D.sales.mtd||[]).filter(x=>x.area===a),x=>x.revenue)}));
  mkChart('cAreaPie',{type:'doughnut',data:{labels:aM.map(x=>x.a),datasets:[{data:aM.map(x=>x.rev),backgroundColor:PALETTE}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.label+': '+rp(c.raw)}}}}});
  fillOutletTable();
  const _t=document.getElementById('tblOutlet'); if(_t) attachSort(_t);
}

function mergedOutlets(){
  const map={};
  (D.sales.daily||[]).forEach(x=>{map[x.outlet]={area:x.area,outlet:x.outlet,revenue:x.revenue,target:x.target,pct:x.pct,shortfall:x.shortfall,mtdRev:0,mtdTarget:0,mtdPct:0};});
  (D.sales.mtd||[]).forEach(x=>{ const o=map[x.outlet]=map[x.outlet]||{area:x.area,outlet:x.outlet,revenue:0,target:0,pct:0,shortfall:0}; o.mtdRev=x.revenue;o.mtdTarget=x.target;o.mtdPct=x.pct; });
  return Object.values(map);
}

function sortTable(table, key, dir){
  const tbody=table.querySelector('tbody');
  const rows=[...tbody.querySelectorAll('tr')];
  rows.sort((a,b)=>{
    let x=a.dataset['v_'+key], y=b.dataset['v_'+key];
    const nx=parseFloat(x), ny=parseFloat(y);
    if(!isNaN(nx)&&!isNaN(ny)){ return dir*(nx-ny); }
    return dir*String(x).localeCompare(String(y));
  });
  rows.forEach(r=>tbody.appendChild(r));
}
function attachSort(table){
  table.querySelectorAll('th[data-k]').forEach(th=>{
    if(th.dataset.bound) return; th.dataset.bound='1';
    th.addEventListener('click',()=>{
      const k=th.dataset.k;
      th.dataset.dir = th.dataset.dir==='1'?'-1':'1';
      sortTable(table,k,parseInt(th.dataset.dir,10));
    });
  });
}
function fillOutletTable(){
  const table=document.getElementById('tblOutlet'); if(!table) return;
  const data=mergedOutlets().filter(o=>state.area==='Semua'||o.area===state.area)
    .filter(o=>!state.search||o.outlet.toLowerCase().includes(state.search.toLowerCase()));
  const tbody=table.querySelector('tbody');
  tbody.innerHTML=data.map(o=>`<tr data-v_area="${esc(o.area)}" data-v_outlet="${esc(o.outlet)}" data-v_revenue="${o.revenue||0}" data-v_target="${o.target||0}" data-v_pct="${o.pct||0}" data-v_shortfall="${o.shortfall||0}" data-v_mtdRev="${o.mtdRev||0}" data-v_mtdPct="${o.mtdPct||0}">
    <td>${esc(o.area)}</td><td>${esc(o.outlet)}</td><td class="num">${rp(o.revenue||0)}</td><td class="num">${rp(o.target||0)}</td><td class="num">${pill(o.pct||0)}</td><td class="num">${rp(o.shortfall||0)}</td><td class="num">${rp(o.mtdRev||0)}</td><td class="num">${pill(o.mtdPct||0)}</td></tr>`).join('');
}

/* ---------- performa outlet ---------- */
function renderOutlet(){
  const data=mergedOutlets().filter(o=>state.area==='Semua'||o.area===state.area)
    .filter(o=>!state.search||o.outlet.toLowerCase().includes(state.search.toLowerCase()));
  const top=[...data].sort((a,b)=>(b.mtdRev||0)-(a.mtdRev||0)).slice(0,15);
  const worst=[...data].filter(o=>o.mtdTarget>0).sort((a,b)=>(a.mtdPct||0)-(b.mtdPct||0)).slice(0,10);
  document.getElementById('tab-outlet').innerHTML=`
    <div class="sect-title">Performa Outlet <small>Peringkat omset MTD, pencapaian target, dan outlet perlu perhatian</small></div>
    <div class="grid g2">
      <div class="card"><h3>Top 15 Outlet <small>omset MTD</small></h3><div class="chart-wrap lg"><canvas id="cTopOutlet"></canvas></div></div>
      <div class="card"><h3>Outlet Perlu Perhatian <small>10 pencapaian MTD terendah</small></h3><div class="tbl-wrap" style="max-height:340px"><table id="tblWorst"><thead><tr><th>Area</th><th>Outlet</th><th class="num">Omset MTD</th><th class="num">Target</th><th class="num">%</th></tr></thead><tbody>
        ${worst.map(o=>`<tr><td>${esc(o.area)}</td><td>${esc(o.outlet)}</td><td class="num">${rp(o.mtdRev||0)}</td><td class="num">${rp(o.mtdTarget||0)}</td><td class="num">${pill(o.mtdPct||0)}</td></tr>`).join('')}
      </tbody></table></div></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Daftar Lengkap Outlet</h3><div class="tbl-wrap"><table id="tblOutlet2"><thead><tr>
      <th data-k="area">Area</th><th data-k="outlet">Outlet</th><th class="num" data-k="revenue">Omset Harian</th><th class="num" data-k="pct">% Harian</th><th class="num" data-k="mtdRev">Omset MTD</th><th class="num" data-k="mtdTarget">Target MTD</th><th class="num" data-k="mtdPct">% MTD</th><th class="num" data-k="shortfall">Shortfall Harian</th></tr></thead><tbody>
      ${data.sort((a,b)=>(b.mtdRev||0)-(a.mtdRev||0)).map(o=>`<tr data-v_area="${esc(o.area)}" data-v_outlet="${esc(o.outlet)}" data-v_revenue="${o.revenue||0}" data-v_pct="${o.pct||0}" data-v_mtdRev="${o.mtdRev||0}" data-v_mtdTarget="${o.mtdTarget||0}" data-v_mtdPct="${o.mtdPct||0}" data-v_shortfall="${o.shortfall||0}"><td>${esc(o.area)}</td><td>${esc(o.outlet)}</td><td class="num">${rp(o.revenue||0)}</td><td class="num">${pill(o.pct||0)}</td><td class="num">${rp(o.mtdRev||0)}</td><td class="num">${rp(o.mtdTarget||0)}</td><td class="num">${pill(o.mtdPct||0)}</td><td class="num">${rp(o.shortfall||0)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  attachSort(document.getElementById('tblOutlet2'));
  mkChart('cTopOutlet',{type:'bar',data:{labels:top.map(o=>o.outlet),datasets:[
    {label:'Omset MTD',data:top.map(o=>o.mtdRev||0),backgroundColor:PALETTE_A[0]},
    {label:'Target MTD',data:top.map(o=>o.mtdTarget||0),backgroundColor:'rgba(148,163,184,.45)'}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+rp(c.raw)}}},scales:{x:{ticks:{callback:v=>rpShort(v)}}}}});
}

/* ---------- tren ---------- */
function renderTren(){
  const mo=D.trend.monthly||[];
  const ds=(D.trend.dailySeries||{})[state.month]||[];
  const am=(D.trend.areaMonthly||[]).filter(a=>state.area==='Semua'||a.area===state.area);
  const om=(D.trend.outletMonthly||[]).filter(o=>state.area==='Semua'||o.area===state.area)
    .filter(o=>!state.search||o.outlet.toLowerCase().includes(state.search.toLowerCase()));
  document.getElementById('tab-tren').innerHTML=`
    <div class="sect-title">Tren Penjualan <small>Perbandingan bulanan (Jul-Okt 2026) &amp; pola harian</small></div>
    <div class="grid g2">
      <div class="card"><h3>Omset &amp; Transaksi Bulanan</h3><div class="chart-wrap"><canvas id="cMonthly"></canvas></div></div>
      <div class="card"><h3>Omset Harian — ${esc(state.month)}</h3><div class="chart-wrap"><canvas id="cDaily"></canvas></div></div>
    </div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><h3>Omset Bulanan per Area</h3><div class="chart-wrap"><canvas id="cAreaMonthly"></canvas></div></div>
      <div class="card"><h3>Ringkasan Bulanan</h3><div class="tbl-wrap"><table><thead><tr><th>Bulan</th><th class="num">Omset</th><th class="num">Qty</th><th class="num">Transaksi</th><th class="num">Rata2/Transaksi</th><th class="num">Outlet</th></tr></thead><tbody>
        ${mo.map(x=>`<tr><td>${esc(x.month)}</td><td class="num">${rp(x.revenue)}</td><td class="num">${num(x.qty)}</td><td class="num">${num(x.transactions)}</td><td class="num">${rp(x.avgBasket)}</td><td class="num">${num(x.outlets)}</td></tr>`).join('')}
      </tbody></table></div><div class="legend-note">Catatan: Okt 2026 baru sampai tanggal 12 sehingga belum sebanding dengan bulan penuh.</div></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Omset per Outlet per Bulan</h3><div class="tbl-wrap"><table id="tblOM"><thead><tr><th data-k="area">Area</th><th data-k="outlet">Outlet</th>${MONTHS.map(m=>`<th class="num" data-k="${m}">${m}</th>`).join('')}<th class="num" data-k="total">Total</th></tr></thead><tbody>
      ${om.map(o=>{const tot=MONTHS.reduce((a,m)=>a+(+o[m]||0),0);return `<tr data-v_area="${esc(o.area)}" data-v_outlet="${esc(o.outlet)}" data-v_total="${tot}" ${MONTHS.map(m=>`data-v_${m}="${+o[m]||0}"`).join(' ')}><td>${esc(o.area)}</td><td>${esc(o.outlet)}</td>${MONTHS.map(m=>`<td class="num">${rp(o[m]||0)}</td>`).join('')}<td class="num"><b>${rp(tot)}</b></td></tr>`;}).join('')}
    </tbody></table></div></div>`;
  attachSort(document.getElementById('tblOM'));
  mkChart('cMonthly',{data:{labels:mo.map(x=>x.month),datasets:[
    {type:'bar',label:'Omset',data:mo.map(x=>x.revenue),backgroundColor:PALETTE_A[0],yAxisID:'y'},
    {type:'line',label:'Transaksi',data:mo.map(x=>x.transactions),borderColor:PALETTE[2],backgroundColor:PALETTE[2],yAxisID:'y1',tension:.3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+(c.dataset.yAxisID==='y'?rp(c.raw):num(c.raw))}}},scales:{y:{ticks:{callback:v=>rpShort(v)}},y1:{position:'right',grid:{drawOnChartArea:false},ticks:{callback:v=>num(v)}}}}});
  mkChart('cDaily',{data:{labels:ds.map(x=>x.date.slice(8)+'/'+x.date.slice(5,7)),datasets:[
    {type:'line',label:'Omset',data:ds.map(x=>x.revenue),borderColor:PALETTE[0],backgroundColor:'rgba(15,111,92,.12)',fill:true,tension:.3,yAxisID:'y'},
    {type:'bar',label:'Transaksi',data:ds.map(x=>x.transactions),backgroundColor:'rgba(37,99,235,.35)',yAxisID:'y1'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+(c.dataset.yAxisID==='y'?rp(c.raw):num(c.raw))}}},scales:{y:{ticks:{callback:v=>rpShort(v)}},y1:{position:'right',grid:{drawOnChartArea:false},ticks:{callback:v=>num(v)}}}}});
  mkChart('cAreaMonthly',{type:'bar',data:{labels:MONTHS,datasets:am.map((a,i)=>({label:a.area,data:MONTHS.map(m=>a[m]||0),backgroundColor:PALETTE[i%PALETTE.length]}))},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+rp(c.raw)}}},scales:{y:{ticks:{callback:v=>rpShort(v)}}}}});
}

/* ---------- produk & kategori ---------- */
function renderProduk(){
  const cats=D.trend.categoryMix||[];
  const top=(D.trend.topMenus||[]).slice(0,15);
  const pay=(D.trend.paymentMix||{})[state.month]||[];
  const hourly=D.trend.hourly||[];
  const dow=D.trend.dow||[];
  const menuM=(D.trend.menuByMonth||{})[state.month]||[];
  document.getElementById('tab-produk').innerHTML=`
    <div class="sect-title">Produk &amp; Kategori <small>Bauran kategori, produk terlaris, metode bayar, dan pola waktu</small></div>
    <div class="grid g3">
      <div class="card"><h3>Bauran Kategori <small>omset total</small></h3><div class="chart-wrap sm"><canvas id="cCat"></canvas></div></div>
      <div class="card"><h3>Metode Pembayaran <small>${esc(state.month)}</small></h3><div class="chart-wrap sm"><canvas id="cPay"></canvas></div></div>
      <div class="card"><h3>Pola Jam Sibuk <small>seluruh periode</small></h3><div class="chart-wrap sm"><canvas id="cHour"></canvas></div></div>
    </div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><h3>Top 15 Produk <small>omset total</small></h3><div class="chart-wrap lg"><canvas id="cTopMenu"></canvas></div></div>
      <div class="card"><h3>Pola Hari dalam Seminggu</h3><div class="chart-wrap"><canvas id="cDow"></canvas></div></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Produk Terlaris — ${esc(state.month)}</h3><div class="tbl-wrap"><table><thead><tr><th>#</th><th>Produk</th><th>Kategori</th><th class="num">Qty</th><th class="num">Omset</th></tr></thead><tbody>
      ${menuM.map((x,i)=>{const c=(D.trend.topMenus||[]).find(t=>t.menu===x.menu);return `<tr><td>${i+1}</td><td>${esc(x.menu)}</td><td>${esc(c?c.category:'-')}</td><td class="num">${num(x.qty)}</td><td class="num">${rp(x.revenue)}</td></tr>`;}).join('')}
    </tbody></table></div></div>`;
  mkChart('cCat',{type:'doughnut',data:{labels:cats.map(c=>c.category),datasets:[{data:cats.map(c=>c.revenue),backgroundColor:PALETTE}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}},tooltip:{callbacks:{label:c=>c.label+': '+rp(c.raw)}}}}});
  mkChart('cPay',{type:'doughnut',data:{labels:pay.map(p=>p.method),datasets:[{data:pay.map(p=>p.revenue),backgroundColor:PALETTE}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}},tooltip:{callbacks:{label:c=>c.label+': '+rp(c.raw)}}}}});
  mkChart('cHour',{type:'bar',data:{labels:hourly.map(h=>h.hour+':00'),datasets:[{label:'Omset',data:hourly.map(h=>h.revenue),backgroundColor:PALETTE_A[2]}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>rp(c.raw)}}},scales:{y:{ticks:{callback:v=>rpShort(v)}}}}});
  mkChart('cTopMenu',{type:'bar',data:{labels:top.map(m=>m.menu),datasets:[{label:'Omset',data:top.map(m=>m.revenue),backgroundColor:top.map((m,i)=>PALETTE[i%PALETTE.length])}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>rp(c.raw)}}},scales:{x:{ticks:{callback:v=>rpShort(v)}}}}});
  mkChart('cDow',{type:'bar',data:{labels:dow.map(d=>d.dow),datasets:[{label:'Omset',data:dow.map(d=>d.revenue),backgroundColor:PALETTE_A[0]}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>rp(c.raw)}}},scales:{y:{ticks:{callback:v=>rpShort(v)}}}}});
}

/* ---------- snack ---------- */
function renderSnack(){
  const sn=D.sales.snack||{};
  const nat=sn.byMenuNational||[];
  const perArea=sn.byMenuPerArea||{};
  const detail=sn.detail||[];
  const menus=sn.menus||[];
  const sD=sum(nat,x=>x.dRev), sM=sum(nat,x=>x.mRev), qD=sum(nat,x=>x.dQty), qM=sum(nat,x=>x.mQty);
  document.getElementById('tab-snack').innerHTML=`
    <div class="sect-title">Snack / Roti &amp; Pastry <small>Kinerja produk bakery di seluruh outlet</small></div>
    <div class="grid kpis" style="margin-bottom:14px">
      <div class="card kpi"><div class="label">Qty Harian</div><div class="val">${num(qD)}</div><div class="sub">pcs terjual hari ini</div></div>
      <div class="card kpi"><div class="label">Omset Harian</div><div class="val">${rpShort(sD)}</div><div class="sub">kontribusi snack hari ini</div></div>
      <div class="card kpi"><div class="label">Qty MTD</div><div class="val">${num(qM)}</div><div class="sub">pcs bulan berjalan</div></div>
      <div class="card kpi"><div class="label">Omset MTD</div><div class="val">${rpShort(sM)}</div><div class="sub">kontribusi snack MTD</div></div>
    </div>
    <div class="grid g2">
      <div class="card"><h3>Snack per Menu <small>MTD</small></h3><div class="chart-wrap lg"><canvas id="cSnackMenu"></canvas></div></div>
      <div class="card"><h3>Snack per Area <small>MTD per menu</small></h3><div class="chart-wrap lg"><canvas id="cSnackArea"></canvas></div></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Detail Snack per Outlet</h3><div class="tbl-wrap"><table id="tblSnack"><thead><tr><th data-k="area">Area</th><th data-k="outlet">Outlet</th><th data-k="menu">Menu</th><th class="num" data-k="dQty">Qty Harian</th><th class="num" data-k="dRev">Nominal Harian</th><th class="num" data-k="mQty">Qty MTD</th><th class="num" data-k="mRev">Nominal MTD</th></tr></thead><tbody>
      ${detail.map(x=>`<tr data-v_area="${esc(x.area)}" data-v_outlet="${esc(x.outlet)}" data-v_menu="${esc(x.menu)}" data-v_dQty="${x.dQty}" data-v_dRev="${x.dRev}" data-v_mQty="${x.mQty}" data-v_mRev="${x.mRev}"><td>${esc(x.area)}</td><td>${esc(x.outlet)}</td><td>${esc(x.menu)}</td><td class="num">${num(x.dQty)}</td><td class="num">${rp(x.dRev)}</td><td class="num">${num(x.mQty)}</td><td class="num">${rp(x.mRev)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  attachSort(document.getElementById('tblSnack'));
  mkChart('cSnackMenu',{type:'bar',data:{labels:nat.map(m=>m.menu),datasets:[{label:'Omset MTD',data:nat.map(m=>m.mRev),backgroundColor:PALETTE_A[0]},{label:'Omset Harian',data:nat.map(m=>m.dRev),backgroundColor:PALETTE_A[2]}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+rp(c.raw)}}},scales:{x:{ticks:{callback:v=>rpShort(v)}}}}});
  mkChart('cSnackArea',{type:'bar',data:{labels:menus,datasets:AREAS.map((a,i)=>({label:a,data:menus.map(m=>{const row=(perArea[a]||[]).find(x=>x.menu===m);return row?row.mRev:0;}),backgroundColor:PALETTE[i%PALETTE.length]}))},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+rp(c.raw)}}},scales:{x:{ticks:{font:{size:9},maxRotation:60,minRotation:45}},y:{ticks:{callback:v=>rpShort(v)}}}}});
}

/* ---------- inventori ---------- */
function renderInventori(){
  const st=D.inventory.stock||{};
  const rows=(st.rows||[]).filter(r=>state.area==='Semua'||r.area===state.area);
  const neg=rows.filter(r=>r.stock<0);
  const byOut=st.byOutlet||[];
  const outletCount=(st.rows||[]).length;
  const totalNeg=(st.rows||[]).filter(r=>r.stock<0).length;
  const totalZero=(st.rows||[]).filter(r=>r.stock===0).length;
  document.getElementById('tab-inventori').innerHTML=`
    <div class="sect-title">Inventori &amp; Stok <small>Saldo stok produk (Stock Balance) dan anomali stok negatif</small></div>
    <div class="grid kpis" style="margin-bottom:14px">
      <div class="card kpi"><div class="label">Total Baris Stok</div><div class="val">${num(outletCount)}</div><div class="sub">kombinasi outlet x menu</div></div>
      <div class="card kpi"><div class="label">Stok Negatif</div><div class="val" style="color:var(--bad)">${num(totalNeg)}</div><div class="sub">perlu tindak lanjut opname</div></div>
      <div class="card kpi"><div class="label">Stok Nol</div><div class="val">${num(totalZero)}</div><div class="sub">saldo kosong</div></div>
      <div class="card kpi"><div class="label">Stok Positif</div><div class="val" style="color:var(--good)">${num(outletCount-totalNeg-totalZero)}</div><div class="sub">saldo tersedia</div></div>
    </div>
    <div class="grid g2">
      <div class="card"><h3>Jumlah SKU Negatif per Outlet</h3><div class="chart-wrap lg"><canvas id="cNegOut"></canvas></div></div>
      <div class="card"><h3>Detail Stok Negatif</h3><div class="tbl-wrap" style="max-height:340px"><table id="tblNeg"><thead><tr><th data-k="area">Area</th><th data-k="outlet">Outlet</th><th data-k="menu">Menu</th><th class="num" data-k="stock">Stok</th><th data-k="lastUpdated">Update Terakhir</th></tr></thead><tbody>
        ${neg.sort((a,b)=>a.stock-b.stock).map(r=>`<tr data-v_area="${esc(r.area)}" data-v_outlet="${esc(r.outlet)}" data-v_menu="${esc(r.menu)}" data-v_stock="${r.stock}" data-v_lastUpdated="${esc(r.lastUpdated)}"><td>${esc(r.area)}</td><td>${esc(r.outlet)}</td><td>${esc(r.menu)}</td><td class="num" style="color:var(--bad);font-weight:700">${num(r.stock)}</td><td>${esc(r.lastUpdated||'-')}</td></tr>`).join('')}
      </tbody></table></div></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Seluruh Saldo Stok</h3><div class="tbl-wrap"><table id="tblStock"><thead><tr><th data-k="area">Area</th><th data-k="outlet">Outlet</th><th data-k="menu">Menu</th><th class="num" data-k="stock">Stok</th><th data-k="lastUpdated">Update Terakhir</th></tr></thead><tbody>
      ${rows.sort((a,b)=>a.stock-b.stock).map(r=>`<tr data-v_area="${esc(r.area)}" data-v_outlet="${esc(r.outlet)}" data-v_menu="${esc(r.menu)}" data-v_stock="${r.stock}" data-v_lastUpdated="${esc(r.lastUpdated)}"><td>${esc(r.area)}</td><td>${esc(r.outlet)}</td><td>${esc(r.menu)}</td><td class="num" style="${r.stock<0?'color:var(--bad);font-weight:700':''}">${num(r.stock)}</td><td>${esc(r.lastUpdated||'-')}</td></tr>`).join('')}
    </tbody></table></div><div class="legend-note">Stok negatif menandakan pencatatan barang keluar (penjualan/retur) melebihi barang masuk (GR) — perlu penyesuaian opname.</div></div>`;
  attachSort(document.getElementById('tblStock'));
  mkChart('cNegOut',{type:'bar',data:{labels:byOut.map(o=>o.outlet),datasets:[{label:'SKU negatif',data:byOut.map(o=>o.neg),backgroundColor:'rgba(220,38,38,.7)'}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{precision:0}}}}});
}

/* ---------- bahan baku & BOM ---------- */
function renderBahan(){
  const iu=D.inventory.ingredientUsage||{};
  const ings=iu.ingredients||[];
  const bom=D.inventory.bom||{};
  const boms=bom.items||[];
  document.getElementById('tab-bahan').innerHTML=`
    <div class="sect-title">Bahan Baku &amp; BOM <small>Pemakaian bahan baku (Ingredient Usage) dan resep/Bill of Materials</small></div>
    <div class="grid kpis" style="margin-bottom:14px">
      <div class="card kpi"><div class="label">Jenis Bahan Baku (BOM)</div><div class="val">${num((bom.ingredients||[]).length)}</div><div class="sub">bahan unik terdaftar</div></div>
      <div class="card kpi"><div class="label">Menu dengan Resep</div><div class="val">${num(bom.count)}</div><div class="sub">menu pada BOM Master</div></div>
      <div class="card kpi"><div class="label">Jenis Bahan (Usage)</div><div class="val">${num(ings.length)}</div><div class="sub">bahan tercatat pemakaian</div></div>
      <div class="card kpi"><div class="label">Baris Usage</div><div class="val">${num(iu.rows)}</div><div class="sub">${num(iu.placeholderRows)} baris placeholder</div></div>
    </div>
    <div class="grid g2">
      <div class="card"><h3>Top Pemakaian Bahan Baku <small>satuan campuran</small></h3><div class="chart-wrap lg"><canvas id="cIng"></canvas></div></div>
      <div class="card"><h3>Bahan Paling Sering Dipakai di Resep</h3><div class="chart-wrap lg"><canvas id="cBomIng"></canvas></div></div>
    </div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><h3>Rincian Pemakaian Bahan Baku</h3><div class="tbl-wrap"><table id="tblIng"><thead><tr><th data-k="bahan">Bahan Baku</th><th data-k="satuan">Satuan</th><th class="num" data-k="total">Total Pemakaian</th></tr></thead><tbody>
        ${ings.map(x=>`<tr data-v_bahan="${esc(x.bahan)}" data-v_satuan="${esc(x.satuan)}" data-v_total="${x.total}"><td>${esc(x.bahan)}</td><td>${esc(x.satuan)}</td><td class="num">${num(x.total)}</td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="card"><h3>Daftar Resep (BOM)</h3><div class="tbl-wrap"><table id="tblBom"><thead><tr><th data-k="menu">Menu</th><th class="num" data-k="n">Jml Bahan</th><th data-k="detail">Komposisi</th></tr></thead><tbody>
        ${boms.map(b=>`<tr data-v_menu="${esc(b.menu)}" data-v_n="${b.items.length}" data-v_detail="${esc(b.items.map(i=>i.bahan).join(', '))}"><td>${esc(b.menu)}</td><td class="num">${b.items.length}</td><td class="note">${esc(b.items.map(i=>i.bahan+' ('+num(i.qty)+' '+i.satuan+')').join(', '))}</td></tr>`).join('')}
      </tbody></table></div><div class="legend-note">Pemakaian bahan baku saat ini hanya tercatat untuk area Jabodetabek (periode Agustus 2026).</div></div>
    </div>`;
  attachSort(document.getElementById('tblIng')); attachSort(document.getElementById('tblBom'));
  const topIng=ings.slice(0,15);
  mkChart('cIng',{type:'bar',data:{labels:topIng.map(x=>x.bahan),datasets:[{label:'Total pemakaian',data:topIng.map(x=>x.total),backgroundColor:PALETTE_A[0]}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>num(c.raw)+' '+(topIng[c.dataIndex].satuan||'')}}},scales:{x:{ticks:{callback:v=>num(v)}}}}});
  const topBom=(bom.ingredients||[]).slice(0,15);
  mkChart('cBomIng',{type:'bar',data:{labels:topBom.map(x=>x.bahan),datasets:[{label:'Dipakai di N menu',data:topBom.map(x=>x.count),backgroundColor:PALETTE_A[2]}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{precision:0}}}}});
}

/* ---------- logistik & log ---------- */
function renderLogistik(){
  const dl=(D.inventory.delivery||[]).filter(x=>state.area==='Semua'||x.area===state.area)
    .filter(x=>!state.search||x.outlet.toLowerCase().includes(state.search.toLowerCase()));
  const noDays=dl.filter(x=>!x.days||x.days.length===0);
  const logs=D.logs||{};
  const logHtml=Object.keys(logs).map(name=>{
    const L=logs[name];
    if(!L.rows || L.rows.length===0){
      return `<div class="card" style="margin-top:12px"><h3>${esc(name)}</h3><div class="empty">Belum ada data tercatat.<br>Kolom tersedia: ${esc((L.headers||[]).join(' | '))}</div></div>`;
    }
    return `<div class="card" style="margin-top:12px"><h3>${esc(name)} <small>${L.rows.length} baris</small></h3><div class="tbl-wrap"><table><thead><tr>${L.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${L.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }).join('');
  document.getElementById('tab-logistik').innerHTML=`
    <div class="sect-title">Logistik &amp; Log Operasional <small>Jadwal pengiriman dan log penerimaan/retur/opname</small></div>
    <div class="grid kpis" style="margin-bottom:14px">
      <div class="card kpi"><div class="label">Outlet Terjadwal</div><div class="val">${num(dl.length)}</div><div class="sub">punya jadwal kirim</div></div>
      <div class="card kpi"><div class="label">Belum Ada Jadwal</div><div class="val" style="color:var(--warn)">${num(noDays.length)}</div><div class="sub">delivery days belum diisi</div></div>
    </div>
    <div class="card"><h3>Jadwal Pengiriman per Outlet</h3><div class="tbl-wrap"><table id="tblDel"><thead><tr><th data-k="area">Area</th><th data-k="outlet">Outlet</th><th data-k="daysRaw">Hari Kirim</th></tr></thead><tbody>
      ${dl.map(x=>`<tr data-v_area="${esc(x.area)}" data-v_outlet="${esc(x.outlet)}" data-v_daysRaw="${esc(x.daysRaw)}"><td>${esc(x.area)}</td><td>${esc(x.outlet)}</td><td>${x.days&&x.days.length?x.days.map(d=>`<span class="pill n">${esc(d)}</span>`).join(' '):'<span class="pill w">Belum diisi</span>'}</td></tr>`).join('')}
    </tbody></table></div></div>
    ${logHtml}`;
  attachSort(document.getElementById('tblDel'));
}

/* ---------- kualitas data ---------- */
function renderKualitas(){
  const diag=D.diagnostics||{};
  const st=D.inventory.stock||{};
  const iu=D.inventory.ingredientUsage||{};
  const logs=D.logs||{};
  const emptyLogs=Object.keys(logs).filter(k=>!logs[k].rows||logs[k].rows.length===0);
  const negCount=(st.rows||[]).filter(r=>r.stock<0).length;
  const noDel=(D.inventory.delivery||[]).filter(x=>!x.days||x.days.length===0).length;
  const areas=(iu.byArea||[]).map(a=>a.area);
  const issues=[
    `Outlet tanpa pemetaan area: ${(diag.unmatchedOutlets||[]).length?esc(diag.unmatchedOutlets.join(', ')):'tidak ada'}.`,
    `Log operasional belum terisi: ${emptyLogs.length?esc(emptyLogs.join(', ')):'tidak ada'} (template kosong, siap diisi).`,
    `Saldo stok negatif: ${num(negCount)} baris — indikasi GR belum tercatat atau penjualan melebihi stok.`,
    `Outlet belum memiliki jadwal pengiriman: ${num(noDel)} outlet.`,
    `Baris placeholder pada Ingredient Usage: ${num(iu.placeholderRows)} (outlet belum diisi delivery days).`,
    `Cakupan Ingredient Usage hanya area: ${areas.length?esc(areas.join(', ')):'-'} (periode Agustus 2026).`,
    `Sheet "Sales Report" hanya memuat 1-7 Juli 2026 (sebagian dari sheet bulanan) — gunakan sheet bulanan sebagai acuan.`,
    `Sheet "Dashboard" lama tidak memiliki data sel (hanya berisi elemen grafis).`
  ];
  const checks=[
    ['Sheet penjualan bulanan (Jul-Okt 2026)', (D.trend.monthly||[]).length+' bulan'],
    ['Sheet penjualan siap pakai (ringkasan harian/MTD)', (D.sales.daily||[]).length+' outlet'],
    ['Data snack/bakery', ((D.sales.snack||{}).menus||[]).length+' menu'],
    ['Stock Balance', (st.rows||[]).length+' baris'],
    ['BOM Master', (D.inventory.bom||{}).count+' menu'],
    ['Ingredient Usage', (iu.rows||0)+' baris'],
    ['Jadwal pengiriman', (D.inventory.delivery||[]).length+' outlet']
  ];
  document.getElementById('tab-kualitas').innerHTML=`
    <div class="sect-title">Kualitas Data &amp; Kesiapan <small>Ringkasan isu data yang perlu diperbaiki agar monitoring akurat</small></div>
    <div class="grid g2">
      <div class="card"><h3>Temuan / Isu Data</h3><ul class="issues">${issues.map(i=>`<li>${i}</li>`).join('')}</ul></div>
      <div class="card"><h3>Ketersediaan Data</h3><div class="tbl-wrap"><table><thead><tr><th>Sumber</th><th>Keterangan</th></tr></thead><tbody>
        ${checks.map(c=>`<tr><td>${esc(c[0])}</td><td>${esc(c[1])}</td></tr>`).join('')}
      </tbody></table></div></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Rekomendasi Tindak Lanjut</h3><ul class="issues">
      <li>Lengkapi jadwal pengiriman (delivery days) untuk seluruh outlet agar pemakaian bahan &amp; kebutuhan stok bisa dihitung.</li>
      <li>Disiplinkan pencatatan GR (barang masuk), retur/waste, dan opname harian agar saldo stok tidak negatif.</li>
      <li>Perluas pencatatan Ingredient Usage ke seluruh area (Jabar, Jateng, Jatim), bukan hanya Jabodetabek.</li>
      <li>Hapus/beri keterangan outlet uji (mis. "Test Outlet") agar tidak mengganggu agregat.</li>
      <li>Perbarui target outlet yang belum wajar (mis. target harian kosong/0) dan selaraskan dengan hari operasional.</li>
    </ul></div>`;
}

/* ---------- init & navigasi ---------- */
const TABS=['ringkasan','outlet','tren','produk','snack','inventori','bahan','logistik','kualitas'];
const RENDER={ringkasan:renderRingkasan,outlet:renderOutlet,tren:renderTren,produk:renderProduk,snack:renderSnack,inventori:renderInventori,bahan:renderBahan,logistik:renderLogistik,kualitas:renderKualitas};
let activeTab='ringkasan';
function activate(tab){
  activeTab=tab;
  TABS.forEach(t=>document.getElementById('tab-'+t).classList.toggle('active',t===tab));
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('active',a.dataset.tab===tab));
  RENDER[tab]();
  window.scrollTo({top:0,behavior:'smooth'});
}
function refreshActive(){ RENDER[activeTab](); }
function init(){
  const fa=document.getElementById('fArea');
  fa.innerHTML=['Semua'].concat(AREAS).map(a=>`<option>${esc(a)}</option>`).join('');
  const fm=document.getElementById('fMonth');
  fm.innerHTML=MONTHS.map(m=>`<option>${esc(m)}</option>`).join('');
  fm.value=state.month;
  document.getElementById('metaLine').innerHTML=`Tanggal laporan: <b>${esc(META.reportDate||'-')}</b> &middot; Sumber: ${esc(META.source||'-')} &middot; ${MONTHS.length} bulan data (${esc((MONTHS[0]||'')+' s.d. '+(MONTHS[MONTHS.length-1]||''))})`;
  document.getElementById('footer').innerHTML=`Dashboard Monitoring KACC &middot; dibuat otomatis dari workbook Google Sheet (${esc(META.source||'')}) pada ${esc((META.generatedAt||'').slice(0,19).replace('T',' '))} UTC. Angka dalam Rupiah (Rp).`;
  document.querySelectorAll('#nav a').forEach(a=>a.addEventListener('click',()=>activate(a.dataset.tab)));
  fa.addEventListener('change',e=>{state.area=e.target.value;refreshActive();});
  fm.addEventListener('change',e=>{state.month=e.target.value;refreshActive();});
  let t=null;
  document.getElementById('fSearch').addEventListener('input',e=>{clearTimeout(t);t=setTimeout(()=>{state.search=e.target.value.trim();refreshActive();},200);});
  document.getElementById('btnReset').addEventListener('click',()=>{state.area='Semua';state.month=MONTHS[MONTHS.length-1]||'';state.search='';fa.value='Semua';fm.value=state.month;document.getElementById('fSearch').value='';refreshActive();});
  window.addEventListener('beforeprint',()=>{TABS.forEach(t=>{document.getElementById('tab-'+t).classList.add('active');RENDER[t]();});});
  window.addEventListener('afterprint',()=>{TABS.forEach(t=>document.getElementById('tab-'+t).classList.toggle('active',t===activeTab));});
  activate('ringkasan');
}
if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded',init);
