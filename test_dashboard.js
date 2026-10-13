const fs=require('fs');
const {JSDOM, VirtualConsole}=require('jsdom');
let html=fs.readFileSync('dashboard.html','utf8');
const stub='<script>window.Chart=function(){return{destroy:function(){},update:function(){}}};window.Chart.defaults={font:{family:"",size:11},plugins:{legend:{labels:{}}}};</script>';
html=html.replace('<script>window.DASH', stub+'<script>window.DASH');
const errors=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push('jsdomError: '+e.message));
vc.on('error',(...a)=>errors.push('error: '+a.join(' ')));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){ w.scrollTo=()=>{}; w.print=()=>{}; }});
const w=dom.window;
setTimeout(()=>{
  const tabs=['ringkasan','outlet','tren','produk','snack','inventori','bahan','logistik','kualitas'];
  for(const t of tabs){
    try{ w.activate(t); const el=w.document.getElementById('tab-'+t); console.log('tab',t,'html length',el.innerHTML.length); }
    catch(e){ errors.push('render '+t+': '+e.stack); }
  }
  // test filters
  try{ w.document.getElementById('fArea').value='Jateng'; w.activate('outlet'); console.log('area filter ok'); }catch(e){ errors.push('area filter: '+e.message); }
  console.log('\nERRORS:', errors.length);
  errors.slice(0,20).forEach(e=>console.log(' -',e.slice(0,400)));
},600);
