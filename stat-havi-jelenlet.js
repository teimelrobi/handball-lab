(function monthlyAttendanceBoot(){
'use strict';
const SESSIONS_KEY='kezistat_training_sessions_v1',PROFILES_KEY='kezistat_player_profiles_v1';
const $=id=>document.getElementById(id),norm=s=>String(s??'').trim().toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const key=(age,team)=>norm(age)+'|'+norm(team),personKey=(age,team,name)=>key(age,team)+'|'+norm(name);
const months=['augusztus','szeptember','október','november','december','január','február','március','április','május','június','július'];
const types={ball:'Labdás',mixed:'Labdás + erőnlét (60+60 perc)',strength:'Erőnlét',run:'Futóedzés',match:'Edzőmérkőzés',official:'Mérkőzés',other:'Egyéb'},typeToProfile={ball:'team',mixed:'team',strength:'strength',run:'strength',match:'match',official:'match',other:'other'};

// A FU16 2026. augusztusi időpontjai a felhasználó által küldött naptárképről.
// Kizárólag időpontok, típusok és helyszínek; nincs játékosjelenlét.
const AUG26_PLACES={
 B:'Budaörs Városi Uszoda, Sportcsarnok és Strand',
 J:'Bleyer Jakab Általános Iskola, Budaörs, Iskola tér 1.',
 T:'Törökbálinti Aréna, Torbágy u. 1.',
 H:'Herman Ottó Általános Iskola futópályája',
 P:'Szeged Pick Akadémiai Csarnok'
};
const AUG26_TIMES=[
 [3,'10:00','11:30','ball','B'],[3,'16:30','18:00','ball','J'],
 [4,'08:00','09:00','run','H'],[4,'15:00','16:00','ball','B'],
 [5,'13:30','15:00','strength','T'],
 [6,'10:30','12:30','ball','B'],[6,'15:00','17:00','ball','B'],
 [7,'10:00','12:00','ball','J'],
 [10,'10:00','11:30','ball','B'],[10,'16:30','18:00','ball','J'],
 [11,'12:00','13:30','ball','J'],[11,'19:30','21:00','ball','B'],
 [12,'12:00','13:30','strength','T'],[13,'15:00','17:00','ball','B'],
 [17,'10:00','11:30','ball','B'],[17,'15:00','16:30','ball','J'],
 [18,'07:30','09:00','ball','B'],[18,'15:00','16:30','ball','J'],
 [19,'10:30','12:00','strength','T'],[19,'18:30','20:00','ball','B'],
 [20,'15:45','17:15','match','P'],[21,'10:00','11:30','match','P'],
 [24,'09:00','10:30','ball','B'],[24,'15:00','16:30','strength','T'],
 [25,'10:30','12:00','ball','J'],
 [26,'09:00','10:30','ball','J'],[26,'15:00','16:30','strength','T'],
 [27,'10:30','12:00','ball','J'],[28,'17:30','19:00','ball','J']
];
function timeMinutes(hm){if(!/^\d{2}:\d{2}$/.test(String(hm)))return null;const [h,m]=hm.split(':').map(Number);return h<24&&m<60?h*60+m:null}
function plannedDuration(start,end){const a=timeMinutes(start),b=timeMinutes(end);return a==null||b==null||b<=a?null:b-a}
const AUG26=AUG26_TIMES.map(([day,start,end,kind,place])=>({
 id:'fu16-2026-08-'+String(day).padStart(2,'0')+'-'+start.replace(':',''),
 date:'2026-08-'+String(day).padStart(2,'0'),
 start,end,duration:plannedDuration(start,end),kind,place:AUG26_PLACES[place],source:'FU16 2026. augusztusi naptárkép'
}));


/* FU16 – 2026. szeptember, a felhasználó által beküldött naptárképről.
   A keddi 19:00–21:00 edzések egyetlen jelenléti eseményt jelentenek,
   belső 60 perc labdás és 60 perc erőnléti bontással. */
const SEP26_PLACES={
 S:'Budaörs, 1. sz. Általános Iskola',
 B:'Budaörs Városi Uszoda, Sportcsarnok és Strand',
 J:'Bleyer Jakab Általános Iskola, Budaörs, Iskola tér 1.',
 V:'Budapest SPORT11'
};
const SEP26_TIMES=[
 [2,'19:00','20:30','ball','S'],[3,'19:00','20:30','ball','S'],
 [7,'18:00','19:30','ball','B'],[8,'19:00','21:00','mixed','B'],
 [9,'17:00','18:30','ball','J'],[10,'17:00','18:30','ball','V'],[11,'17:00','18:45','ball','V'],
 [14,'18:00','19:30','ball','B'],[15,'19:00','21:00','mixed','B'],
 [16,'17:00','18:30','ball','J'],[17,'17:00','18:30','ball','V'],[18,'17:00','18:45','ball','V'],
 [21,'18:00','19:30','ball','B'],[22,'19:00','21:00','mixed','B'],
 [23,'17:00','18:30','ball','B'],
 [28,'18:00','19:30','ball','B'],[29,'19:00','21:00','mixed','B'],
 [30,'17:00','18:30','ball','J']
];
const SEP26=SEP26_TIMES.map(([day,start,end,kind,place])=>({
 id:'fu16-2026-09-'+String(day).padStart(2,'0')+'-'+start.replace(':',''),
 date:'2026-09-'+String(day).padStart(2,'0'),start,end,
 duration:plannedDuration(start,end),kind,place:SEP26_PLACES[place],
 ...(kind==='mixed'?{components:[{kind:'ball',duration:60},{kind:'strength',duration:60}]}:{}),
 source:'FU16 2026. szeptemberi naptárkép'
}));


/* FU16 – 2026. október: edzések a felhasználó által küldött naptárképből.
   A kétórás keddi 19–21 órai alkalmak egy jelenléti esemény, 60+60 perces
   labdás/erőnléti bontással. A 10.08-i piros szín jelentése nincs igazolva. */
const OCT26_PLACES={
 B:'Budaörs Városi Uszoda, Sportcsarnok és Strand',
 J:'Bleyer Jakab Általános Iskola, Budaörs, Iskola tér 1.',
 V:'Budapest SPORT11'
};
const OCT26_TIMES=[
 [1,'17:00','18:30','ball','V'],[2,'18:30','20:00','ball','V'],
 [5,'18:00','19:30','ball','B'],[6,'19:00','21:00','mixed','B'],
 [7,'17:00','18:30','ball','J'],[8,'16:30','17:30','ball','V','red'],
 [12,'18:00','19:30','ball','B'],[13,'19:00','21:00','mixed','B'],
 [14,'17:00','18:30','ball','J'],[15,'18:30','20:00','ball','J'],
 [16,'18:30','19:30','ball','V'],
 [19,'18:00','19:30','ball','B'],[20,'19:00','21:00','mixed','B'],
 [21,'17:00','18:30','ball','J'],[23,'09:00','10:00','ball','B'],
 [27,'19:00','20:30','ball','B'],
 [28,'09:00','10:30','ball','B'],[28,'17:30','19:00','ball','B'],
 [29,'15:00','16:30','ball','V'],[30,'18:30','20:30','ball','V']
];
const OCT26=OCT26_TIMES.map(([day,start,end,kind,place,flag])=>({
 id:'fu16-2026-10-'+String(day).padStart(2,'0')+'-'+start.replace(':',''),
 date:'2026-10-'+String(day).padStart(2,'0'),start,end,
 duration:plannedDuration(start,end),kind,place:OCT26_PLACES[place],
 ...(kind==='mixed'?{components:[{kind:'ball',duration:60},{kind:'strength',duration:60}]}:{}),
 ...(flag==='red'?{sourceFlag:'red',sourceNote:'Piros jelölés az eredeti októberi naptárban – jelentése nem ismert'}:{}),
 source:'FU16 2026. októberi naptárkép'
}));


/* FU16 – 2026. november a felhasználó által küldött naptárképről.
   A piros szín jelentése ismeretlen; a dátumokat nem tekintjük automatikusan teljesítettnek. */
const NOV26_PLACES={
 B:'Budaörs Városi Uszoda, Sportcsarnok és Strand',
 J:'Bleyer Jakab Általános Iskola, Budaörs, Iskola tér 1.',
 V:'Budapest SPORT11',
 H:'Budaörsi 1. Számú Általános Iskola, Budaörs, Hársfa utca 29.'
};
const NOV26_TIMES=[
 [3,'12:00','13:30','ball','B'],[3,'19:00','20:00','ball','B'],
 [4,'17:00','18:30','ball','J'],[5,'16:30','18:00','ball','V'],
 [6,'18:30','20:00','ball','J'],
 [9,'18:30','20:00','ball','J'],[10,'19:00','20:30','ball','B'],
 [11,'19:00','20:30','ball','H'],[12,'16:30','18:00','ball','V','red'],
 [13,'18:30','20:00','ball','V'],
 [16,'09:30','10:30','ball','B'],[16,'18:00','19:30','ball','B'],
 [17,'19:00','21:00','mixed','B'],[18,'19:00','20:30','ball','J'],
 [19,'16:30','18:00','ball','V'],
 [23,'18:00','19:30','ball','B','red'],[24,'19:00','21:00','mixed','B','red'],
 [25,'19:30','21:00','ball','B','red'],[26,'16:30','18:00','ball','V','red'],
 [30,'18:00','19:30','ball','B','red']
];
const NOV26=NOV26_TIMES.map(([day,start,end,kind,place,flag])=>({
 id:'fu16-2026-11-'+String(day).padStart(2,'0')+'-'+start.replace(':',''),
 date:'2026-11-'+String(day).padStart(2,'0'),start,end,duration:plannedDuration(start,end),
 kind,place:NOV26_PLACES[place],
 ...(kind==='mixed'?{components:[{kind:'ball',duration:60},{kind:'strength',duration:60}]}:{}),
 ...(flag==='red'?{sourceFlag:'red',sourceNote:'Piros jelölés a novemberi eredeti naptárban – jelentése nem ismert'}:{}),
 source:'FU16 2026. novemberi naptárkép'
}));

const statusLabels={present:'Jelen',absent:'Hiányzott',excused:'Igazolt hiányzás'};
const conditionLabels={normal:'Normál',sick:'Betegen jelen',injured:'Sérülten jelen',light:'Könnyített',rehab:'Rehabilitáció',other:'Egyéb'};
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s);
const fetchObj=name=>{try{const x=JSON.parse(localStorage.getItem(name)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(e){return {}}};
const writeObj=(name,obj)=>localStorage.setItem(name,JSON.stringify(obj));
const elem=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const button=(label,fn,cls)=>{const e=elem('button',cls||'',label);e.type='button';e.addEventListener('click',fn);return e};
const wrap=(tag,...children)=>{const e=elem(tag);e.append(...children);return e};
const field=(name,control)=>{const e=elem('label','amField');e.append(elem('span','',name),control);return e};
function choose(options,selected){
 const sel=elem('select');
 for(const [val,label] of options)sel.add(new Option(label,val));
 sel.value=selected===undefined?(options[0]?.[0]||''):(selected??'');
 return sel;
}
const main=$('view-career-stats'),pivot=$('playerDataToggle');
if(!main||!pivot)return;
const css=elem('style');css.textContent=`
#amPanel{max-width:1400px;margin:12px auto 28px;padding:18px;border:1px solid #3b586a;border-radius:14px;background:#12212c;color:#f0f6f8;width:100%}
#amPanel[hidden]{display:none}
#amPanel h3{font-size:19px;margin:0 0 8px;color:#45d7a8}
#amPanel .amSmall{font-size:12px;color:#adbfce;line-height:1.5}
#amPanel button,#amButton{border-radius:8px;border:1px solid #446b7d;background:#1a3949;color:#e8f3f8;padding:9px 12px;font-weight:650;cursor:pointer}
#amButton{background:#16634e;border-color:#2a9978;margin:8px 0 18px;display:block}
#amPanel button:hover,#amButton:hover{border-color:#47d8b1}
#amPanel select,#amPanel input{background:#1a303d;border:1px solid #456170;color:white;padding:9px;border-radius:7px;max-width:100%}
#amPanel input[type=number]{width:95px}
#amPanel input[type=text]{width:100%;min-width:150px}
#amPanel .amTools{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:15px 0}
#amPanel .amField{display:flex;flex-direction:column;gap:5px;min-width:120px;font-size:12px;color:#bfcfd8}
#amPanel .amField select{min-width:145px}
#amPanel .amMonth{margin:8px 0;border:1px solid #355061;border-radius:10px;background:#182c38;overflow:hidden}
#amPanel .amMonth summary{cursor:pointer;padding:14px 17px;font-weight:730;background:#223d4d;display:flex;justify-content:space-between;gap:12px}
#amPanel .amMonth summary::marker{color:#48caa7}
#amPanel .amMonth summary .amSmall{margin-left:auto;text-align:right}
#amPanel .amDays{padding:9px}
#amPanel .amDay{display:grid;grid-template-columns:100px minmax(0,1fr) auto;align-items:start;gap:12px;padding:9px 10px;border-bottom:1px solid #284250}
#amPanel .amDay:last-child{border-bottom:0}
#amPanel .amDate{font-size:13px;font-weight:700;white-space:nowrap;padding-top:7px}
#amPanel .amDaySessions{display:flex;flex-wrap:wrap;gap:7px;align-items:flex-start}
#amPanel button.amSession{background:#245e57;border-color:#3b8a80}
#amPanel button.amAdd{font-size:12px;padding:7px 10px;background:transparent;white-space:nowrap}
#amPanel .amEditor{grid-column:1/-1;background:#0c1d27;border:1px solid #385c66;padding:14px;border-radius:9px}
#amPanel .amEditor .amTools{margin:10px 0}
#amPanel .amEditor h4{margin:0 0 10px;color:#57d3b5}
#amPanel .amTableWrap{width:100%;overflow-x:auto;margin-top:12px}
#amPanel table{width:100%;border-collapse:collapse;font-size:13px}
#amPanel th,#amPanel td{text-align:left;padding:7px;border-bottom:1px solid #294753;vertical-align:middle}
#amPanel td .amSmall{font-size:11px}
#amPanel .amAttendance th:first-child,#amPanel .amAttendance td:first-child{min-width:155px}
#amPanel .amAttendance select{min-width:112px}
#amPanel .amAttendance input[type=text]{min-width:150px;max-width:300px}
#amPanel .amInfo{padding:10px 13px;background:#193b43;border-radius:9px;margin-top:12px;line-height:1.5;color:#c1e9df;font-size:12px}
#amPanel button.amDanger{border-color:#a1595d;color:#ffd9d8;background:#462a35}
#amPanel .amHighlight{color:#4de3b7}
@media(max-width:780px){#amPanel .amDay{grid-template-columns:85px minmax(0,1fr)}#amPanel .amDay>.amAdd{grid-column:2;justify-self:start}#amPanel .amMonth summary{flex-wrap:wrap}#amPanel .amMonth summary .amSmall{margin-left:0}}
`;
document.head.append(css);
const toggle=button('Havi jelenléti ív',()=>{panel.hidden=!panel.hidden;if(!panel.hidden){const other=$('playerDataPanel');if(other)other.hidden=true;load()}},'');
toggle.id='amButton';pivot.after(toggle);
pivot.addEventListener('click',()=>{panel.hidden=true});
const panel=elem('section');panel.id='amPanel';panel.hidden=true;
toggle.after(panel);
const h=elem('h3','','Edzésnaptár és csapatszintű jelenléti ív');
const desc=elem('p','amSmall','A szezon augusztus 1-jén kezdődik és július 31-én végződik. A hónapok lenyithatók, minden napra külön edzés rögzíthető. Alapból senki nem számít hiányzónak: a részvételt kifejezetten jelölni kell.');
const tools=elem('div','amTools');
const season=choose([]),context=elem('span','amSmall',''),summary=elem('div','amInfo','');
tools.append(field('Évad (augusztus–július)',season),context,button('Frissítés',()=>load()));
const holder=elem('div','');
panel.append(h,desc,tools,summary,holder);
let state={age:'',team:'',roster:[],sessions:[],opened:new Set(),editor:'',message:'',seasonStart:0};
const today=new Date(),startYear=today.getMonth()>=7?today.getFullYear():today.getFullYear()-1;
for(let y=startYear-2;y<=startYear+1;y++)season.add(new Option(y+'/'+String((y+1)%100).padStart(2,'0'),String(y)));
season.value=String(startYear);
season.addEventListener('change',()=>{state.opened.clear();state.editor='';render()});
function current(){
 const sel=$('career-team-select'),raw=sel?.value?decodeURIComponent(sel.value):'',m=raw.match(/^\[(?:F?U)?(16|18)\]\s*(.+)$/i);
 return m?{age:'FU'+m[1],team:m[2].trim(),label:raw}:null;
}
function rosterFor(ctx){
 try{
  const fn=window.careerPlayersForTeam;
  if(typeof fn==='function'){
   const arr=fn(ctx.label);
   if(Array.isArray(arr)&&arr.length)return arr.filter(p=>p.name).map(p=>({name:String(p.name),key:String(p.key||p.name),isGk:!!p.isGk})).sort((a,b)=>a.name.localeCompare(b.name,'hu'));
  }
 }catch(e){}
 const d=fetchObj('handball_db'),all=new Map();
 for(const t of Object.values(d.teams||{})){
  if(norm(t.name)!==norm(ctx.team))continue;
  const a=String(t.ageGroup||'').includes('18')?'FU18':String(t.ageGroup||'').includes('16')?'FU16':'';
  if(a!==ctx.age)continue;
  for(const p of t.players||[])if(p.name)all.set(norm(p.name),{name:p.name,key:p.name,isGk:!!p.isGk});
 }
 return [...all.values()].sort((a,b)=>a.name.localeCompare(b.name,'hu'));
}

// Idempotens import. Meglévő edzést és a hozzá tartozó jelenlétet soha nem cserélünk le.
function preloadAugust26(){
 if(state.age!=='FU16'||!norm(state.team).includes('budaifarkasok'))return;
 const sessions=state.sessions.map(x=>({...x})),claimed=new Set();let changed=false;
 for(const entry of AUG26){
  const found=sessions.find(x=>{
   if(x.date!==entry.date||claimed.has(x.id))return false;
   if(x.id===entry.id)return true;
   if(x.start)return x.start===entry.start;
   return x.kind===entry.kind&&Number(x.duration)===entry.duration;
  });
  if(found){
   claimed.add(found.id);
   for(const field of ['start','end','place'])if(!found[field]){found[field]=entry[field];changed=true}
  }else{
   sessions.push({...entry});claimed.add(entry.id);changed=true;
  }
 }
 if(changed)storeSessions(sessions);
}


function preloadSeptember26(){
 if(state.age!=='FU16'||!norm(state.team).includes('budaifarkasok'))return;
 const sessions=state.sessions.map(x=>({...x})),claimed=new Set();let changed=false;
 for(const entry of SEP26){
  const found=sessions.find(x=>{
   if(x.date!==entry.date||claimed.has(x.id))return false;
   if(x.id===entry.id)return true;
   if(x.start)return x.start===entry.start;
   return x.kind===entry.kind&&Number(x.duration)===entry.duration;
  });
  if(found){
   claimed.add(found.id);
   for(const prop of ['start','end','place','components'])if(!found[prop]&&entry[prop]){found[prop]=entry[prop];changed=true}
  }else{sessions.push({...entry});claimed.add(entry.id);changed=true}
 }
 if(changed)storeSessions(sessions);
}

function preloadOctober26(){
 if(state.age!=='FU16'||!norm(state.team).includes('budaifarkasok'))return;
 const sessions=state.sessions.map(x=>({...x})),claimed=new Set();let changed=false;
 for(const entry of OCT26){
  const found=sessions.find(x=>{
   if(x.date!==entry.date||claimed.has(x.id))return false;
   if(x.id===entry.id)return true;
   if(x.start)return x.start===entry.start;
   return x.kind===entry.kind&&Number(x.duration)===entry.duration;
  });
  if(found){
   claimed.add(found.id);
   for(const field of ['start','end','place','components','sourceFlag','sourceNote']){
    if(!found[field]&&entry[field]){found[field]=entry[field];changed=true}
   }
  }else{sessions.push({...entry});claimed.add(entry.id);changed=true}
 }
 if(changed)storeSessions(sessions);
}


function preloadNovember26(){
 if(state.age!=='FU16'||!norm(state.team).includes('budaifarkasok'))return;
 const sessions=state.sessions.map(x=>({...x})),claimed=new Set();let changed=false;
 for(const entry of NOV26){
  const found=sessions.find(x=>{
   if(x.date!==entry.date||claimed.has(x.id))return false;
   if(x.id===entry.id)return true;
   if(x.start)return x.start===entry.start;
   return x.kind===entry.kind&&Number(x.duration)===entry.duration;
  });
  if(found){
   claimed.add(found.id);
   for(const field of ['start','end','place','components','sourceFlag','sourceNote']){
    if(!found[field]&&entry[field]){found[field]=entry[field];changed=true}
   }
  }else{sessions.push({...entry});claimed.add(entry.id);changed=true}
 }
 if(changed)storeSessions(sessions);
}

function normalizedMatchDate(raw){
 const m=String(raw||'').match(/^(20\d{2})[-./](\d{1,2})[-./](\d{1,2})(?:\s|$)/);
 if(!m)return '';
 const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),actual=new Date(y,mo-1,d);
 if(actual.getFullYear()!==y||actual.getMonth()!==mo-1||actual.getDate()!==d)return '';
 return iso(y,mo,d);
}
function matchClock(raw){
 const match=String(raw||'').match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
 return match?String(match[1]).padStart(2,'0')+':'+match[2]:'';
}
function matchForTeam(m,db){
 const own=norm(state.team);
 for(const side of ['home','away']){
  const other=side==='home'?'away':'home';
  const teamName=norm(m[side+'Name']||db.teams?.[m[side+'TeamId']]?.name);
  if(!teamName||!(teamName===own||teamName.startsWith(own)))continue;
  const rawAge=String(m[side+'AgeGroup']||db.teams?.[m[side+'TeamId']]?.ageGroup||'').toUpperCase();
  if(rawAge){
   if(rawAge.includes('18')&&state.age==='FU16'||rawAge.includes('16')&&state.age==='FU18')continue;
   if(rawAge.includes(state.age.slice(-2)))return {side,other};
  }
  // Korosztály nélkül kizárólag a név szerinti meccskeret alapján kapcsoljuk.
  const roster=new Set((m[side+'Roster']||[]).map(p=>norm(p.name)));
  const ownPlayers=state.roster.filter(p=>roster.has(norm(p.name))).length;
  if(ownPlayers>=3)return {side,other};
 }
 return null;
}
function preloadAutumnMatches(){
 if(state.age!=='FU16'||!norm(state.team).includes('budaifarkasok'))return;
 const db=fetchObj('handball_db'),sessions=state.sessions.map(x=>({...x}));let changed=false;
 for(const m of db.matches||[]){
  const date=normalizedMatchDate(m.date);
  if(!/^2026-(?:08|09|10|11)-/.test(date))continue;
  const teamInfo=matchForTeam(m,db);if(!teamInfo)continue;
  const {side,other}=teamInfo,opponent=String(m[other+'Name']||'Ellenfél');
  const hasScore=m.homeScore!==undefined&&m.homeScore!==''&&m.awayScore!==undefined&&m.awayScore!=='';
  // Archív / befejezett mérkőzés, nem pusztán beállított leendő találkozó.
  if(!(m.events?.length>0||hasScore||m.locked===true))continue;
  const matchId=String(m.id||date+'|'+opponent);
  const id='kezi-match-'+matchId.replace(/[^a-zA-Z0-9_-]/g,'_');
  const friendlyOfDay=sessions.filter(x=>x.date===date&&x.kind==='match'&&!x.matchId);
  const exists=sessions.find(x=>x.matchId===matchId||x.id===id||
    (x.kind==='official'&&x.date===date&&norm(x.opponent)===norm(opponent)))||
    (friendlyOfDay.length===1?friendlyOfDay[0]:null);
  const kickoff=matchClock(m.kickoff||m.kickoffTime||m.matchTime||m.startTime||m.time||'');
  const length=Number(m.matchEndAbs);
  const duration=Number.isFinite(length)&&length>=1200&&length<=5400?Math.round(length/60):0;
  const score=hasScore?String(m.homeScore)+'–'+String(m.awayScore):'';
  const entry={id,matchId,date,start:kickoff,end:'',duration,kind:'official',
   opponent,score,place:String(m.location||'').trim(),source:'KéziStat lezárt / archív mérkőzés'};
  if(exists){
   for(const p of ['matchId','opponent','score','place','start'])if(!exists[p]&&entry[p]){exists[p]=entry[p];changed=true}
  }else{sessions.push(entry);changed=true}
 }
 if(changed)storeSessions(sessions);
}


/* Mérkőzés-részvétel csak az adott archivált mérkőzés tényleges,
   legfeljebb 16 főből álló nevezett keretéből. Nincs negatív jelölés a kimaradóknál. */
function autofillMatchAttendance(){
 if(state.age!=='FU16'||!norm(state.team).includes('budaifarkasok'))return;
 const db=fetchObj('handball_db'),matches=Array.isArray(db.matches)?db.matches:[];
 const sessions=state.sessions.filter(x=>x.matchId&&(x.kind==='official'||x.kind==='match'));
 if(!sessions.length||!state.roster.length)return;
 const profiles=fetchObj(PROFILES_KEY),byName=new Map(state.roster.map(p=>[norm(p.name),p]));
 let changed=false;
 for(const session of sessions){
  const match=matches.find(x=>String(x.id)===String(session.matchId));
  if(!match)continue;
  const side=matchForTeam(match,db)?.side;
  if(!side)continue;
  const named=match[side+'Roster'];
  // A teljes klubkeretet tartalmazó (>16) import nem tekinthető mérkőzésnevezésnek.
  if(!Array.isArray(named)||!named.length||named.length>16)continue;
  const identifiers=new Set(named.map(p=>norm(p?.name)).filter(Boolean));
  if(identifiers.size!==named.length)continue;
  for(const name of identifiers){
   const athlete=byName.get(name);if(!athlete)continue;
   const k=personKey(state.age,state.team,athlete.key),profile=profiles[k]||{};
   if((profile.training||[]).some(x=>x.sessionId===session.id))continue;
   const row={sessionId:session.id,date:session.date,type:'match',duration:session.duration||0,
    status:'present',rating:null,condition:'normal',note:'Nevezett játékos a mérkőzés keretében',
    attendanceSource:'match-roster'};
   profiles[k]={...profile,training:[...(profile.training||[]),row],modifiedAt:new Date().toISOString()};
   changed=true;
  }
 }
 if(changed)writeObj(PROFILES_KEY,profiles);
}

function load(){
 const ctx=current();state.editor='';
 if(!ctx){state={...state,age:'',team:'',roster:[],sessions:[]};render();return}
 const changed=ctx.age!==state.age||ctx.team!==state.team;
 if(changed)state.opened.clear();
 state.age=ctx.age;state.team=ctx.team;state.roster=rosterFor(ctx);
 const all=fetchObj(SESSIONS_KEY);state.sessions=Array.isArray(all[key(ctx.age,ctx.team)])?all[key(ctx.age,ctx.team)].slice():[];
 preloadAugust26();
 preloadSeptember26();
 preloadOctober26();
 preloadNovember26();
 preloadAutumnMatches();
 autofillMatchAttendance();
 render();
}
function storeSessions(sessions){
 const all=fetchObj(SESSIONS_KEY);
 all[key(state.age,state.team)]=sessions.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id)));
 writeObj(SESSIONS_KEY,all);state.sessions=all[key(state.age,state.team)];
}
function monthYear(i){return Number(season.value)+(i>=5?1:0)}
function monthNum(i){return (i+7)%12+1}
function iso(y,m,d){return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
function sessionStatus(id){
 const all=fetchObj(PROFILES_KEY);let pres=0,abs=0,exc=0;
 for(const p of state.roster){
  const row=all[personKey(state.age,state.team,p.key)]?.training?.find(x=>x.sessionId===id);
  if(row?.status==='present')pres++;else if(row?.status==='absent')abs++;else if(row?.status==='excused')exc++;
 }
 return {present:pres,absent:abs,excused:exc,unmarked:state.roster.length-pres-abs-exc};
}
function render(){
 holder.replaceChildren();
 context.textContent=state.age?state.age+' · '+state.team+' · '+state.roster.length+' játékos':'Válassz a STAT menüpont tetején FU16/FU18-as csapatot.';
 if(!state.age){summary.textContent='Az edzésnaptár a STAT csapatválasztóban kijelölt FU16-os vagy FU18-as csapathoz tartozik.';return}
 const y=Number(season.value),seasonSessions=state.sessions.filter(s=>s.date>=iso(y,8,1)&&s.date<=iso(y+1,7,31));
 const hours=seasonSessions.reduce((a,b)=>a+(Number(b.duration)||0),0)/60;
 const septMatches=state.sessions.filter(x=>x.kind==='official'&&x.date.startsWith('2026-09-')).length;
 const octMatches=state.sessions.filter(x=>x.kind==='official'&&x.date.startsWith('2026-10-')).length;
 const novMatches=state.sessions.filter(x=>x.kind==='official'&&x.date.startsWith('2026-11-')).length;
 summary.textContent=y+'/'+String((y+1)%100).padStart(2,'0')+' évad · '+seasonSessions.length+' alkalom · '+hours.toLocaleString('hu-HU',{maximumFractionDigits:1})+' óra tervezett/rögzített időtartam. Az ismeretlen jelenlét nem számít hiányzásnak.'+(y===2026&&state.age==='FU16'?' · Archív mérkőzések: szeptember '+septMatches+', október '+octMatches+', november '+novMatches+'.':'');
 if(!state.roster.length){holder.append(elem('p','amSmall','A csapat kerete üres; előbb vidd fel a játékosokat a Csapatok kezelése részben.'))}
 for(let i=0;i<12;i++){
  const y=monthYear(i),m=monthNum(i),monthKey=iso(y,m,1),ss=seasonSessions.filter(x=>x.date.startsWith(monthKey.slice(0,7)));
  const details=elem('details','amMonth');
  if(state.opened.size===0){if(y===today.getFullYear()&&m===today.getMonth()+1)state.opened.add(monthKey)}
  details.open=state.opened.has(monthKey);
  const summ=elem('summary');
  summ.append(elem('span','',months[i][0].toUpperCase()+months[i].slice(1)+' '+y),elem('span','amSmall',ss.length+' alkalom · '+(ss.reduce((a,b)=>a+(Number(b.duration)||0),0)/60).toLocaleString('hu-HU',{maximumFractionDigits:1})+' óra'));
  details.append(summ);
  details.addEventListener('toggle',()=>{if(details.open)state.opened.add(monthKey);else state.opened.delete(monthKey)});
  const days=elem('div','amDays');
  const last=new Date(y,m,0).getDate();
  for(let d=1;d<=last;d++){
   const date=iso(y,m,d),weekday=['V','H','K','Sze','Cs','P','Szo'][new Date(y,m-1,d).getDay()];
   const row=elem('div','amDay'),label=elem('div','amDate',String(d).padStart(2,'0')+'. '+weekday);
   const cards=elem('div','amDaySessions');
   for(const s of ss.filter(x=>x.date===date)){
    const counts=sessionStatus(s.id),clock=s.start?(s.end?s.start+'–'+s.end+' · ':s.start+' · '):'',venue=s.place?' · '+s.place:'',opp=s.opponent?' · '+s.opponent:'',score=s.score?' · '+s.score:'',durationText=s.duration>0?s.duration+' perc':'időtartam nem rögzített',sourceFlag=s.sourceFlag==='red'?' · ⚠ Eredeti naptárban piros jelölés':'',text=clock+(types[s.kind]||'Edzés')+' · '+durationText+opp+score+venue+sourceFlag+' · '+counts.present+' jelen / '+counts.absent+' hiányzik';
    cards.append(button(text,()=>{state.editor=state.editor===s.id?'':s.id;render()},'amSession'));
   }
   const add=button('+ Edzés',()=>{state.editor='new|'+date;state.opened.add(monthKey);render()},'amAdd');
   row.append(label,cards,add);
   if(state.editor==='new|'+date)row.append(newEditor(date));
   for(const s of ss.filter(x=>x.date===date))if(state.editor===s.id)row.append(attendanceEditor(s));
   days.append(row);
  }
  details.append(days);holder.append(details);
 }
}
function newEditor(date){
 const box=elem('div','amEditor'),heading=elem('h4','','Új edzés · '+date),controls=elem('div','amTools');
 const type=choose(Object.entries(types)),duration=elem('input');duration.type='number';duration.min='15';duration.max='360';duration.step='5';duration.value='90';
 const start=elem('input'),end=elem('input'),place=elem('input');start.type='time';end.type='time';place.type='text';place.maxLength=160;place.placeholder='Helyszín (nem kötelező)';
 controls.append(field('Edzés típusa',type),field('Kezdés',start),field('Befejezés',end),field('Időtartam (perc)',duration),field('Helyszín',place));
 box.append(heading,controls,elem('p','amSmall','A felvitt edzés a csapat teljes kereténél megjelenik, de az ismeretlen jelenléteket külön kell jelölni.'));
 const actions=elem('div','amTools');
 actions.append(button('Edzés létrehozása',()=>{
  const clock=(start.value||end.value)?plannedDuration(start.value,end.value):null;
  if((start.value||end.value)&&clock===null){message('A kezdési és befejezési idő legyen érvényes és teljes.');return}
  const minutes=clock??Number(duration.value);
  if(!Number.isInteger(minutes)||minutes<15||minutes>360){message('Az edzés időtartama 15–360 perc lehet.');return}
  const id='s'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
  const entry={id,date,kind:type.value,duration:minutes,start:start.value,end:end.value,place:place.value.trim().slice(0,160),components:type.value==='mixed'?[{kind:'ball',duration:minutes/2},{kind:'strength',duration:minutes/2}]:null};
  try{storeSessions([...state.sessions,entry]);state.editor=id;render()}catch(e){message('Mentési hiba: '+e.message)}
 }),button('Mégse',()=>{state.editor='';render()},'amAdd'));
 box.append(actions);return box;
}
function message(text){const e=elem('p','amInfo',text);const existing=panel.querySelector('.amMessage');if(existing)existing.remove();e.classList.add('amMessage');summary.after(e)}
function attendanceEditor(session){
 const box=elem('div','amEditor');const title=elem('h4','',session.date+' · '+(session.start?(session.end?session.start+'–'+session.end:session.start)+' · ':'')+(types[session.kind]||'Edzés')+' · '+(session.duration||'ismeretlen')+' perc'+(session.opponent?' · '+session.opponent:'')+(session.score?' · '+session.score:'')+(session.place?' · '+session.place:''));
 const controls=elem('div','amTools');
 const category=choose(Object.entries(types),session.kind),duration=elem('input'),start=elem('input'),end=elem('input'),place=elem('input');
 duration.type='number';duration.min='15';duration.max='360';duration.step='5';duration.value=session.duration;
 start.type='time';start.value=session.start||'';end.type='time';end.value=session.end||'';
 place.type='text';place.value=session.place||'';place.maxLength=160;place.placeholder='Helyszín';
 controls.append(field('Edzés típusa',category),field('Kezdés',start),field('Befejezés',end),field('Időtartam (perc)',duration),field('Helyszín',place),
 button('Edzés adatainak mentése',()=>{
  const clock=(start.value||end.value)?plannedDuration(start.value,end.value):null;
  if((start.value||end.value)&&clock===null){message('A kezdési és befejezési idő legyen érvényes és teljes.');return}
  const minutes=clock??Number(duration.value);
  if(!Number.isInteger(minutes)||minutes<15||minutes>360){message('15–360 perc időtartamot adj meg.');return}
  const updated=state.sessions.map(s=>s.id===session.id?{...s,kind:category.value,duration:minutes,start:start.value,end:end.value,place:place.value.trim().slice(0,160),components:category.value==='mixed'?(s.components||[{kind:'ball',duration:minutes/2},{kind:'strength',duration:minutes/2}]):null}:s);
  const before=state.sessions;
  try{storeSessions(updated);const all=fetchObj(PROFILES_KEY);for(const profile of Object.values(all)){if(!Array.isArray(profile?.training))continue;profile.training=profile.training.map(x=>x.sessionId===session.id?{...x,type:typeToProfile[category.value],duration:minutes,components:category.value==='mixed'?(session.components||[{kind:'ball',duration:minutes/2},{kind:'strength',duration:minutes/2}]):null}:x)}writeObj(PROFILES_KEY,all);render()}catch(e){state.sessions=before;message('Nem sikerült menteni: '+e.message)}
 }));
 box.append(title,controls);
 if(!state.roster.length){box.append(elem('p','amSmall','Nincsenek játékosok a kiválasztott keretben.'));return box}
 const all=fetchObj(PROFILES_KEY),tbody=elem('tbody'),controlsByPlayer=[];
 const table=elem('table','amAttendance'),head=elem('thead'),header=elem('tr');
 for(const label of ['Játékos','Jelenlét','Minőség (1–5)','Körülmény','Megjegyzés'])header.append(elem('th','',label));
 head.append(header);table.append(head,tbody);
 const rosters=state.roster.slice().sort((a,b)=>a.name.localeCompare(b.name,'hu'));
 for(const player of rosters){
  const profile=all[personKey(state.age,state.team,player.key)]||{},entry=(profile.training||[]).find(x=>x.sessionId===session.id)||{};
  const tr=elem('tr'),name=elem('td','',player.name);
  const status=choose([['','— Nincs jelölve'],['present','Jelen'],['absent','Hiányzott'],['excused','Igazolt hiányzás']],entry.status||'');
  const rating=choose([['','— Nincs értékelés'],['1','1'],['2','2'],['3','3'],['4','4'],['5','5']],entry.rating==null?'':String(entry.rating));
  const condition=choose(Object.entries(conditionLabels),entry.condition||'normal');
  const note=elem('input');note.type='text';note.maxLength=240;note.placeholder='Megjegyzés (opcionális)';note.value=entry.note||'';
  const adapt=()=>{const present=status.value==='present';rating.disabled=!present;condition.disabled=!present;if(!present){rating.value='';condition.value='normal'}};
  status.addEventListener('change',adapt);adapt();
  for(const control of [status,rating,condition,note])tr.append(wrap('td',control));
  tr.prepend(name);tbody.append(tr);controlsByPlayer.push({player,status,rating,condition,note});
 }
 const wrapTable=elem('div','amTableWrap');wrapTable.append(table);
 const actions=elem('div','amTools');
 actions.append(button('Mindenki jelen – kijelölés',()=>{for(const r of controlsByPlayer){r.status.value='present';r.status.events?.change?.();r.rating.disabled=false;r.condition.disabled=false}},'amAdd'),
 button('Jelenlét és értékelések mentése',()=>{
  const all=fetchObj(PROFILES_KEY);let present=0,absent=0,excused=0,unmarked=0;
  for(const {player,status,rating,condition,note} of controlsByPlayer){
   const k=personKey(state.age,state.team,player.key),profile=all[k]||{},previous=Array.isArray(profile.training)?profile.training:[];
   const other=previous.filter(x=>x.sessionId!==session.id);
   if(!status.value){
    unmarked++;
    // Egy korábban automatikusan bejelölt mérkőzés-jelenlét kézi törlését
    // tombstone jelzi, hogy a következő betöltés ne jelölje vissza.
    const existed=previous.some(x=>x.sessionId===session.id);
    if(session.matchId&&existed)other.push({
      sessionId:session.id,date:session.date,type:'match',duration:session.duration||0,
      status:'',manualUnmarked:true,rating:null,condition:'normal',note:''
    });
    all[k]={...profile,training:other};
    continue
   }
   const entry={sessionId:session.id,date:session.date,type:typeToProfile[session.kind],duration:session.duration,components:session.components||null,status:status.value,rating:status.value==='present'&&rating.value?Number(rating.value):null,condition:status.value==='present'?condition.value:'normal',note:note.value.trim().slice(0,240)};
   other.push(entry);all[k]={...profile,training:other,modifiedAt:new Date().toISOString()};
   if(status.value==='present')present++;else if(status.value==='absent')absent++;else excused++;
  }
  try{writeObj(PROFILES_KEY,all);render();message('Mentve: '+present+' jelen, '+absent+' hiányzik, '+excused+' igazolt, '+unmarked+' még nincs jelölve.')}catch(e){message('Jelenlét mentése sikertelen: '+e.message)}
 }),button('Bezárás',()=>{state.editor='';render()},'amAdd'),
 button('Edzés törlése',()=>{
  if(!confirm('Biztosan törlöd a '+session.date+' napi '+types[session.kind]+' edzést és a hozzá tartozó jelenléti jelöléseket?'))return;
  const sessions=state.sessions.filter(x=>x.id!==session.id),all=fetchObj(PROFILES_KEY);
  for(const profile of Object.values(all))if(Array.isArray(profile?.training))profile.training=profile.training.filter(x=>x.sessionId!==session.id);
  try{writeObj(PROFILES_KEY,all);storeSessions(sessions);state.editor='';render();message('Edzés törölve.')}catch(e){message('Törlési hiba: '+e.message)}
 },'amDanger'));
 box.append(wrapTable,actions,elem('p','amSmall','A jelölések mentésekor az adott edzés részvétele beépül a játékos edzésnaplójába és az optimalizáló 28 napos edzésmunka-mutatójába. Az igazolt hiányzás elkülönül. Az adatok csak ezen a böngészőn tárolódnak.'));
 return box;
}
$('career-team-select')?.addEventListener('change',()=>{if(!panel.hidden)queueMicrotask(load)});
})();