/* Handball Lab központi Videótár. Nem módosít meglévő mérkőzésadatot. */
let libraryTarget=null, libraryReturn='view-home', libraryUrl=null, libraryLoadSequence=0;
function libraryMessage(s){const e=document.getElementById('library-status');if(e)e.textContent=s;}
function libraryMatchKey(id){return 'match_'+String(id);}
function libraryOpen(target=null){
 libraryTarget=target;
 libraryReturn=target==='room'?'view-video-room':target==='clip'?'view-clip-editor':'view-home';
 showScreen('view-video-library');
 const select=document.getElementById('library-match');
 select.replaceChildren(new Option('Nincs hozzárendelés',''));
 (db.matches||[]).forEach(m=>{if(m.id!=null)select.add(new Option((m.homeName||'Hazai')+' – '+(m.awayName||'Vendég')+(m.date?' ('+m.date+')':''),String(m.id)));});
 libraryRefresh();
}
async function libraryConnect(){try{await requestDriveAccessToken();await libraryRefresh();}catch(e){libraryMessage('Kapcsolódási hiba: '+e.message);}}
async function libraryFiles(){
 if(!isDriveAuthorized())throw Error('Előbb kapcsold össze a Google Drive-ot ezen a gépen.');
 let files=[],token='';
 do{
 const q="appProperties has { key='handballProjectId' } and trashed=false";
 const url='https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields='+encodeURIComponent('nextPageToken,files(id,name,size,mimeType,appProperties)')+'&page_size=100'+(token?'&pageToken='+encodeURIComponent(token):'');
 const data=await driveFetch(url);files.push(...(data.files||[]));token=data.nextPageToken||'';
 }while(token);
 return files.filter(f=>(f.mimeType||'').startsWith('video/')||/\.(mp4|mov|webm)$/i.test(f.name||''));
}
async function libraryRefresh(){
 const root=document.getElementById('library-list');if(!root)return;
 root.textContent='Videók keresése…';
 try{
 const files=await libraryFiles();root.replaceChildren();
 if(!files.length)root.textContent='Nincs elérhető videó a Handball Lab Drive-tárhelyén.';
 for(const file of files){
 const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px;border-bottom:1px solid var(--border-color)';
 const name=document.createElement('span');name.textContent=file.name+' ('+Math.round(Number(file.size||0)/1048576)+' MB)';
 const btn=document.createElement('button');btn.className='btn-arch-action';btn.style.flex='0 0 auto';btn.textContent='Betöltés';btn.onclick=()=>libraryLoad(file);
 row.append(name,btn);root.append(row);
 }
 libraryMessage(files.length+' videó található.');
 }catch(e){root.textContent='Nem sikerült lekérni a videókat.';libraryMessage(e.message);}
}
async function libraryUpload(){
 const file=document.getElementById('library-file').files[0];if(!file)return libraryMessage('Válassz ki videót.');
 const matchId=document.getElementById('library-match').value;
 const key=matchId?libraryMatchKey(matchId):'library_'+crypto.randomUUID();
 try{
 if(!isDriveAuthorized())await requestDriveAccessToken();
 if(matchId&&await clipDriveFind(key))return libraryMessage('Ehhez a mérkőzéshez már van videó. Nem írjuk felül.');
 await clipDriveUpload(key,file,document.getElementById('library-status'));
 libraryMessage('Videó feltöltve.');await libraryRefresh();
 }catch(e){libraryMessage('Feltöltési hiba: '+e.message);}
}
async function libraryDownload(f){
 const res=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(f.id)+'?alt=media',{headers:{Authorization:'Bearer '+driveAccessToken}});
 if(!res.ok)throw Error('Drive letöltési hiba: '+res.status);
 const blob=await res.blob();return new File([blob],f.name||'merkozes.mp4',{type:blob.type||'video/mp4'});
}
function libraryAttachRoom(file){
 if(libraryUrl)URL.revokeObjectURL(libraryUrl);
 libraryUrl=URL.createObjectURL(file);
 const video=document.getElementById('match-video');
 video.src=libraryUrl;
 video.onloadedmetadata=()=>{initializeVideoSliders(video);seekTimelineFilterStart(video,true);};
}
async function libraryLoad(f){
 const target=libraryTarget, seq=++libraryLoadSequence;
 libraryMessage('Videó letöltése: '+f.name);
 try{
 const file=await libraryDownload(f);if(seq!==libraryLoadSequence)return;
 if(target==='room'){libraryAttachRoom(file);showScreen('view-video-room');}
 else if(target==='clip'){++clipVideoRestoreToken;clipAttachVideo(file);clipSave();showScreen('view-clip-editor');}
 else{
 libraryAttachRoom(file);libraryMessage('Videó letöltve. A megtekintéshez nyisd meg a mérkőzés Videószobáját.');
 }
 }catch(e){libraryMessage('Betöltési hiba: '+e.message);}
}
async function libraryAutoRoom(matchId){
 if(matchId==null||!isDriveAuthorized())return;
 const matchKey=String(matchId),seq=++libraryLoadSequence;
 try{
 const remote=await clipDriveFind(libraryMatchKey(matchKey));if(!remote||String(currentVideoMatch?.id)!==matchKey)return;
 const file=await libraryDownload(remote);
 if(seq!==libraryLoadSequence||String(currentVideoMatch?.id)!==matchKey)return;
 libraryAttachRoom(file);
 }catch(e){console.warn('Videótár automatikus betöltés:',e);}
}
const libraryOriginalOpenVideoRoom=openVideoRoom;
openVideoRoom=function(matchId,...rest){++libraryLoadSequence;libraryOriginalOpenVideoRoom(matchId,...rest);if(matchId!=null)libraryAutoRoom(matchId);};
