(function playerDataBoot(){
'use strict';
const STORE='kezistat_player_profiles_v1';
const norm=x=>String(x??'').trim().toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const positions=['','Kapus','Bal szél','Bal átlövő','Irányító','Jobb átlövő','Jobb szél','Beálló'];
const el=id=>document.getElementById(id);
const key=(age,team,player)=>norm(age)+'|'+norm(team)+'|'+norm(player);
const readAll=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(e){return {}}};
const writeAll=all=>{localStorage.setItem(STORE,JSON.stringify(all))};
const get=(age,team,player)=>readAll()[key(age,team,player)]||null;
function put(age,team,player,patch){
 const all=readAll(),k=key(age,team,player);
 all[k]={...(all[k]||{}),...patch,modifiedAt:new Date().toISOString()};
 writeAll(all);return all[k];
}
function latestTraining(profile,days=28){
 const now=Date.now(),low=now-days*86400000,items=(profile?.training||[]).filter(x=>{const t=Date.parse(x.date+'T12:00:00');return Number.isFinite(t)&&t>=low&&t<=now+86400000});
 const attended=items.filter(x=>x.status==='present'),absent=items.filter(x=>x.status==='absent'),excused=items.filter(x=>x.status==='excused');
 const rated=attended.filter(x=>(!x.condition||x.condition==='normal')&&Number.isInteger(Number(x.rating))&&Number(x.rating)>=1&&Number(x.rating)<=5);
 return {sessions:items.length,present:attended.length,absent:absent.length,excused:excused.length,rated:rated.length,mean:rated.length?rated.reduce((s,x)=>s+Number(x.rating),0)/rated.length:null};
}
const api={get,put,key,latestTraining};window.keziPlayerProfile=api;
const main=el('view-career-stats'),selectors=main?.querySelector('.career-stat-selectors');if(!selectors)return;
const style=document.createElement('style');
style.textContent=`
#playerDataPanel{border:1px solid #345162;background:#111e28;color:#e8f1f4;border-radius:14px;padding:18px;margin:10px auto 20px;max-width:1300px}
#playerDataPanel h3{color:#40dbad;margin:0 0 10px}
#playerDataPanel .pdGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:12px 0}
#playerDataPanel label{display:block;font-size:12px;color:#b7cad7;min-width:0}
#playerDataPanel input,#playerDataPanel select{display:block;width:100%;background:#1b2d38;color:#f8fbfc;border:1px solid #426073;padding:10px;border-radius:7px;margin-top:5px}
#playerDataPanel input[type="text"]{min-width:0}\n#playerDataPanel .pdRow{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0}
#playerDataPanel button,#playerDataToggle{padding:11px 15px;border-radius:9px;background:#16634e;color:white;border:1px solid #299c79;font-weight:700;cursor:pointer}
#playerDataPanel button.pdSecondary{background:transparent;border-color:#526778}
#playerDataPanel table{width:100%;border-collapse:collapse;font-size:13px}
#playerDataPanel td,#playerDataPanel th{border-bottom:1px solid #29404b;text-align:left;padding:8px}
#playerDataPanel .pdMessage,#playerDataPanel .pdNote{color:#9fb6c5;font-size:12px;line-height:1.55}
@media(max-width:900px){#playerDataPanel .pdGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:530px){#playerDataPanel .pdGrid{grid-template-columns:1fr}#playerDataPanel .pdGrid label[style*="grid-column"]{grid-column:auto!important}}
`;
document.head.append(style);
const toggle=document.createElement('button');toggle.type='button';toggle.id='playerDataToggle';toggle.textContent='Játékos adatok és edzések';toggle.style.cssText='display:block;margin:8px 0 16px';
selectors.after(toggle);
const box=document.createElement('section');box.id='playerDataPanel';box.hidden=true;
box.innerHTML=`
<h3>Játékosadatlap és edzésnapló</h3>
<p class="pdNote">A posztokat elmentjük, és az optimalizáló automatikusan felhasználja. A fizikai adatok tájékoztató jellegűek. Az adatok egyelőre csak ezen a böngészőn tárolódnak.</p>
<div id="pdWho" style="font-weight:700;margin:10px 0"></div>
<div class="pdGrid">
<label>Elsődleges poszt<select id="pdPrimary"></select></label>
<label>Másodlagos poszt<select id="pdSecondary"></select></label>
<label>Elsődleges védekező szerep<select id="pdDefense"><option value="">Nincs megadva</option><option value="1-es">1-es védő</option><option value="2-es">2-es védő</option><option value="3-as">3-as védő</option><option value="előretolt">Előretolt védő</option></select></label>
<label>Másodlagos védekező szerep<select id="pdDefenseSecondary"><option value="">Nincs megadva</option><option value="1-es">1-es védő</option><option value="2-es">2-es védő</option><option value="3-as">3-as védő</option><option value="előretolt">Előretolt védő</option></select></label>
<label>Domináns kéz<select id="pdHand"><option value="">Nincs megadva</option><option value="jobb">Jobb</option><option value="bal">Bal</option><option value="mindkettő">Mindkettő</option></select></label>
<label>Magasság (cm, opcionális)<input type="number" min="90" max="230" id="pdHeight" placeholder="pl. 184"></label>
<label>Testsúly (kg, opcionális)<input type="number" min="25" max="200" step="0.1" id="pdWeight" placeholder="pl. 77"></label>
<label>Játékra rendelkezésre állás<select id="pdAvailable"><option value="ready">Nevezhető</option><option value="limited">Korlátozottan nevezhető</option><option value="no">Nem nevezhető</option></select></label>
<label>7 méteres végrehajtó<select id="pdPenalty"><option value="">Nincs megadva</option><option value="yes">Igen</option><option value="no">Nem</option></select></label>
</div>
<div class="pdRow"><button id="pdSave" type="button">Játékosadatok mentése</button><span class="pdMessage" id="pdStatus"></span></div>
<hr style="border:0;border-top:1px solid #345162;margin:22px 0">
<h3>Edzésmunka – egyéni bejegyzés</h3>
<p class="pdNote">Az új, teljes csapatot érintő edzéseket a STAT → Havi jelenléti ívben rögzítsd. Itt a régebbi egyéni bejegyzések megtekinthetők és kiegészíthetők; a csapatedzésre felvitt jelenlétek csak a havi naptárból módosíthatók.</p>
<div class="pdGrid">
<label>Edzés dátuma<input type="date" id="pdTrainingDate"></label>
<label>Edzés típusa<select id="pdTrainingType"><option value="team">Csapatedzés</option><option value="strength">Erőnléti</option><option value="individual">Egyéni képzés</option><option value="video">Videó/taktikai</option></select></label>
<label>Részvétel<select id="pdTrainingStatus"><option value="present">Részt vett</option><option value="excused">Igazolt hiányzás</option><option value="absent">Hiányzott</option></select></label>
<label>Edzésminőség (1–5)<select id="pdTrainingRating"><option value="">Nincs értékelés</option><option value="1">1 – Gyenge</option><option value="2">2 – Fejlesztendő</option><option value="3">3 – Megfelelő</option><option value="4">4 – Jó</option><option value="5">5 – Kiemelkedő</option></select></label>
</div>
<div class="pdGrid">
<label>Körülmény<select id="pdTrainingCondition"><option value="normal">Normál részvétel</option><option value="sick">Betegen jelen volt</option><option value="injured">Sérülten jelen volt</option><option value="light">Könnyített edzést végzett</option><option value="rehab">Rehabilitációs feladatot végzett</option><option value="other">Egyéb</option></select></label>
<label style="grid-column:span 3">Megjegyzés (nem kötelező)<input type="text" id="pdTrainingNote" maxlength="240" placeholder="pl. beteg, de ott volt; térdfájdalom miatt könnyített gyakorlat"></label>
</div>
<div class="pdRow"><button id="pdTrainingAdd" type="button">Edzés rögzítése</button><span id="pdTrainingTotals" class="pdNote"></span></div>
<div style="overflow:auto"><table><thead><tr><th>Dátum</th><th>Típus</th><th>Részvétel</th><th>Minőség</th><th>Körülmény</th><th>Megjegyzés</th><th></th></tr></thead><tbody id="pdHistory"></tbody></table></div>
`;
toggle.after(box);
for(const id of ['pdPrimary','pdSecondary'])for(const pos of positions)el(id).add(new Option(pos||'Nincs megadva',pos));
el('pdTrainingDate').value=new Date().toLocaleDateString('en-CA');
let cur=null;
function selection(){
 const t=el('career-team-select')?.value,p=el('career-player-select')?.value;
 if(!t||!p||p==='__team__')return null;
 const label=decodeURIComponent(t),nameKey=decodeURIComponent(p),m=label.match(/^\[(?:F?U)?(16|18)\]\s*(.+)$/i);
 if(!m)return null;
 return {age:'FU'+m[1],team:m[2].trim(),player:nameKey};
}
function labelName(){const e=el('career-player-select'),option=e?.selectedOptions?.[0];return option?.textContent||e?.value||''}
function render(){
 cur=selection();const status=el('pdStatus');
 if(!cur){el('pdWho').textContent='Válassz ki egy FU16/FU18-as játékost a STAT legördülőiben.';el('pdSave').disabled=true;el('pdTrainingAdd').disabled=true;status.textContent='A korosztály és a csapat megjelölése szükséges.';return}
 el('pdSave').disabled=false;el('pdTrainingAdd').disabled=false;
 el('pdWho').textContent=cur.age+' · '+cur.team+' · '+labelName();
 const p=get(cur.age,cur.team,cur.player)||{};
 for(const [id,prop] of [['pdPrimary','primary'],['pdSecondary','secondary'],['pdDefense','defense'],['pdDefenseSecondary','defenseSecondary'],['pdHand','hand'],['pdHeight','height'],['pdWeight','weight'],['pdAvailable','availability'],['pdPenalty','penalty']])el(id).value=p[prop]??(prop==='availability'?'ready':'');
 const r=latestTraining(p),ratio=r.sessions?Math.round(r.present/r.sessions*100):null;
 el('pdTrainingTotals').textContent='Utolsó 28 nap (rögzített edzések): '+r.present+' jelenlét / '+r.sessions+' alkalom; '+r.excused+' igazolt hiányzás; minőségátlag: '+(r.mean==null?'–':r.mean.toFixed(2))+' / 5.'+(ratio===null?'':' Részvétel: '+ratio+'%.');
 const body=el('pdHistory');body.replaceChildren();
 const tNames={team:'Csapatedzés',strength:'Erőnléti',individual:'Egyéni',video:'Videó/taktikai',other:'Egyéb'},sNames={present:'Részt vett',absent:'Hiányzott',excused:'Igazolt'},cNames={normal:'Normál',sick:'Betegen jelen volt',injured:'Sérülten jelen volt',light:'Könnyített',rehab:'Rehabilitáció',other:'Egyéb'};
 for(const session of [...(p.training||[])].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,80)){
  const tr=document.createElement('tr');
  for(const val of [session.date,tNames[session.type]||session.type,sNames[session.status]||session.status,session.rating||'–',cNames[session.condition]||'–',session.note||'–']){const td=document.createElement('td');td.textContent=val;tr.append(td)}
  const td=document.createElement('td');
  const managed=!!session.sessionId;
  const edit=document.createElement('button');edit.type='button';edit.className='pdSecondary';edit.textContent=managed?'Havi jelenléti ívben':'Szerkesztés';edit.disabled=managed;
  edit.addEventListener('click',()=>{
   el('pdTrainingDate').value=session.date;el('pdTrainingType').value=session.type;
   el('pdTrainingStatus').value=session.status;el('pdTrainingRating').value=session.rating||'';
   el('pdTrainingCondition').value=session.condition||'normal';el('pdTrainingNote').value=session.note||'';
   el('pdTrainingRating').disabled=session.status!=='present';
   el('pdStatus').textContent='A fenti mezőkben módosíthatod, majd az Edzés rögzítése gombbal felülírhatod ezt a napot és edzéstípust.';
  });
  const btn=document.createElement('button');btn.type='button';btn.className='pdSecondary';btn.textContent='Törlés';btn.disabled=managed;
  btn.addEventListener('click',()=>{if(!cur)return;const fresh=get(cur.age,cur.team,cur.player)||{},training=(fresh.training||[]).filter(x=>!(x.date===session.date&&x.type===session.type));put(cur.age,cur.team,cur.player,{training});render()});
  td.append(edit,document.createTextNode(' '),btn);tr.append(td);body.append(tr);
 }
 status.textContent='Elmentve a böngésződben'+(p.modifiedAt?' · '+new Date(p.modifiedAt).toLocaleDateString('hu-HU'):'');
}
function save(){
 cur=selection();if(!cur)return;
 const n=(id,min,max)=>{const str=el(id).value;if(!str)return null;const v=Number(str);return Number.isFinite(v)&&v>=min&&v<=max?v:null};
 const height=n('pdHeight',90,230),weight=n('pdWeight',25,200);
 if((el('pdHeight').value&&height===null)||(el('pdWeight').value&&weight===null)){el('pdStatus').textContent='Ellenőrizd a magasságot és a testsúlyt.';return}
 put(cur.age,cur.team,cur.player,{primary:el('pdPrimary').value,secondary:el('pdSecondary').value,defense:el('pdDefense').value,defenseSecondary:el('pdDefenseSecondary').value,hand:el('pdHand').value,height,weight,availability:el('pdAvailable').value,penalty:el('pdPenalty').value});
 render();el('pdStatus').textContent='Játékosadatok mentve ezen a böngészőn.';
}
function addTraining(){
 cur=selection();if(!cur)return;
 const date=el('pdTrainingDate').value,type=el('pdTrainingType').value,status=el('pdTrainingStatus').value,rating=status==='present'?el('pdTrainingRating').value:'',condition=el('pdTrainingCondition').value,note=el('pdTrainingNote').value.trim().slice(0,240);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){el('pdStatus').textContent='Adj meg egy érvényes edzésdátumot.';return}
 if(date>new Date().toLocaleDateString('en-CA')){el('pdStatus').textContent='Jövőbeli edzést nem lehet megtartottként rögzíteni.';return}
 const p=get(cur.age,cur.team,cur.player)||{};
 if((p.training||[]).some(x=>x.sessionId&&x.date===date&&x.type===type)){el('pdStatus').textContent='Ezt az edzést a Havi jelenléti ívben módosíthatod.';return}
 const training=(p.training||[]).filter(x=>x.sessionId||!(x.date===date&&x.type===type));
 training.push({date,type,status,rating:rating?Number(rating):null,condition,note});
 put(cur.age,cur.team,cur.player,{training});render();el('pdTrainingCondition').value='normal';el('pdTrainingNote').value='';el('pdStatus').textContent='Edzésrészvétel és megjegyzés mentve.';
}
el('pdDefense').addEventListener('change',()=>{if(el('pdDefense').value===el('pdDefenseSecondary').value)el('pdDefenseSecondary').value='' });
el('pdSave').addEventListener('click',save);
el('pdTrainingAdd').addEventListener('click',addTraining);
el('pdTrainingStatus').addEventListener('change',()=>{if(el('pdTrainingStatus').value!=='present')el('pdTrainingRating').value='';el('pdTrainingRating').disabled=el('pdTrainingStatus').value!=='present'});
toggle.addEventListener('click',()=>{box.hidden=!box.hidden;if(!box.hidden)render()});
for(const id of ['career-team-select','career-player-select'])el(id)?.addEventListener('change',()=>{if(!box.hidden)queueMicrotask(render)});
})();