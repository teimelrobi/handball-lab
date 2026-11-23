'use strict';
// KéziStat – Csapatoptimalizáló. Az adatokat kizárólag a böngésző kezeli.
(function(){
const $=id=>document.getElementById(id);
const S=x=>String(x==null?'':x).trim();
const NK=x=>S(x).toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const POS=['K','BSZ','BA','IR','JA','JSZ','BE'];
const PN={K:'Kapus',BSZ:'Bal szél',BA:'Bal átlövő',IR:'Irányító',JA:'Jobb átlövő',JSZ:'Jobb szél',BE:'Beálló'};
const node=(tag,cls,t)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(t!==undefined)e.textContent=t;return e};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const age=x=>{const t=NK(x);return t.includes('18')?'FU18':t.includes('16')?'FU16':''};
const P=(raw,goalie)=>{const s=NK(raw);if(goalie||s==='k'||s==='kapus'||s==='gk')return 'K';if(s==='bsz'||s.includes('balszel'))return 'BSZ';if(s==='ba'||s.includes('balatlov'))return 'BA';if(s==='ir'||s.includes('iranyit'))return 'IR';if(s==='ja'||s.includes('jobbatlov'))return 'JA';if(s==='jsz'||s.includes('jobbszel'))return 'JSZ';if(s==='be'||s.includes('beallo'))return 'BE';return ''};
const st={db:null,team:'',matches:[],rawNames:new Map(),roster:[],chosen:new Set(),overrides:new Map(),aliases:new Map(),last:null,signature:''};
const group=()=> $('globalTeam').value;
const team=()=> $('optTeam').value;
const excel=()=>players.filter(p=>p.team===group());
const key=(a,b)=>a<b?a+'|'+b:b+'|'+a;
function db(){try{const x=JSON.parse(localStorage.getItem('handball_db')||'null');return x&&Array.isArray(x.matches)?x:null}catch(e){return null}}
function matchSide(m,name,d){for(const side of ['home','away'])if(NK(m[side+'Name']||d.teams?.[m[side+'TeamId']]?.name)===NK(name))return side;return ''}
function matchAge(m,side,d){
const exact=age(m[side+'AgeGroup']||d.teams?.[m[side+'TeamId']]?.ageGroup);if(exact)return exact===group();
const names=new Set((m[side+'Roster']||[]).map(p=>NK(p.name)));
const same=excel().filter(p=>names.has(NK(p.name))).length;
const other=players.filter(p=>p.team!==group()&&names.has(NK(p.name))).length;
return same>=3&&same>other;
}
function verified(m){const end=Number(m.matchEndAbs),h=(m.lineupHistory||[]).filter(x=>Number.isFinite(Number(x.abs))&&Number(x.abs)>=0);return m.lineupHistoryComplete===true&&h.length>0&&Number.isFinite(end)&&end>0}

const PROFILE_STORE='kezistat_player_profiles_v1';
function readProfiles(){try{const x=JSON.parse(localStorage.getItem(PROFILE_STORE)||'{}');return x&&typeof x==='object'?x:{}}catch(e){return {}}}
function savedProfile(c){const actual=st.rawNames.get(c.key)||c.name;return readProfiles()[NK(group())+'|'+NK(team())+'|'+NK(actual)]||null}
function saveProfile(c,patch){
 const all=readProfiles(),actual=st.rawNames.get(c.key)||c.name,k=NK(group())+'|'+NK(team())+'|'+NK(actual);
 all[k]={...(all[k]||{}),...patch,modifiedAt:new Date().toISOString()};
 try{localStorage.setItem(PROFILE_STORE,JSON.stringify(all))}catch(e){status('Nem sikerült elmenteni a játékos posztját: '+e.message)}
}
function trainValue(c){
 const p=savedProfile(c),now=Date.now(),since=now-28*86400000;
 const rows=(p?.training||[]).filter(x=>{const t=Date.parse(String(x.date)+'T12:00:00');return Number.isFinite(t)&&t>=since&&t<=now+86400000});
 const played=rows.filter(x=>x.status==='present'),missed=rows.filter(x=>x.status==='absent');
 const rated=played.filter(x=>(!x.condition||x.condition==='normal')&&Number(x.rating)>=1&&Number(x.rating)<=5),avg=rated.length?rated.reduce((s,x)=>s+Number(x.rating),0)/rated.length:null;
 // Igazolt hiányzás nem csökkenti az edzésrészvételi pontot.
 const denominator=played.length+missed.length,att=denominator>=3?played.length/denominator:null;
 // A pontszám csak több dokumentált edzés után számít; szubjektív értékelés kis súlyú.
 const quality=avg===null?0:(avg-3)*4*Math.min(1,rated.length/3);
 const attendance=att===null?0:(att-0.8)*5;
 return {sessions:rows.length,present:played.length,avg,points:clamp(quality+attendance,-10,10)};
}

function candidates(d,matches){
const known=new Map(),meta=new Map();
for(const {m,side} of matches)for(const p of m[side+'Roster']||[]){const k=NK(p.name);if(k&&!known.has(k)){known.set(k,S(p.name));meta.set(k,P(p.position,p.isGk))}}
for(const t of Object.values(d?.teams||{}))if(NK(t.name)===NK(team())&&age(t.ageGroup)===group())for(const p of t.players||[]){const k=NK(p.name);if(k&&!known.has(k)){known.set(k,S(p.name));meta.set(k,P(p.position,p.isGk))}}
st.rawNames=known;const mapped=new Set(),out=[];
for(const p of excel()){
 const k=st.aliases.get(p.id)||NK(p.name);if(known.has(k))mapped.add(k);
 const v=st.overrides.get(p.id);
 out.push({id:p.id,name:p.name,key:known.has(k)?k:'',first:v?.first??meta.get(k)??'',second:v?.second??'',survey:true});
}
for(const [k,name] of known)if(!mapped.has(k)){
 const id='stat:'+k,v=st.overrides.get(id);
 out.push({id,name,key:k,first:v?.first??meta.get(k)??'',second:v?.second??'',survey:false});
}
return out.map(c=>{
 const k=c.key||NK(c.name),base=st.rawNames.get(k)||c.name;
 const profile=readProfiles()[NK(group())+'|'+NK(team())+'|'+NK(base)]||{};
 const manual=st.overrides.get(c.id);
 return {...c,
 first:manual?.first??(profile.primary?P(profile.primary):c.first),
 second:manual?.second??(profile.secondary?P(profile.secondary):c.second),
 availability:profile.availability||'ready',
 defense:profile.defense||''};
}).sort((a,b)=>a.name.localeCompare(b.name,'hu'));
}
function load(reload){
const d=db(),teams=new Map();
if(d){for(const t of Object.values(d.teams||{}))if(t?.name)teams.set(NK(t.name),S(t.name));
for(const m of d.matches)for(const s of ['home','away'])if(m[s+'Name'])teams.set(NK(m[s+'Name']),S(m[s+'Name']))}
const sel=$('optTeam'),before=sel.value,list=[...teams.values()].sort((a,b)=>Number(!NK(a).includes('budaifarkasok'))-Number(!NK(b).includes('budaifarkasok'))||a.localeCompare(b,'hu'));
sel.replaceChildren(new Option('Válassz csapatot',''));for(const name of list)sel.add(new Option(name,name));
sel.value=list.includes(before)?before:list.find(x=>NK(x).includes('budaifarkasok'))||list[0]||'';
const sign=group()+'|'+team();
if(sign!==st.signature){st.signature=sign;st.chosen.clear();st.overrides.clear();st.aliases.clear();st.last=null}
st.db=d;st.team=team();st.matches=[];
if(d&&team())for(const m of d.matches){const side=matchSide(m,team(),d);if(side&&matchAge(m,side,d))st.matches.push({m,side})}
st.matches.sort((a,b)=>String(b.m.date||'').localeCompare(String(a.m.date||'')));
st.roster=candidates(d,st.matches);
const ids=new Set(st.roster.map(x=>x.id));
st.chosen=new Set([...st.chosen].filter(x=>ids.has(x)));
if(!st.chosen.size&&st.roster.length<=16)st.chosen=new Set(ids);
renderRoster();updateStatus();if(reload!==false)clearResult();
}
function status(s){$('optStatus').textContent=s}
function updateStatus(){status((st.team||'Nincs csapat')+' · '+group()+' · '+st.matches.length+' korosztály szerint azonosított meccs, '+st.matches.filter(x=>verified(x.m)).length+' teljes összeállításnaplóval. A számítás kizárólag az utóbbiakra épül.');$('optCount').textContent=st.chosen.size+' / 16 nevezett'}
function clearResult(){st.last=null;$('optResult').replaceChildren();$('optExport').disabled=true}
function posSelect(c,prop){
const e=node('select','optSelect');e.append(new Option('Nincs megadva',''));for(const p of POS)e.add(new Option(PN[p],p));
e.value=c[prop]||'';
e.addEventListener('change',()=>{const x=st.overrides.get(c.id)||{first:c.first,second:c.second};x[prop]=e.value;if(x.first==='K')x.second='';st.overrides.set(c.id,x);saveProfile(c,{primary:PN[x.first]||'',secondary:PN[x.second]||''});st.roster=candidates(st.db,st.matches);renderRoster();clearResult()});return e;
}
function renderRoster(){
const tbody=$('optRoster');tbody.replaceChildren();$('optCount').textContent=st.chosen.size+' / 16 nevezett';
if(!st.roster.length){const tr=node('tr'),td=node('td','', 'Nincs játékos ehhez a korosztályhoz. Az Excelt és a KéziStat-adatokat is ellenőrizd.');td.colSpan=5;tr.append(td);tbody.append(tr);return}
for(const c of st.roster){
 const tr=node('tr'),choose=node('td'),label=node('label','optCheck'),ch=node('input');
 ch.type='checkbox';ch.checked=st.chosen.has(c.id);
 ch.addEventListener('change',()=>{if(ch.checked&&st.chosen.size>=16){ch.checked=false;status('Legfeljebb 16 játékos nevezhető.');return}if(ch.checked)st.chosen.add(c.id);else st.chosen.delete(c.id);$('optCount').textContent=st.chosen.size+' / 16 nevezett';clearResult()});
 label.append(ch,node('span','',c.name));choose.append(label);
 if(!c.survey)choose.append(node('small','optLight',' KéziStat (nincs kérdőív)'));
 const first=node('td'),second=node('td'),map=node('td');
 first.append(posSelect(c,'first'));second.append(posSelect(c,'second'));
 const mapping=node('select','optSelect');mapping.append(new Option('Nem párosított',''));
 for(const [k,name] of st.rawNames)mapping.add(new Option(name,k));
 mapping.value=c.key||'';mapping.disabled=!c.survey;
 mapping.addEventListener('change',()=>{if(mapping.value)st.aliases.set(c.id,mapping.value);else st.aliases.delete(c.id);st.roster=candidates(st.db,st.matches);renderRoster();clearResult()});
 map.append(mapping);tr.append(choose,first,second,map,node('td','optLight',c.survey?'Excel':'KéziStat'));tbody.append(tr);
}
}
function lastRoster(){
if(!st.matches.length){status('Nincs ismert korosztályú mérkőzéskeret.');return}
const {m,side}=st.matches[0],keys=new Set((m[side+'Roster']||[]).map(p=>NK(p.name)));
const eligible=st.roster.filter(p=>p.key&&keys.has(p.key));
if(eligible.length>16){status('Az utolsó meccs kerete több mint 16 fő; válassz kézzel.');return}
st.chosen=new Set(eligible.map(x=>x.id));renderRoster();clearResult();status('A legutóbbi mérkőzés '+eligible.length+' játékosát jelöltem ki. Ellenőrizd a nevezéseket és posztokat.');
}
function performance(){
const limit=$('optPeriod').value,chosen=limit==='all'?st.matches:st.matches.slice(0,+limit);
const ms=chosen.filter(x=>verified(x.m)),per=new Map(st.roster.map(p=>[p.id,{sec:0,g:0,s:0,a:0,err:0,steal:0,block:0,charge:0,pen:0,caused:0,gks:0,gkf:0,pass:0,won:0,ng:0}]));
const pair=new Map(),byName=new Map(st.roster.filter(x=>x.key).map(x=>[x.key,x.id]));
function getPair(a,b){const k=key(a,b);if(!pair.has(k))pair.set(k,{sec:0,gf:0,ga:0});return pair.get(k)}
for(const {m,side} of ms){
 const nums=new Map();for(const p of m[side+'Roster']||[]){const id=byName.get(NK(p.name));if(id)nums.set(String(p.num),id)}
 const field=side+'Court',h=(m.lineupHistory||[]).filter(x=>Number.isFinite(Number(x.abs))).slice().sort((a,b)=>+a.abs-+b.abs),end=+m.matchEndAbs;
 const active=raw=>Array.isArray(raw)?[...new Set(raw.map(x=>nums.get(String(x))).filter(Boolean))]:[];
 for(let i=0;i<h.length;i++){const a=+h[i].abs,b=Math.min(end,i+1<h.length?+h[i+1].abs:end),secs=clamp(b-a,0,3600*3);if(!secs)continue;const on=active(h[i][field]);
 for(const id of on)per.get(id).sec+=secs;
 for(let j=0;j<on.length;j++)for(let k=j+1;k<on.length;k++)getPair(on[j],on[k]).sec+=secs;
 }
 for(const e of m.events||[]){
 const id=nums.get(String(e.playerNum))||(e.team===side?byName.get(NK(e.playerName)):null);
 if(id&&e.team===side){const p=per.get(id);
 if(e.group==='shot'){p.s++;if(e.result==='Gól')p.g++}
 if(e.group==='error')p.err++;
 if(e.group==='attack'){if(e.result==='Kulcspassz')p.pass++;if(e.result==='Kiharcolt 7m'||e.result==='Kiharcolt 2 perc'||e.result==='Megnyert 1:1')p.won++}
 if(e.group==='defense'){if(e.result==='Labdaszerzés')p.steal++;if(e.result==='Sánc')p.block++;if(e.result==='Kiharcolt belemenés')p.charge++;if(e.result==='Okozott 7m')p.caused++}
 if(e.group==='penalty'&&e.result==='2 perc')p.pen++;
 }
 if(e.team===side&&S(e.assist)){const id=nums.get(String(e.assist));if(id)per.get(id).a++}
 if(e.team!==side&&e.group==='shot'&&(e.result==='Gól'||e.result==='Védés')){const id=nums.get(String(e.defendingGk));if(id){const p=per.get(id);p.gkf++;if(e.result==='Védés')p.gks++}}
 if(e.group==='shot'&&e.result==='Gól'){const on=active(e[field]);for(let j=0;j<on.length;j++)for(let k=j+1;k<on.length;k++){const pairRow=getPair(on[j],on[k]);if(e.team===side)pairRow.gf++;else pairRow.ga++}}
 }
}
for(const p of per.values()){const confidence=p.sec/(p.sec+3600),rate=3600/Math.max(1200,p.sec),miss=Math.max(0,p.s-p.g);
 const offense=(2.1*p.g+1.6*p.a+0.9*p.won+0.4*p.pass-1.8*p.err-0.8*miss)*rate;
 const defense=(2.6*p.steal+1.7*p.block+1.5*p.charge-2*p.caused-1.4*p.pen)*rate;
 p.off=clamp(50+clamp(offense,-26,26)*confidence,28,72);
 p.def=clamp(50+clamp(defense,-26,26)*confidence,28,72);
 p.gk=clamp(50+((p.gks+2)/(p.gkf+6)-0.3333)*55*p.gkf/(p.gkf+10),33,70);
}
return {per,pair,nVerified:ms.length,nSelected:chosen.length};
}
function socialPairs(){
const m=new Map();
if(!$('optSocial').checked)return m;
for(const r of records){
 if(!excel().some(p=>p.id===r.from)||!excel().some(p=>p.id===r.to))continue;
 const k=key(r.from,r.to),v=m.get(k)||{a:false,b:false};
 if(r.from<r.to)v.a=true;else v.b=true;m.set(k,v);
}
return m;
}
function combined(list,phase,metrics,social){
let total=0,related=0;
for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
 const k=key(list[i].id,list[j].id),p=metrics.pair.get(k);
 if(p&&p.sec>=900)total+=clamp((p.gf-p.ga)*3600/p.sec,-8,8)*Math.min(1,p.sec/3600)*0.08;
 if(social.get(k)?.a&&social.get(k)?.b)related++;
}
return clamp(total,-3,3)+Math.min(1.2,related*0.17);
}
function rating(c,phase,metrics){
 const p=metrics.per.get(c.id);
 const base=!p?50:(c.first==='K'?p.gk:(phase==='attack'?p.off:p.def));
 return base+trainValue(c).points-(c.availability==='limited'?5:0);
}
function attack(pool,metrics,social){
 const slots=POS.map(pos=>({pos,candidates:pool.filter(c=>c.first===pos||c.second===pos)}));
 if(slots.some(x=>!x.candidates.length))return {error:'Hiányzó poszt: '+slots.filter(x=>!x.candidates.length).map(x=>PN[x.pos]).join(', ')};
 slots.sort((a,b)=>a.candidates.length-b.candidates.length);
 let beam=[{roles:{},used:new Set(),v:0}];
 for(const slot of slots){
 const next=[];for(const b of beam)for(const c of slot.candidates)if(!b.used.has(c.id))
 next.push({roles:{...b.roles,[slot.pos]:c.id},used:new Set([...b.used,c.id]),v:b.v+rating(c,'attack',metrics)+(c.first===slot.pos?4:0)});
 next.sort((a,b)=>b.v-a.v);beam=next.slice(0,300);
 if(!beam.length)return {error:'Nincs hét különböző megfelelő játékos ezekre a posztokra. Állíts be másodlagos posztokat vagy bővítsd a keretet.'};
 }
 let best=null;for(const b of beam){const arr=POS.map(p=>pool.find(x=>x.id===b.roles[p])),v=b.v+combined(arr,'attack',metrics,social);if(!best||v>best.v)best={roles:b.roles,players:arr,v}}
 return best;
}
function defense(pool,atk,metrics,social){
const maxSubs=clamp(Number($('optSwaps').value)||0,0,3),aIds=new Set(atk.players.map(p=>p.id));
const goalies=pool.filter(p=>p.first==='K'),field=pool.filter(p=>p.first!=='K');
let best=null;
for(const keeper of goalies){
 const picks=[keeper];
 function scan(start){
 if(picks.length===7){const newcomers=picks.filter(x=>!aIds.has(x.id));if(newcomers.length>maxSubs)return;
 const v=picks.reduce((s,c)=>s+rating(c,'defense',metrics),0)+combined(picks,'defense',metrics,social)-newcomers.length*1.4;
 if(!best||v>best.v)best={players:picks.slice(),keeper:keeper.id,v,swaps:newcomers.length};return}
 const need=7-picks.length;
 if(field.length-start<need||picks.filter(x=>!aIds.has(x.id)).length>maxSubs)return;
 for(let i=start;i<=field.length-need;i++){picks.push(field[i]);scan(i+1);picks.pop()}
 }
 scan(0);
}
return best;
}
function fmt(sec){return Math.floor(sec/60)+':'+String(Math.round(sec%60)).padStart(2,'0')}
function evidence(c,phase,m){
const p=m.per.get(c.id);if(!p||p.sec<600)return 'Kevés ellenőrzött játékidő';
if(c.first==='K')return (p.gkf?'Védés '+p.gks+'/'+p.gkf:'Kapusteljesítményből kevés adat')+' · '+Math.round(p.sec/60)+' perc';
let details=phase==='attack'?[
 p.s?'Lövés '+p.g+'/'+p.s:'',p.a?'Gólpassz '+p.a:'',p.err?'Hiba '+p.err:''
]:[p.steal?'Labdaszerzés '+p.steal:'',p.block?'Sánc '+p.block:'',p.pen?'2 perc '+p.pen:''];
return details.filter(Boolean).join(' · ')+(details.some(Boolean)?' · ':'')+Math.round(p.sec/60)+' perc';
}
function lineup(host,title,arr,roles,phase,metrics,keeperId){
const box=node('div','optLineup');box.append(node('h3','',title));
const content=node('div','optLineupRows');
const ordered=phase==='attack'?POS.map(pos=>({pos,c:arr.find(x=>x.id===roles[pos])})):
  [{pos:'K',c:arr.find(x=>x.id===keeperId)},...arr.filter(x=>x.id!==keeperId).sort((a,b)=>POS.indexOf(a.first)-POS.indexOf(b.first)).map(c=>({pos:c.first||'Mezőny',c}))];
for(const {pos,c} of ordered){if(!c)continue;const r=node('div','optLineupRow');r.append(node('strong','optPosition',PN[pos]||'Mezőny'),node('span','optPlayer',c.name),node('small','optReason',evidence(c,phase,metrics)));content.append(r)}
box.append(content);host.append(box);
}
function personalities(arr){
const counts=new Map(),types=['Ruler','Individual','Supporter','Expert'];
for(const c of arr){const d=personalityData.get(c.id);if(!d?.complete||d.scores?.length!==4)continue;
 const idx=d.scores.indexOf(Math.max(...d.scores));counts.set(types[idx],(counts.get(types[idx])||0)+1)}
return [...counts].map(([name,n])=>name+': '+n+' fő').join(' · ')||'Nincs elérhető, teljes személyiségprofil ehhez a heteshez.';
}
function optimize(){
clearResult();const unavailable=st.roster.filter(c=>st.chosen.has(c.id)&&c.availability==='no');
 const pool=st.roster.filter(c=>st.chosen.has(c.id)&&c.availability!=='no');
 if(unavailable.length)status('A nem nevezhető játékosokat kihagytam: '+unavailable.map(c=>c.name).join(', ')+'.');
if(pool.length<7||pool.length>16){status('Válassz legalább 7, legfeljebb 16 nevezett játékost (jelenleg '+pool.length+').');return}
if(!pool.some(c=>c.first==='K')){status('Nincs kapus a nevezett keretben. Adj meg elsődleges Kapus posztot.');return}
const met=performance(),social=met.nVerified>0?socialPairs():new Map(),atk=attack(pool,met,social);
if(atk.error){status(atk.error);return}
const def=defense(pool,atk,met,social);
if(!def){status('A megadott legfeljebb '+$('optSwaps').value+' cserével nem tudok érvényes védekező hetest összeállítani.');return}
const out=$('optResult');out.replaceChildren();
out.append(node('p','optBanner',met.nVerified?met.nVerified+' ellenőrzött mérkőzésből számított javaslat. Posztok az állandó játékosadatlapból, az utolsó 28 napos edzésmunkával és opcionális szociometriával.':'Nincs ellenőrzött összeállításnapló. Ez poszt- és edzésadat-alapú próba-összeállítás, nem teljesítmény-optimalizálás. A szociometriai rásegítést adat hiányában kikapcsoltam.'));
const boxes=node('div','optPairLineups');
lineup(boxes,'Támadó hetes',atk.players,atk.roles,'attack',met);lineup(boxes,'Védekező hetes',def.players,null,'defense',met,def.keeper);out.append(boxes);
const as=new Set(atk.players.map(x=>x.id)),ds=new Set(def.players.map(x=>x.id));
const leaving=atk.players.filter(x=>!ds.has(x.id)),entering=def.players.filter(x=>!as.has(x.id));
const swap=node('div','optAdvice');swap.append(node('h3','',def.swaps+' támadó–védő csere'));
swap.append(node('p','',def.swaps?'Támadás után le: '+leaving.map(x=>x.name).join(', ')+'. Védekezésre be: '+entering.map(x=>x.name).join(', ')+'.':'A modell a megadott csereszám mellett nem javasol módosítást.'));out.append(swap);
const situation=$('optSituation').value;if(situation.startsWith('late-'))out.append(node('p','optWarning','57:00, döntetlen: a '+(situation==='late-attack'?'támadó':'védekező')+' hetes a kiinduló javaslat. Nincs külön validált végjáték-modell, így az aktuális forma, fáradtság, időkérés és taktika elsőbbséget élvez.'));
if(situation==='power'||situation==='short')out.append(node('p','optWarning','A létszámhelyzetet a felület jelzi, de a 7 fős összeállítás nem állítja elő külön a 6:5 vagy 5:6 tényleges pályalétszámot. Ehhez később külön létszámhelyzet-specifikus modell szükséges.'));
const p=node('div','optAdvice');p.append(node('h3','','Jellemző személyiségösszetétel a támadó hetesben'),node('p','',personalities(atk.players)),node('p','optSmall','A személyiségprofil nem dönt a kiválasztásról; a szociometriai kölcsönösséget csak kis súllyal, opcionálisan vesszük figyelembe.'));out.append(p);
if(met.nVerified<2)out.append(node('p','optWarning','Az eredmények kevés ellenőrzött mérkőzésadatból származnak. A kijelölést csak edzői hipotézisként használd; ellenőrizd az aktuális állapotot, posztokat, terhelést és a védekezési rendszert.'));
 out.append(node('p','optSmall','Adatfelhasználás: poszt = kötelező feltétel; mérkőzésteljesítmény = fő pontszám, ha van ellenőrzött játékidő; utolsó 28 nap edzésmunkája = legfeljebb 10 pont; kölcsönös szociometria = legfeljebb 1,2 pont; személyiségtípus = tájékoztató, nem pontozott; testmagasság és testsúly = tájékoztató, nem pontozott.'));
out.append(node('p','optSmall','A védekező hat mezőnyjátékos pontos 6:0 vagy 5:1 helyét nem becsüljük: azt az edző határozza meg. A támadó hetes szerepkörönként rendezett.'));
st.last={atk,def,met,leaving,entering};$('optExport').disabled=false;status('Kiszámítva a támadó és a védekező hetes. Javasolt cserék: '+def.swaps+'.');
}
function exportCSV(){
if(!st.last)return;const {atk,def,met,leaving,entering}=st.last;
const rows=[['KéziStat – csapatoptimalizáló'],['Korosztály',group()],['Csapat',team()],['Ellenőrzött mérkőzések',met.nVerified],[],['Támadó poszt','Játékos']];
for(const p of POS)rows.push([PN[p],atk.players.find(x=>x.id===atk.roles[p])?.name||'']);
rows.push([],['Védekező szerep','Játékos']);
for(const c of def.players)rows.push([c.id===def.keeper?'Kapus':'Mezőny',c.name]);
rows.push([],['Támadás után le',leaving.map(x=>x.name).join(', ')],['Védekezésre be',entering.map(x=>x.name).join(', ')],['Megjegyzés','Edzői próba, nem bizonyított optimális összeállítás.']);
const q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
const content='\ufeff'+rows.map(r=>r.map(q).join(';')).join('\r\n'),url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
const a=node('a');a.href=url;a.download='KeziStat_'+group()+'_csapatoptimalizalo.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('optReload').addEventListener('click',()=>load(true));
$('optTeam').addEventListener('change',()=>load(true));
$('optRecent').addEventListener('click',lastRoster);
$('optCalculate').addEventListener('click',optimize);
$('optExport').addEventListener('click',exportCSV);
$('globalTeam').addEventListener('change',()=>load(true));
for(const id of ['optPeriod','optSwaps','optSituation','optSocial'])$(id).addEventListener('change',clearResult);
window.teamOptimizerRefresh=()=>load(true);
window.teamOptimizerRender=()=>updateStatus();
load(true);
})();