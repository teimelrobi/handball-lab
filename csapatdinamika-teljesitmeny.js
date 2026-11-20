'use strict';
// KéziStat Csapatdinamika – mérkőzéses együttállások. Nincs hálózati adatküldés.
(function(){
const E=id=>document.getElementById(id), clean=x=>String(x==null?'':x).trim(), norm=x=>clean(x).toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''), html=x=>String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const age=x=>{const s=clean(x).toUpperCase();return s.includes('18')?'FU18':s.includes('16')?'FU16':''};
let customMap=new Map(), relevantMatches=[],availableNames=[],missing=[],db=null;
const team=()=>E('globalTeam').value;
const worksheetPlayers=()=>players.filter(p=>p.team===team());
function getDb(){try{const v=JSON.parse(localStorage.getItem('handball_db')||'null');return v&&typeof v==='object'&&Array.isArray(v.matches)?v:null}catch(e){return null}}
function matchSide(m){for(const side of ['home','away']){const name=clean(m[side+'Name']||''),teamObj=db.teams?.[m[side+'TeamId']];if(norm(name).includes('budaifarkasok')||norm(teamObj?.name).includes('budaifarkasok'))return side}return ''}
function checkMatch(m,side){
 const group=age(m[side+'AgeGroup']||db.teams?.[m[side+'TeamId']]?.ageGroup);
 if(group)return group===team()?'yes':'no';
 const roster=m[side+'Roster']||[],keys=new Set(roster.map(x=>norm(x.name)));
 const current=worksheetPlayers().filter(p=>keys.has(norm(p.name))).length;
 const other=players.filter(p=>p.team!==team()&&keys.has(norm(p.name))).length;
 return current>=3&&current>other?'yes':'unknown';
}
function pmName(p){return customMap.get(p.id)||norm(p.name)}
function loadMatches(){
 db=getDb(); relevantMatches=[];availableNames=[];missing=[];
 if(!db)return;
 let excluded=0;
 for(const m of db.matches){const side=matchSide(m);if(!side)continue;const verdict=checkMatch(m,side);if(verdict!=='yes'){excluded++;continue}
  relevantMatches.push({m,side});
 }
 const allNames=new Map();
 for(const {m,side} of relevantMatches)for(const p of m[side+'Roster']||[])if(clean(p.name))allNames.set(norm(p.name),clean(p.name));
 availableNames=[...allNames].map(([key,name])=>({key,name})).sort((a,b)=>a.name.localeCompare(b.name,'hu'));
 const known=new Set(availableNames.map(x=>x.key));
 customMap=new Map([...customMap].filter(([id,k])=>worksheetPlayers().some(p=>p.id===id)&&known.has(k)));
 missing=worksheetPlayers().filter(p=>!known.has(pmName(p)));
 const msg=E('perfState');let text=db.matches.length+' mentett mérkőzésből '+relevantMatches.length+' kapcsolható a '+team()+' korosztályhoz.';
 if(excluded)text+=' '+excluded+' bizonytalan vagy más korosztályú találkozó kihagyva.';
 if(missing.length)text+=' '+missing.length+' név még nem egyezik a mérkőzéskerettel.';
 msg.textContent=text;
}
function verifyHistory(m){
 const h=(Array.isArray(m.lineupHistory)?m.lineupHistory:[]).filter(v=>Number.isFinite(Number(v.abs))&&Number(v.abs)>=0).sort((a,b)=>Number(a.abs)-Number(b.abs));
 const end=Number(m.matchEndAbs);
 return m.lineupHistoryComplete===true&&h.length>0&&Number.isFinite(end)&&end>0?{h,end}:null;
}
function matchPlayers(m,side) {
 const roster=(m[side+'Roster']||[]);
 const lookup=new Map(roster.map(p=>[norm(p.name),p]));
 return worksheetPlayers().filter(p=>lookup.has(pmName(p))).map(p=>({p,num:String(lookup.get(pmName(p)).num)}));
}
function courtHas(court,n1,n2){
 if(!Array.isArray(court))return false;
 const s=new Set(court.map(String));return s.has(n1)&&s.has(n2);
}
function pairKey(a,b){return a<b?a+'|'+b:b+'|'+a}
function computePairs(){
 const result=new Map(),ids=worksheetPlayers(),nmap=new Map(ids.map(p=>[p.id,p]));
 for(const {m,side} of relevantMatches){
  const mp=matchPlayers(m,side),valid=verifyHistory(m),field=side+'Court';
  // Kizárólag igazolt, teljes összeállításnaplós meccsekből számolunk percet és +/--t.
  if(!valid)continue;
  const {h,end}=valid;
  const perMatch=new Map();
  const row=(a,b)=>{
   const key=pairKey(a,b);
   let item=result.get(key);
   if(!item){item={a,b,time:0,gf:0,ga:0,shots:0,attacks:0,defenses:0,matches:new Set(),observed:0};result.set(key,item)}
   perMatch.set(key,item);
   return item;
  };
  for(let i=0;i<h.length;i++){
   const start=Number(h[i].abs),stop=Math.min(end,i+1<h.length?Number(h[i+1].abs):end),court=h[i][field];
   if(stop<=start||!Array.isArray(court))continue;
   const on=mp.filter(x=>new Set(court.map(String)).has(x.num));
   for(let j=0;j<on.length;j++)for(let k=j+1;k<on.length;k++){
    const r=row(on[j].p.id,on[k].p.id);r.time+=stop-start;r.matches.add(String(m.id||m.date||'m'));
   }
  }
  const seen=new Map();
  for(const e of m.events||[]){
   if(!Array.isArray(e[field]))continue;
   const on=mp.filter(x=>e[field].map(String).includes(x.num));
   for(let j=0;j<on.length;j++)for(let k=j+1;k<on.length;k++){
    const r=row(on[j].p.id,on[k].p.id);r.observed++;
    if(e.group==='shot'){
     if(e.team===side){r.shots++;if(e.result==='Gól')r.gf++}
     else if(e.result==='Gól')r.ga++;
    }
    if(e.possessionEnd){
     const pKey=String(e.possessionId||e.id||e.period+'-'+e.seconds+'-'+j+'-'+k);
     const key=pairKey(on[j].p.id,on[k].p.id);
     const unique=key+'|'+pKey,already=seen.get(unique);
     if(!already){seen.set(unique,true);if(e.possessionTeam===side)r.attacks++;else if(e.possessionTeam==='home'||e.possessionTeam==='away')r.defenses++}
    }
   }
  }
 }
 return [...result.values()].map(r=>({...r,pa:nmap.get(r.a),pb:nmap.get(r.b)})).filter(r=>r.pa&&r.pb);
}
function votes(a,b){
 const category=Number(E('perfCategory').value||0);
 let ab=0,ba=0;
 for(const x of records){if(category&&Math.ceil(x.q/4)!==category)continue;if(x.from===a&&x.to===b)ab++;if(x.from===b&&x.to===a)ba++}
 return {ab,ba,mutual:ab>0&&ba>0};
}
function minutes(n){if(!n)return '0:00';return Math.floor(n/60)+':'+String(Math.round(n%60)).padStart(2,'0')}
function csvCell(s){return '"'+String(s).replace(/"/g,'""')+'"'}
function renderMapping(){
 const host=E('perfMap'),playersHere=worksheetPlayers();host.replaceChildren();
 if(!playersHere.length){host.textContent='Előbb töltsd be az Excel-fájlt.';return}
 if(!availableNames.length){host.textContent='Nincs párosítható mérkőzéskeret. Ellenőrizd a csapat nevét és a FU16/FU18 besorolást a KéziStatban.';return}
 if(!missing.length){host.textContent='Minden kérdőíves játékosnév egyezik a KéziStat mérkőzéskeretével.';return}
 const intro=document.createElement('p');intro.className='caption';intro.textContent='Csak akkor párosíts neveket, ha biztos vagy benne, hogy ugyanarról a játékosról van szó. A javítás csak ebben a megnyitott nézetben él.';host.append(intro);
 for(const p of missing){
  const line=document.createElement('div');line.className='perfMapRow';
  const label=document.createElement('span');label.textContent=p.name;label.style.fontSize='13px';
  const select=document.createElement('select');select.setAttribute('aria-label',p.name+' statisztikai név');
  select.append(new Option('Nincs párosítva',''));
  for(const a of availableNames)select.add(new Option(a.name,a.key));
  select.value=customMap.get(p.id)||'';
  select.addEventListener('change',()=>{if(select.value)customMap.set(p.id,select.value);else customMap.delete(p.id);loadMatches();renderMapping();renderPerformance()});
  line.append(label,select);host.append(line);
 }
}
function options(){
 const ps=worksheetPlayers().slice().sort((a,b)=>a.name.localeCompare(b.name,'hu'));
 const a=E('perfA'),b=E('perfB'),prevA=a.value,prevB=b.value;
 a.replaceChildren(new Option('Első játékos',''));b.replaceChildren(new Option('Második játékos',''));
 for(const p of ps){a.add(new Option(p.name,p.id));b.add(new Option(p.name,p.id))}
 if(ps.some(p=>p.id===prevA))a.value=prevA;else if(ps.length)a.value=ps[0].id;
 if(ps.some(p=>p.id===prevB))b.value=prevB;else if(ps.length>1)b.value=ps[1].id;
 if(a.value===b.value&&ps.length>1)b.value=ps.find(x=>x.id!==a.value).id;
}
function renderPerformance(){
 if(!E('performanceView'))return;
 const ps=worksheetPlayers();
 const noData=E('perfNotice'),intro=E('perfResult'),tbl=E('perfRanking');
 if(!ps.length){noData.textContent='A statisztikai összehasonlításhoz töltsd be a személyiség- és szociometriai Excelt.';intro.replaceChildren();tbl.replaceChildren();return}
 if(!db||!relevantMatches.length){noData.textContent='Nincs megfelelő mérkőzés a helyi KéziStat-adatok között. Ellenőrizd, hogy ezen a böngészőn van-e mentett FU16/FU18 meccs, és a mérkőzések korosztálya helyesen szerepel-e.';intro.replaceChildren();tbl.replaceChildren();return}
 const verified=relevantMatches.filter(x=>verifyHistory(x.m)).length;
 noData.textContent=verified+' / '+relevantMatches.length+' mérkőzés rendelkezik teljes összeállításnaplóval. Csak ezekből készülnek idő- és eredményességi mutatók. A hiányos mérkőzések nem szerepelnek az összehasonlításban.';
 const list=computePairs(),x=E('perfA').value,y=E('perfB').value;
 const pair=list.find(v=>pairKey(v.a,v.b)===pairKey(x,y));
 const pa=ps.find(p=>p.id===x),pb=ps.find(p=>p.id===y);
 if(!pa||!pb||x===y){intro.textContent='Válassz ki két különböző játékost.'}else{
  const v=votes(x,y),cat=Number(E('perfCategory').value||0),found=pair&&pair.time>0;
  const note=(cat?categories[cat]:'Összes kapcsolattípus')+': '+v.ab+' / '+v.ba+' jelölés ('+(v.mutual?'kölcsönös kapcsolat':v.ab+v.ba?'nem kölcsönös':'nincs jelölés')+').';
  const outcome=found
    ?'Ellenőrzött közös játékidő: '+minutes(pair.time)+'. Rögzített közös gólkülönbség: '+(pair.gf-pair.ga>0?'+':'')+(pair.gf-pair.ga)+' ('+pair.gf+' lőtt / '+pair.ga+' kapott). Összesített támadásbefejezések: '+pair.attacks+'.'
    :'A két játékoshoz nincs igazolt közös játékidő a rendelkezésre álló összeállításnaplókban; ebből nem következik, hogy a pályán soha nem játszottak együtt.';
  intro.replaceChildren();
  for(const text of [pa.name+' – '+pb.name,note,outcome]){
   const p=document.createElement('p');p.textContent=text;if(text===pa.name+' – '+pb.name)p.style.fontWeight='700';intro.append(p);
  }
  const p=document.createElement('p');p.className='caption';p.textContent='A kérdőíves kapcsolat nem bizonyítja a mérkőzésteljesítmény okát. Az alacsony közös játékidő és a posztok eltérései különösen óvatos értelmezést igényelnek.';intro.append(p);
 }
 const min=Math.max(0,Number(E('perfMin').value)||0)*60;
 const eligible=list.filter(p=>p.time>=min).sort((a,b)=>b.time-a.time||b.matches.size-a.matches.size||a.pa.name.localeCompare(b.pa.name,'hu'));
 E('perfShown').textContent=eligible.length+' pár · '+verified+' ellenőrzött mérkőzés';
 tbl.replaceChildren();
 for(const r of eligible.slice(0,120)){
  const v=votes(r.a,r.b),tr=document.createElement('tr');
  const cols=[r.pa.name+' · '+r.pb.name,minutes(r.time),r.matches.size,String(r.gf)+' / '+String(r.ga),(r.gf-r.ga>0?'+':'')+(r.gf-r.ga),String(v.ab)+' / '+String(v.ba)+(v.mutual?' ↔':'')];
  cols.forEach(val=>{const td=document.createElement('td');td.textContent=val;tr.append(td)});
  tr.className='clickable';tr.addEventListener('click',()=>{E('perfA').value=r.a;E('perfB').value=r.b;renderPerformance()});tbl.append(tr);
 }
 if(!eligible.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='A kiválasztott minimumidővel nincs igazolt páros együttállás.';tr.append(td);tbl.append(tr)}
}
function refresh(){
 if(!E('performanceView'))return;
 options();loadMatches();renderMapping();renderPerformance();
}
window.performancePanelRender=renderPerformance;
window.performancePanelRefresh=refresh;
E('perfReload').addEventListener('click',refresh);
E('globalTeam').addEventListener('change',refresh);
for(const id of ['perfA','perfB','perfCategory','perfMin'])E(id).addEventListener('change',renderPerformance);
E('perfExport').addEventListener('click',()=>{
 const rows=[['Páros','Együtt (másodperc)','Meccsek','Lőtt','Kapott','Gólkülönbség','Jelölés A→B','Jelölés B→A']];
 const min=Math.max(0,Number(E('perfMin').value)||0)*60;
 for(const r of computePairs().filter(r=>r.time>=min)){const v=votes(r.a,r.b);rows.push([r.pa.name+' · '+r.pb.name,r.time,r.matches.size,r.gf,r.ga,r.gf-r.ga,v.ab,v.ba])}
 const content='\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=url;a.download='KeziStat_FU16_FU18_kapcsolatok_teljesitmeny.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
})();