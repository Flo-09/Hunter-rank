// ══════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════
const ICONS=['⚔️','🧘','📚','🏃','💪','🎨','✍️','🎵','🌿','💤','🍎','🧹','💊','🐕','☀️','🧠','🔥','⚡','🎯','🏋️'];
const COLORS=['#2979ff','#e53935','#00c853','#ffab40','#7c4dff','#e91e63','#00bcd4','#ff6d00','#9c27b0','#4caf50'];
const LEVELS=[
  {rank:'E',xp:0,color:'#607d8b'},{rank:'D',xp:100,color:'#2979ff'},
  {rank:'C',xp:300,color:'#00c853'},{rank:'B',xp:600,color:'#ffab40'},
  {rank:'A',xp:1000,color:'#e91e63'},{rank:'S',xp:1500,color:'#ff6d00'},
  {rank:'SS',xp:2500,color:'#9c27b0'},{rank:'SSS',xp:4000,color:'#ffd700'}
];
const SAO_COL=['#29b6f6','#00d4ff','#0099ff','#1a8fff','#2979ff','#7c4dff','#e040fb','#ff4081','#ff6d00','#ffd700'];
function saoInfo(xp){
  const L=Math.min(100,Math.floor(xp/25)+1);
  const col=SAO_COL[Math.min(Math.floor((L-1)/10),9)];
  const base=(L-1)*25,pct=L<100?Math.round((xp-base)/25*100):100;
  return{isSAO:true,level:L,rank:'Nv.'+L,color:col,pct,xp,nextXp:L<100?L*25:Infinity,nextRank:L<100?'Nv.'+(L+1):'MAX',idx:L-1};
}
const BADGES=[
  {id:'first',name:'Premier Pas',icon:'⚔️',desc:'1 quête créée',chk:()=>habits.length>=1},
  {id:'three',name:'Triple Menace',icon:'💪',desc:'3 quêtes créées',chk:()=>habits.length>=3},
  {id:'five',name:'Légendaire',icon:'★',desc:'5 quêtes créées',chk:()=>habits.length>=5},
  {id:'week',name:'Semaine de Feu',icon:'🔥',desc:'7 jours consécutifs',chk:()=>habits.some(h=>streak(dates(h))>=7)},
  {id:'month',name:'Mois Parfait',icon:'⭐',desc:'30 jours consécutifs',chk:()=>habits.some(h=>streak(dates(h))>=30)},
  {id:'rankD',name:'Rang D',icon:'🔵',desc:'Atteindre le rang D',chk:()=>(pdata?.total_xp||0)>=100},
  {id:'rankS',name:'Rang S',icon:'🔴',desc:'Atteindre le rang S',chk:()=>(pdata?.total_xp||0)>=1500},
  {id:'perfect',name:'Journée Parfaite',icon:'✨',desc:'Toutes les quêtes du jour',chk:()=>habits.length>0&&habits.every(h=>dates(h).includes(TODAY))},
];

// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
const UK='lk_u';
const getU=()=>localStorage.getItem(UK)||'sl';
const setU=u=>localStorage.setItem(UK,u);
const SKEY='hr2_settings';
function DKEY(){return getU()==='sao'?'hr2_data_sao':'hr2_data';}
const load=()=>{try{return JSON.parse(localStorage.getItem(DKEY())||'[]')}catch{return[]}};
const save=d=>localStorage.setItem(DKEY(),JSON.stringify(d));
const loadS=()=>{try{return JSON.parse(localStorage.getItem(SKEY)||'{}')}catch{return{}}};
const saveS=s=>localStorage.setItem(SKEY,JSON.stringify(s));

let rawData=load();
let habits=rawData.filter(i=>i.name!=null);
let subtasks=rawData.filter(i=>i.text!=null);
let pdata=rawData.find(i=>i.total_xp!=null)||null;
let settings=loadS();

const TODAY=new Date().toISOString().split('T')[0];
let curTab='habits',searchQ='',delTarget=null,editId=null;
let selIcon=ICONS[0],selColor=COLORS[0],selEI=ICONS[0],selEC=COLORS[0];
const activeTimers=new Set();
let lastConf='';

let _saveT=null;
let _calcVersion=0;
const _datesCache=new Map();
const _streakCache=new Map();

function buildPersistedData(){
  const d=[...habits,...subtasks];
  if(pdata)d.push(pdata);
  return d;
}
function flushSyncAll(){
  if(_saveT){clearTimeout(_saveT);_saveT=null;}
  save(buildPersistedData());
}
function syncAll(){
  _calcVersion++;
  if(_saveT)clearTimeout(_saveT);
  _saveT=setTimeout(()=>{_saveT=null;save(buildPersistedData());},80);
}
window.addEventListener('pagehide',flushSyncAll);
window.addEventListener('beforeunload',flushSyncAll);

const genId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2);

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function dates(h){
  if(!h)return[];
  const id=h.__id||'__noid__';
  const sig=h.completed_dates||'';
  const hit=_datesCache.get(id);
  if(hit&&hit.sig===sig)return hit.val;
  const val=sig?sig.split(',').filter(Boolean):[];
  _datesCache.set(id,{sig,val});
  return val;
}
function streak(ds){
  const key=Array.isArray(ds)?ds.join('|'):String(ds||'');
  const hit=_streakCache.get(key);
  if(hit&&hit.v===_calcVersion)return hit.val;
  const s=Array.isArray(ds)?[...ds].sort().reverse():[];let c=0;const now=new Date(TODAY);
  for(let i=0;i<s.length;i++){const e=new Date(now);e.setDate(e.getDate()-i);if(s[i]===e.toISOString().split('T')[0])c++;else break;}
  _streakCache.set(key,{v:_calcVersion,val:c});
  return c;
}
function xpOf(h){
  const dur=h.duration_minutes||0,sets=h.sets||1,rest=h.rest_minutes||1;
  const t=dur*sets+rest*Math.max(0,sets-1);
  return Math.max(3,Math.round(Math.sqrt(t)*1.5));
}
function xpFinal(h,str){
  return Math.round(xpOf(h)*(1+Math.min(.5,str*.05))*(getU()==='sao'?1.2:1));
}
function lvlInfo(xp){
  if(getU()==='sao')return saoInfo(xp);
  let i=0;for(let j=LEVELS.length-1;j>=0;j--){if(xp>=LEVELS[j].xp){i=j;break}}
  const cur=LEVELS[i],nxt=LEVELS[i+1];
  const pct=nxt?Math.round((xp-cur.xp)/(nxt.xp-cur.xp)*100):100;
  return{isSAO:false,rank:cur.rank,color:cur.color,pct,xp,nextXp:nxt?.xp??cur.xp,nextRank:nxt?.rank??'MAX',idx:i};
}
function fmtTime(s){return`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}

// Animate number counting
function countAnim(el,to,suf='',dur=650){
  if(!el)return;
  const from=parseInt(el.textContent)||0;
  if(from===to)return;
  const ease=t=>1-Math.pow(1-t,3);
  let start=null;
  function step(ts){
    if(!start)start=ts;
    const p=Math.min(1,(ts-start)/dur);
    el.textContent=Math.round(from+(to-from)*ease(p))+suf;
    if(p<1)requestAnimationFrame(step);
    else el.textContent=to+suf;
  }
  requestAnimationFrame(step);
}

// ══════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════
function applySettings(){
  const t=settings.theme||'blue';
  document.documentElement.setAttribute('data-t',t==='blue'?'':t);
  document.querySelectorAll('[data-tbtn]').forEach(b=>{
    const on=b.dataset.tbtn===t;
    b.style.opacity=on?'1':'.5';
    b.style.borderColor=on?'currentColor':'transparent';
    b.style.transform=on?'scale(1.03)':'scale(1)';
  });
  const snd=settings.sound!==false;
  document.querySelectorAll('[data-sbtn]').forEach(b=>{
    const on=(b.dataset.sbtn==='on')===snd;
    b.style.opacity=on?'1':'.45';
    b.style.borderColor=on?'currentColor':'transparent';
  });
  const name=settings.playerName||'JOUEUR';
  const el=document.getElementById('hero-name');if(el)el.textContent=name.toUpperCase();
  const inp=document.getElementById('pname-input');
  if(inp&&document.activeElement!==inp)inp.value=settings.playerName||'';
}
window.setTheme=t=>{settings.theme=t;saveS(settings);applySettings()};
window.setSound=v=>{settings.sound=v;saveS(settings);applySettings()};
window.updateName=v=>{settings.playerName=v||'Joueur';saveS(settings);const el=document.getElementById('hero-name');if(el)el.textContent=(v||'Joueur').toUpperCase()};
window.openSettings=()=>{const ov=document.getElementById('settings-ov');ov.style.display='flex';applySettings();};
window.closeSettings=()=>{document.getElementById('settings-ov').style.display='none'};
window.doReset=()=>{if(confirm('Réinitialiser TOUTES les données ?')){localStorage.removeItem(DKEY());location.reload()}};

// ══════════════════════════════════════════════
// NAVIGATION — transitions améliorées
// ══════════════════════════════════════════════
const PAGE_MAP={habits:'p-habits',tasks:'p-tasks',stats:'p-stats',badges:'p-badges'};
const BTN_MAP={habits:'tb-habits',tasks:'tb-tasks',stats:'tb-stats',badges:'tb-badges'};
const TAB_ORDER=['habits','tasks','stats','badges'];

window.goTab=function(tab){
  if(tab===curTab)return;
  const dir=TAB_ORDER.indexOf(tab)>TAB_ORDER.indexOf(curTab)?1:-1;
  const oldPage=document.getElementById(PAGE_MAP[curTab]);
  if(oldPage){
    oldPage.style.animation=`${dir>0?'pageOutL':'pageOutR'} .22s var(--out) both`;
  }
  document.getElementById(BTN_MAP[curTab])?.classList.remove('active');
  curTab=tab;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.querySelectorAll('.page').forEach(p=>{p.classList.remove('active');p.style.animation='';});
    const np=document.getElementById(PAGE_MAP[tab]);
    if(np){
      np.classList.add('active');
      np.style.animation=`${dir>0?'pageInR':'pageInL'} .38s var(--spring) both`;
      // Nettoyer l'animation inline après pour libérer le compositor
      setTimeout(()=>{if(np.classList.contains('active'))np.style.animation='';},420);
    }
    document.getElementById(BTN_MAP[tab])?.classList.add('active');
    const fab=document.getElementById('fab');
    if(fab){
      if(tab==='habits'){fab.style.display='flex';fab.style.animation='fabPulse 3.5s ease-in-out infinite, rise .4s var(--bounce) both';}
      else{fab.style.display='none';}
    }
    if(tab==='stats')renderStats();
    if(tab==='badges')renderBadges();
    document.getElementById('scroll-area').scrollTo({top:0,behavior:'smooth'});
  }));
};

// ══════════════════════════════════════════════
// SHEETS
// ══════════════════════════════════════════════
function openSheet(type,id=null){
  const ov=document.getElementById('overlay'),wrap=document.getElementById('sheet-wrap');
  editId=id;ov.style.display='block';
  document.getElementById('ov-bg').style.animation='fadeIn .22s ease-out both';
  if(type==='habit'){
    const h=id?habits.find(x=>x.__id===id):null;
    if(h){selEI=h.icon||ICONS[0];selEC=h.color||COLORS[0];}
    else{selIcon=ICONS[0];selColor=COLORS[0];}
    wrap.innerHTML=habitSheet(h);renderPickers(h?'e':'');updatePreview(h?'e':'');
  }else if(type==='task'){wrap.innerHTML=taskSheet();}
  lucide.createIcons();
  document.body.style.overflow='hidden';
}
window.closeSheet=function(){
  const ov=document.getElementById('overlay');
  const sw=document.getElementById('sheet-wrap').firstElementChild;
  if(sw){
    sw.style.transition='transform .28s var(--spring),opacity .22s';
    sw.style.transform='translateY(100%)';sw.style.opacity='0';
  }
  const ovbg=document.getElementById('ov-bg');
  if(ovbg){ovbg.style.transition='opacity .26s';ovbg.style.opacity='0';}
  const cleanup=()=>{
    ov.style.display='none';
    if(ovbg)ovbg.style.cssText='position:absolute;inset:0;background:rgba(2,5,14,.88);backdrop-filter:blur(14px)';
    document.getElementById('sheet-wrap').innerHTML='';
    document.body.style.overflow='';
  };
  if(sw)sw.addEventListener('transitionend',cleanup,{once:true});
  else setTimeout(cleanup,280);
};

function habitSheet(h){
  const edit=!!h,pfx=edit?'e':'';
  return`<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-handle"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-family:'Orbitron',monospace;font-size:13px;font-weight:700;letter-spacing:1px;color:var(--t1)">${edit?'MODIFIER LA QUÊTE':'NOUVELLE QUÊTE'}</h2>
      <button onclick="closeSheet()" class="btn-icon"><i data-lucide="x" style="width:15px;height:15px"></i></button>
    </div>
    <form onsubmit="saveHabit(event,'${pfx}')">
      <label class="lbl">Nom de la quête</label>
      <input id="${pfx}hname" type="text" required maxlength="50" placeholder="Ex: Méditation" value="${h?h.name:''}" style="margin-bottom:16px">
      <label class="lbl">Symbole</label>
      <div id="${pfx}icon-picker" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px"></div>
      <label class="lbl">Couleur</label>
      <div id="${pfx}color-picker" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px"></div>
      <label class="lbl">Durée (avec timer)</label>
      <div style="display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:8px;align-items:center;margin-bottom:8px">
        <div><label style="font-size:8.5px;color:var(--t3);letter-spacing:1px;display:block;margin-bottom:4px">SÉRIES</label><input id="${pfx}hsets" type="number" min="1" max="20" value="${h?h.sets||1:1}" oninput="updatePreview('${pfx}')"></div>
        <span style="color:var(--t3);font-size:14px;font-weight:700;padding-top:18px">×</span>
        <div><label style="font-size:8.5px;color:var(--t3);letter-spacing:1px;display:block;margin-bottom:4px">MIN/SÉRIE</label><input id="${pfx}hdur" type="number" min="1" max="120" value="${h?h.duration_minutes||5:5}" oninput="updatePreview('${pfx}')"></div>
        <svg viewBox="0 0 16 16" fill="none" style="width:14px;height:14px;color:var(--t3);margin-top:16px;opacity:.5"><rect x="2" y="6" width="12" height="2" rx="1" fill="currentColor"/><rect x="4" y="9.5" width="8" height="1.5" rx=".75" fill="currentColor" opacity=".6"/><rect x="6" y="12.5" width="4" height="1.5" rx=".75" fill="currentColor" opacity=".35"/></svg>
        <div><label style="font-size:8.5px;color:var(--t3);letter-spacing:1px;display:block;margin-bottom:4px">REPOS</label><input id="${pfx}hrest" type="number" min="1" max="30" value="${h?h.rest_minutes||1:1}" oninput="updatePreview('${pfx}')"></div>
      </div>
      <div id="${pfx}hprev" style="text-align:center;font-family:'Orbitron',monospace;font-size:9.5px;font-weight:700;color:var(--A);letter-spacing:1px;padding:9px;background:rgba(41,121,255,.07);border-radius:11px;border:1px solid rgba(41,121,255,.1);margin-bottom:20px;transition:all .25s"></div>
      <button type="submit" class="btn-prim">${edit?'SAUVEGARDER':'CRÉER LA QUÊTE'}</button>
    </form>
    <div style="height:8px"></div>
  </div>`;
}
function taskSheet(){
  return`<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-handle"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-family:'Orbitron',monospace;font-size:13px;font-weight:700;letter-spacing:1px;color:var(--t1)">NOUVELLE TÂCHE</h2>
      <button onclick="closeSheet()" class="btn-icon"><i data-lucide="x" style="width:15px;height:15px"></i></button>
    </div>
    <form onsubmit="saveTask(event)">
      <label class="lbl">Description</label>
      <textarea id="task-text" required maxlength="100" placeholder="Ex: Faire les courses" style="min-height:72px;resize:none;margin-bottom:20px"></textarea>
      <button type="submit" class="btn-prim">CRÉER</button>
    </form>
    <div style="height:8px"></div>
  </div>`;
}

// ══════════════════════════════════════════════
// PICKERS
// ══════════════════════════════════════════════
window.selectIcon=(ic,p)=>{if(p==='e')selEI=ic;else selIcon=ic;renderPickers(p)};
window.selectColor=(c,p)=>{if(p==='e')selEC=c;else selColor=c;renderPickers(p)};
function renderPickers(p){
  const si=p==='e'?selEI:selIcon,sc=p==='e'?selEC:selColor;
  const ip=document.getElementById(p+'icon-picker'),cp=document.getElementById(p+'color-picker');
  if(ip)ip.innerHTML=ICONS.map(ic=>`<button type="button" onclick="selectIcon('${ic}','${p}')" style="width:40px;height:40px;border-radius:11px;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all .2s var(--spring);background:${ic===si?'rgba(41,121,255,.15)':'rgba(255,255,255,.04)'};border:1px solid ${ic===si?'var(--A)':'rgba(255,255,255,.07)'};transform:${ic===si?'scale(1.12)':'scale(1)'}">${ic}</button>`).join('');
  if(cp)cp.innerHTML=COLORS.map(c=>`<button type="button" onclick="selectColor('${c}','${p}')" style="width:28px;height:28px;border-radius:50%;background:${c};border:2.5px solid ${c===sc?'#fff':'transparent'};box-shadow:${c===sc?`0 0 0 1px ${c},0 0 14px ${c}70`:'none'};transition:all .2s var(--spring);transform:${c===sc?'scale(1.22)':'scale(1)'}"></button>`).join('');
}
function updatePreview(p){
  const sets=parseInt(document.getElementById(p+'hsets')?.value)||1;
  const dur=parseInt(document.getElementById(p+'hdur')?.value)||5;
  const rest=parseInt(document.getElementById(p+'hrest')?.value)||1;
  const el=document.getElementById(p+'hprev');
  if(!el)return;
  el.textContent=sets>1?`${sets}×${dur}min · REST ${rest}min = ${sets*dur+(sets-1)*rest}min total`:`1×${dur}min — sans pause repos`;
}

// ══════════════════════════════════════════════
// RENDER ALL
// ══════════════════════════════════════════════
let _renderAllRaf=0,_renderAllPending=false;
function renderAll(){
  if(_renderAllPending)return;
  _renderAllPending=true;
  cancelAnimationFrame(_renderAllRaf);
  _renderAllRaf=requestAnimationFrame(()=>{
    _renderAllPending=false;
    renderHabits();renderTasks();updateProgress();updateWeekDots();updateLevel();
    updateHeroSummary();renderMissionBoard();renderTaskBoard();
  });
}

function updateHeroSummary(){
  const total=habits.length;
  let doneToday=0,bestStreak=0;
  for(const h of habits){
    const ds=dates(h);
    if(ds.includes(TODAY))doneToday++;
    const s=streak(ds);
    if(s>bestStreak)bestStreak=s;
  }
  const totalXp=(pdata&&pdata.total_xp)||0;
  const el=id=>document.getElementById(id);
  const doneEl=el('hero-done');if(doneEl)doneEl.textContent=`${doneToday}/${total||0}`;
  const stEl=el('hero-streak');if(stEl)stEl.textContent=`${bestStreak}j`;
  const xpEl=el('hero-xp');if(xpEl)xpEl.textContent=`${totalXp} XP`;
  const focusEl=el('hero-focus');
  const paceEl=el('hero-pace');
  const _sao=getU()==='sao';
  const lblDone=document.getElementById('lbl-done'),lblStr=document.getElementById('lbl-streak'),lblXp=document.getElementById('lbl-xp');
  if(lblDone)lblDone.textContent=_sao?'Missions':'Quêtes terminées';
  if(lblStr)lblStr.textContent=_sao?'Série max':'Meilleure série';
  if(lblXp)lblXp.textContent=_sao?'EXP total':'Puissance totale';
  if(focusEl)focusEl.textContent=_sao?(!total?'STANDBY':doneToday===total?'ALL CLEAR':doneToday>0?'IN PROGRESS':'READY'):(!total?'Crée une quête':doneToday===total?'Terminé':doneToday>0?'En cours':'Prêt');
  if(paceEl){const ratio=total?doneToday/total:0;paceEl.textContent=_sao?(ratio===1?'S-RANK':ratio>=.6?'A-RANK':ratio>0?'B-RANK':'E-RANK'):(ratio===1?'Parfait':ratio>=.6?'Solide':ratio>0?'Lancé':'Calme');}
}

// ── Live board tick ──
let _liveBoardInterval=null;
function startLiveBoardTick(){
  if(_liveBoardInterval)return;
  _liveBoardInterval=setInterval(()=>{
    document.querySelectorAll('.live-timer-card[data-hid]').forEach(card=>{
      const hid=card.dataset.hid;
      const st=timerBoardState[hid];if(!st||st.paused)return;
      // Lire tLeft depuis timerBoardState (mis à jour par le tick principal)
      const tEl=card.querySelector('.ltc-time');
      if(tEl)tEl.textContent=fmtTime(st.tLeft);
      const total2=st.isRest?st.restS:st.setS;
      const CIRC=+(2*Math.PI*20).toFixed(2);
      const frac=Math.max(0,Math.min(1,st.tLeft/total2));
      const rEl=card.querySelector('circle.ltc-ring');
      if(rEl)rEl.style.strokeDashoffset=CIRC*(1-frac);
      const sEl=card.querySelector('.ltc-ser');
      if(sEl)sEl.textContent=st.isRest?`REST · ${st.cur}/${st.totalSets}`:`SÉRIE ${st.cur}/${st.totalSets}`;
    });
  },250);
}
function stopLiveBoardTick(){clearInterval(_liveBoardInterval);_liveBoardInterval=null;}
const timerBoardState={};


function buildSAOBoard(live,pct,total,done,str,level,activeCount){
  var nxp=level.nextRank==='MAX'?0:Math.max(0,25-((pdata?pdata.total_xp:0)-(level.level-1)*25));
  var circ=(2*Math.PI*26).toFixed(1),off=(circ*(1-(total?pct/100:0))).toFixed(1);
  var status=!total?'EN ATTENTE':done===total?'ALL CLEAR':(done+'/'+total);
  var sub=!total?'Aucune mission.':done===total?'Toutes accomplies !':done>0?(total-done)+' restante'+(total-done>1?'s':''):'.';
  var nxtV=level.nextRank==='MAX'?'MAX':String(level.level+1);
  var nxtT=level.nextRank==='MAX'?'Niveau max !':nxp+' XP restants';
  var f='Orbitron,monospace';
  function cell(l,v,br){return '<div style="flex:1;padding:8px 10px;'+(br?'border-right:1px solid rgba(0,180,255,.1);':'')+'text-align:center"><div style="font-family:'+f+';font-size:5.5px;font-weight:700;letter-spacing:1.5px;color:rgba(0,212,255,.4);margin-bottom:3px">'+l+'</div><div style="font-family:'+f+';font-size:12px;font-weight:900;color:#00d4ff">'+v+'</div></div>';}
  var statsRow=cell('MISSIONS',done+'/'+(total||0),true)+cell('SÉRIE',str+'j',true)+cell('XP TOTAL',(pdata?pdata.total_xp:0)+'',true)+'<div style="flex:1;padding:8px 10px;text-align:center"><div style="font-family:'+f+';font-size:5.5px;font-weight:700;letter-spacing:1.5px;color:rgba(0,212,255,.4);margin-bottom:3px">NIVEAU</div><div style="font-family:'+f+';font-size:12px;font-weight:900;color:'+level.color+'">'+level.rank+'</div></div>';
  var coin='position:absolute;width:12px;height:12px;';
  var btnId='_sb'+Date.now();
  setTimeout(function(){var el=document.getElementById(btnId);if(!el)return;var b1=document.createElement('button');b1.onclick=function(){openSheet('habit');};b1.style.cssText='flex:1;padding:10px;border-radius:8px;background:rgba(0,160,255,.15);border:1px solid rgba(0,200,255,.3);color:#00d4ff;font-family:'+f+';font-size:8px;font-weight:700;letter-spacing:1.5px;cursor:pointer';b1.textContent='+ MISSION';var b2=document.createElement('button');b2.onclick=function(){openSheet('task');};b2.style.cssText='flex:1;padding:10px;border-radius:8px;background:rgba(0,100,200,.1);border:1px solid rgba(0,180,255,.2);color:rgba(0,212,255,.6);font-family:'+f+';font-size:8px;font-weight:700;letter-spacing:1.5px;cursor:pointer';b2.textContent='+ TÂCHE';var b3=document.createElement('button');b3.onclick=function(){goTab('stats');};b3.style.cssText='padding:10px 12px;border-radius:8px;background:rgba(0,80,180,.08);border:1px solid rgba(0,160,255,.15);color:rgba(0,212,255,.5);font-family:'+f+';font-size:8px;font-weight:700;cursor:pointer';b3.textContent='STATS';el.appendChild(b1);el.appendChild(b2);el.appendChild(b3);},0);
  function mini(lbl,val,vc,sub2){return '<div style="background:rgba(0,15,40,.85);border:1px solid rgba(0,180,255,.14);border-radius:14px;padding:14px;position:relative;overflow:hidden"><div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,212,255,.4),transparent)"></div><span style="font-family:'+f+';font-size:6px;font-weight:700;letter-spacing:2.5px;color:rgba(0,200,255,.45);display:block;margin-bottom:8px">'+lbl+'</span><div style="font-family:'+f+';font-size:26px;font-weight:900;color:'+vc+';line-height:1">'+val+'</div><p style="font-size:10px;color:rgba(0,180,255,.45);margin-top:5px;font-weight:600">'+sub2+'</p></div>';}
  return live+'<div style="background:rgba(0,20,50,.85);border:1px solid rgba(0,180,255,.18);border-radius:18px;padding:18px;position:relative;overflow:hidden;margin-bottom:10px"><div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,212,255,.6),transparent)"></div><div style="position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,180,255,.3),transparent)"></div><div style="'+coin+'top:10px;left:10px;border-top:1.5px solid rgba(0,212,255,.5);border-left:1.5px solid rgba(0,212,255,.5)"></div><div style="'+coin+'top:10px;right:10px;border-top:1.5px solid rgba(0,212,255,.5);border-right:1.5px solid rgba(0,212,255,.5)"></div><div style="'+coin+'bottom:10px;left:10px;border-bottom:1.5px solid rgba(0,180,255,.4);border-left:1.5px solid rgba(0,180,255,.4)"></div><div style="'+coin+'bottom:10px;right:10px;border-bottom:1.5px solid rgba(0,180,255,.4);border-right:1.5px solid rgba(0,180,255,.4)"></div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><span style="font-family:'+f+';font-size:7px;font-weight:700;letter-spacing:3px;color:rgba(0,212,255,.45)">[ RAPPORT DE MISSION ]</span><div style="display:flex;align-items:center;gap:5px"><div style="width:5px;height:5px;border-radius:50%;background:#00d4ff;box-shadow:0 0 6px #00d4ff;animation:pulse 2s infinite"></div><span style="font-family:'+f+';font-size:7px;font-weight:700;color:rgba(0,212,255,.6)">SYSTÈME ACTIF</span></div></div><div style="display:flex;align-items:center;gap:14px;margin-bottom:14px"><div style="position:relative;flex-shrink:0"><svg width="64" height="64" viewBox="0 0 64 64" style="transform:rotate(-90deg)"><circle cx="32" cy="32" r="26" fill="none" stroke="rgba(0,180,255,.1)" stroke-width="5"/><circle cx="32" cy="32" r="26" fill="none" stroke="#00d4ff" stroke-width="5" stroke-linecap="round" stroke-dasharray="'+circ+'" stroke-dashoffset="'+off+'" style="filter:drop-shadow(0 0 5px #00d4ff);transition:stroke-dashoffset 1s var(--spring)"/></svg><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'+f+';font-size:13px;font-weight:900;color:#00d4ff">'+(total?pct:0)+'<span style="font-size:7px">%</span></div></div><div style="flex:1;min-width:0"><p style="font-family:'+f+';font-size:18px;font-weight:900;color:#fff;margin-bottom:4px">'+status+'</p><p style="font-size:11px;font-weight:600;color:rgba(0,212,255,.5)">'+sub+'</p></div></div><div style="display:flex;gap:0;border:1px solid rgba(0,180,255,.12);border-radius:8px;overflow:hidden;margin-bottom:14px">'+statsRow+'</div><div id="'+btnId+'" style="display:flex;gap:8px"></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">'+mini('PROCHAIN NIVEAU',nxtV,level.nextRank==='MAX'?'#ffd700':'#00d4ff',nxtT)+mini('TIMERS ACTIFS',String(activeCount),activeCount?'#00d4ff':'rgba(255,255,255,.45)',activeCount?'Missions en cours.':'Aucun timer.')+'</div>';
}


function renderMissionBoard(){
  const board=document.getElementById('mission-board');if(!board)return;
  const total=habits.length,doneToday=habits.filter(h=>dates(h).includes(TODAY)).length;
  const pct=total?Math.round(doneToday/total*100):0;
  const activeArr=[...activeTimers].map(id=>habits.find(h=>h.__id===id)).filter(Boolean);
  const activeCount=activeArr.length;
  const level=lvlInfo((pdata&&pdata.total_xp)||0);
  const nextXp=Math.max(0,level.nextXp-level.xp);
  const bestStreak=habits.length?Math.max(0,...habits.map(h=>streak(dates(h)))):0;
  let liveSection='';
  if(activeCount>0){
    const CIRC=+(2*Math.PI*20).toFixed(2);
    const liveCards=activeArr.map(h=>{
      const c=h.color||'#2979ff';
      const st=timerBoardState[h.__id]||{tLeft:(h.duration_minutes||5)*60,isRest:false,cur:1,totalSets:h.sets||1,setS:(h.duration_minutes||5)*60,restS:(h.rest_minutes||1)*60,paused:false};
      const total2=st.isRest?st.restS:st.setS||1;
      const frac=Math.max(0,Math.min(1,st.tLeft/total2));
      const offset=CIRC*(1-frac);
      return`<div class="live-timer-card running" data-hid="${h.__id}" style="--lc:${c}">
        <div style="position:relative;width:48px;height:48px;flex-shrink:0">
          <svg width="48" height="48" viewBox="0 0 48 48" style="transform:rotate(-90deg);position:absolute;inset:0">
            <circle cx="24" cy="24" r="20" fill="none" stroke="${c}1a" stroke-width="4"/>
            <circle class="ltc-ring" cx="24" cy="24" r="20" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${offset}" style="filter:drop-shadow(0 0 6px ${c});transition:stroke-dashoffset .95s var(--spring)"/>
          </svg>
          <div class="ltc-emoji" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px">${h.icon||''}</div>
        </div>
        <div style="flex:1;min-width:0">
          <p style="font-weight:700;font-size:14px;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.name}</p>
          <p class="ltc-ser" style="font-family:'Orbitron',monospace;font-size:7px;font-weight:700;letter-spacing:1.2px;color:${c}88;margin-top:2px">${st.isRest?`REST · ${st.cur}/${st.totalSets}`:`SÉRIE ${st.cur}/${st.totalSets}`}</p>
        </div>
        <div class="ltc-time" style="font-family:'Orbitron',monospace;font-size:22px;font-weight:900;color:${c};text-shadow:0 0 20px ${c}88;min-width:66px;text-align:right;flex-shrink:0">${fmtTime(st.tLeft)}</div>
        <button onclick="restoreTimer('${h.__id}')" title="Ouvrir" style="width:34px;height:34px;border-radius:10px;background:${c}18;border:1px solid ${c}44;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .2s var(--spring)"><i data-lucide="maximize-2" style="width:13px;height:13px;color:${c}"></i></button>
      </div>`;
    }).join('');
    liveSection=`<div class="command-card" style="padding:14px 16px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><span class="command-title" style="margin-bottom:0">CHRONO ACTIFS</span><div style="display:flex;align-items:center;gap:6px"><div class="pulse-dot" style="width:7px;height:7px;border-radius:50%;background:var(--AL);box-shadow:0 0 10px var(--AG)"></div><span style="font-family:'Orbitron',monospace;font-size:8.5px;font-weight:900;color:var(--AL)">${activeCount} LIVE</span></div></div><div style="display:grid;gap:8px">${liveCards}</div></div>`;
    startLiveBoardTick();
  }else{stopLiveBoardTick();}
  if(getU()==='sao'){
    board.innerHTML=buildSAOBoard(liveSection,pct,total,doneToday,bestStreak,level,activeCount);
  }else{
    board.innerHTML=`
    <div class="command-card command-card-major"><div><span class="command-title">Command Center</span><div class="command-metric">${total?pct:0}% <span style="font-size:16px;font-weight:700;color:var(--t2)">terminé</span></div><p class="command-copy">${!total?'Crée ta première quête.':doneToday===total?'Journée validée':`<strong style="color:var(--t1)">${Math.max(total-doneToday,0)} mission${Math.max(total-doneToday,0)>1?'s':''}</strong> restantes.`}</p><div class="app-chip-row"><span class="app-chip">${doneToday}/${total||0} complétées</span><span class="app-chip">${bestStreak}j série</span><span class="app-chip">${(pdata&&pdata.total_xp)||0} XP</span></div></div><div class="command-actions"><button class="section-cta primary" onclick="openSheet('habit')">+ Quête</button><button class="section-cta" onclick="openSheet('task')">+ Tâche</button><button class="section-cta" onclick="goTab('stats')">Stats →</button></div></div>
    ${liveSection}
    <div class="command-card-grid"><div class="command-card"><span class="command-title">Prochain rang</span><div class="command-metric" style="color:${level.nextRank==='MAX'?'#ffd700':'var(--t1)'}">${level.nextRank==='MAX'?'MAX':level.nextRank}</div><p class="command-copy">${level.nextRank==='MAX'?'Rang maximum.':`${nextXp} XP restants.`}</p></div><div class="command-card"><span class="command-title">Timers actifs</span><div class="command-metric" style="color:${activeCount?'var(--AL)':'var(--t1)'}">${activeCount}</div><p class="command-copy">${activeCount?'Garde le rythme.':'Aucun timer.'}</p></div></div>`;
  }
  lucide.createIcons();
}

function renderTaskBoard(){
  const board=document.getElementById('task-board');if(!board)return;
  const completed=subtasks.filter(s=>dates(s).includes(TODAY)).length;
  const pending=Math.max(subtasks.length-completed,0);
  const ratio=subtasks.length?Math.round(completed/subtasks.length*100):0;
  board.innerHTML=`
    <div class="command-card">
      <span class="command-title">Task Flow</span>
      <div class="command-metric">${completed}<span style="font-size:14px;color:var(--t2)">/${subtasks.length||0}</span></div>
      <p class="command-copy">${subtasks.length?`${ratio}% des tâches traitées.`:'Aucune tâche créée.'}</p>
    </div>
    <div class="command-card">
      <span class="command-title">File d'attente</span>
      <div class="command-metric" style="color:${pending?'var(--AL)':'#4ade80'}">${pending}</div>
      <p class="command-copy">${pending?`${pending} étape${pending>1?'s':''} en attente.`:'File vide'}</p>
    </div>`;
}

function renderHabitSection(title,count,items,startIndex){
  if(!items.length)return'';
  return`<section class="habit-section">
    <div class="habit-section-head">
      <strong>${title}</strong>
      <span>${count}</span>
    </div>
    ${items.map((h,i)=>habitCard(h,startIndex+i)).join('')}
  </section>`;
}

function renderHabits(){
  const list=document.getElementById('habits-list');
  const emptyEl=document.getElementById('empty-habits');
  const searchEl=document.getElementById('search-empty');
  if(!list)return;
  if(!habits.length){list.innerHTML='';emptyEl.style.display='block';searchEl.style.display='none';return}
  emptyEl.style.display='none';
  const q=searchQ.toLowerCase();
  const filtered=q?habits.filter(h=>h.name.toLowerCase().includes(q)):habits;
  if(searchEl)searchEl.style.display=(q&&!filtered.length)?'block':'none';
  if(q&&!filtered.length){list.innerHTML='';lucide.createIcons();return}
  const active=filtered.filter(h=>activeTimers.has(h.__id));
  const ready=filtered.filter(h=>!activeTimers.has(h.__id)&&!dates(h).includes(TODAY));
  const done=filtered.filter(h=>dates(h).includes(TODAY));
  let cursor=0;
  list.innerHTML=[
    renderHabitSection('En cours',`${active.length} live`,active,cursor),
    (cursor+=active.length,renderHabitSection('À jouer',`${ready.length} mission${ready.length>1?'s':''}`,ready,cursor)),
    (cursor+=ready.length,renderHabitSection('Terminées',`${done.length} validée${done.length>1?'s':''}`,done,cursor))
  ].join('');
  requestAnimationFrame(()=>{
    lucide.createIcons();initDrag();initSwipe();
    // Libérer will-change après les animations d'entrée
    setTimeout(()=>{
      document.querySelectorAll('.card-in').forEach(el=>{
        el.classList.remove('card-in');
        el.style.willChange='';
      });
    },600);
  });
}

function habitCard(h,i){
  const ds=dates(h),done=ds.includes(TODAY),str=streak(ds);
  const xp=xpFinal(h,str);
  const c=h.color||'#2979ff';
  const active=activeTimers.has(h.__id);
  const delay=`animation-delay:${i*45}ms`;
  const hasTmr=h.duration_minutes>0;

  const actionBtns=active?`
    <div class="hcw-actions">
      <div style="display:flex;align-items:center;gap:6px;padding:0 8px">
        <div style="width:5px;height:5px;border-radius:50%;background:${c};box-shadow:0 0 8px ${c}" class="pulse-dot"></div>
        <span style="font-family:'Orbitron',monospace;font-size:7px;font-weight:700;color:${c}88;letter-spacing:1px;white-space:nowrap">LIVE</span>
      </div>
    </div>
    <div class="hcw-pc-actions" style="pointer-events:none;opacity:0!important"></div>`:
  `
    <div class="hcw-actions">
      <button class="btn-icon warn" onclick="openSheet('habit','${h.__id}')" style="width:40px;height:40px;border-radius:13px">
        <i data-lucide="pencil" style="width:15px;height:15px"></i>
      </button>
      <button class="btn-icon danger" onclick="askDel('habit','${h.__id}','${h.name.replace(/'/g,"\\'")}')">
        <i data-lucide="trash-2" style="width:15px;height:15px"></i>
      </button>
    </div>
    <div class="hcw-pc-actions">
      <button class="btn-icon warn" onclick="openSheet('habit','${h.__id}')" style="width:34px;height:34px;border-radius:10px" title="Modifier">
        <i data-lucide="pencil" style="width:13px;height:13px"></i>
      </button>
      <button class="btn-icon danger" onclick="askDel('habit','${h.__id}','${h.name.replace(/'/g,"\\'")}')">
        <i data-lucide="trash-2" style="width:13px;height:13px"></i>
      </button>
    </div>`;

  if(done){
    return`<div class="hcw card-in" data-id="${h.__id}" data-timer-active="${active?'1':''}" style="${delay}">
      <div class="card hcard hcard-done" style="border-color:${c}35">
        <div class="drag-handle"><i data-lucide="grip-vertical" style="width:14px;height:14px"></i></div>
        <div class="completed" style="width:46px;height:46px;border-radius:14px;background:${c}20;border:1px solid ${c}50;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 16px ${c}30"><svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px"><polyline points="4,13 9,18 20,7" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div style="flex:1;min-width:0">
          <p style="font-weight:700;font-size:16px;color:${c};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 0 12px ${c}40">${h.name}</p>
          <div style="display:flex;align-items:center;gap:7px;margin-top:3px">
            ${str>0?`<span class="streak-fire" style="display:inline-flex;align-items:center"><svg viewBox="0 0 14 16" fill="none" style="width:13px;height:13px;display:inline-block;vertical-align:middle"><path d="M7 1C7 1 10 4 10 7C10 8.5 9 9.5 7.5 9.5C8 8.5 7.5 7 6 6C6 8 4 9.5 4 11.5C4 13.5 5.5 15 7 15C9.5 15 12 13 12 10C12 6 9 3 7 1Z" fill="#ff6b35" opacity=".9"/><path d="M7 8C7 8 8.5 9 8.5 10.5C8.5 11.5 7.8 12 7 12C6.2 12 5.5 11.5 5.5 10.5C5.5 9 7 8 7 8Z" fill="#fbbf24"/></svg></span><span style="font-size:12px;font-weight:700;color:${c}">${str}j</span>`:''}
            <span style="font-size:11px;font-weight:600;color:${c}80">+${xp} XP</span>
            <span style="font-family:'Orbitron',monospace;font-size:8.5px;font-weight:700;color:${c}90;letter-spacing:.5px">DONE</span>
          </div>
        </div>
        <button onclick="uncomplete('${h.__id}')" class="btn-icon warn" title="Décocher" style="width:32px;height:32px;border-radius:9px;flex-shrink:0">
          <i data-lucide="rotate-ccw" style="width:13px;height:13px"></i>
        </button>
      </div>
      ${actionBtns}
    </div>`;
  }

  if(hasTmr){
    const sets=h.sets||1,rest=h.rest_minutes||1;
    const lbl=sets>1?`${sets}×${h.duration_minutes}min · REST ${rest}min`:`${h.duration_minutes}min`;
    return`<div class="hcw card-in" data-id="${h.__id}" data-timer-active="${active?'1':''}" style="${delay}">
      <div class="card hcard${active?' hcard-active':''}">
        <div class="drag-handle"><i data-lucide="grip-vertical" style="width:14px;height:14px"></i></div>
        <button class="tmr-btn" data-hid="${h.__id}" ${active?'disabled':''} style="width:46px;height:46px;border-radius:14px;background:${c}18;border:1px solid ${c}40;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:${active?'not-allowed':'pointer'};transition:all .25s var(--spring)">
          ${active
            ?`<i data-lucide="clock" style="width:20px;height:20px;color:${c}" class="spin-anim"></i>`
            :`<i data-lucide="play" style="width:20px;height:20px;color:${c}"></i>`
          }
        </button>
        <div style="flex:1;min-width:0">
          <p class="hcard-name" style="font-weight:700;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .35s var(--spring),text-shadow .35s;${active?`color:${c};text-shadow:0 0 14px ${c}44`:'color:var(--t1)'}">${h.name}</p>
          <div style="display:flex;align-items:center;gap:7px;margin-top:3px">
            ${str>0?`<span class="streak-fire" style="display:inline-flex;align-items:center"><svg viewBox="0 0 14 16" fill="none" style="width:13px;height:13px;display:inline-block;vertical-align:middle"><path d="M7 1C7 1 10 4 10 7C10 8.5 9 9.5 7.5 9.5C8 8.5 7.5 7 6 6C6 8 4 9.5 4 11.5C4 13.5 5.5 15 7 15C9.5 15 12 13 12 10C12 6 9 3 7 1Z" fill="#ff6b35" opacity=".9"/><path d="M7 8C7 8 8.5 9 8.5 10.5C8.5 11.5 7.8 12 7 12C6.2 12 5.5 11.5 5.5 10.5C5.5 9 7 8 7 8Z" fill="#fbbf24"/></svg></span><span style="font-size:12px;font-weight:700;color:${c}">${str}j</span>`:''}
            <span style="font-size:11px;font-weight:600;color:#4ade80aa">+${xp} XP</span>
          </div>
          <div class="tmr-label" style="margin-top:4px;min-height:14px">
            ${active
              ?`<div style="display:flex;align-items:center;gap:5px"><div class="pulse-dot" style="width:5px;height:5px;border-radius:50%;background:${c};flex-shrink:0;box-shadow:0 0 6px ${c}"></div><span style="font-family:'Orbitron',monospace;font-size:8.5px;font-weight:700;color:${c};letter-spacing:.5px">EN COURS</span></div>`
              :`<span style="font-family:'Orbitron',monospace;font-size:9px;font-weight:700;color:${c}60">${lbl}</span>`
            }
          </div>
        </div>
      </div>
      ${actionBtns}
    </div>`;
  }

  return`<div class="hcw card-in" data-id="${h.__id}" data-timer-active="${active?'1':''}" style="${delay}">
    <div class="card hcard">
      <div class="drag-handle"><i data-lucide="grip-vertical" style="width:14px;height:14px"></i></div>
      <button class="tog-btn" data-hid="${h.__id}" style="width:46px;height:46px;border-radius:14px;background:${c}16;border:1px solid ${c}35;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;cursor:pointer;transition:all .25s var(--bounce)">${h.icon||'<svg viewBox="0 0 24 24" fill="none" style="width:22px;height:22px"><polygon points="12,2 20,7 20,17 12,22 4,17 4,7" stroke="currentColor" stroke-width="1.8" fill="currentColor" fill-opacity=".15"/></svg>'}</button>
      <div style="flex:1;min-width:0">
        <p style="font-weight:700;font-size:16px;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.name}</p>
        <div style="display:flex;align-items:center;gap:7px;margin-top:3px">
          ${str>0?`<span class="streak-fire" style="display:inline-flex;align-items:center"><svg viewBox="0 0 14 16" fill="none" style="width:13px;height:13px;display:inline-block;vertical-align:middle"><path d="M7 1C7 1 10 4 10 7C10 8.5 9 9.5 7.5 9.5C8 8.5 7.5 7 6 6C6 8 4 9.5 4 11.5C4 13.5 5.5 15 7 15C9.5 15 12 13 12 10C12 6 9 3 7 1Z" fill="#ff6b35" opacity=".9"/><path d="M7 8C7 8 8.5 9 8.5 10.5C8.5 11.5 7.8 12 7 12C6.2 12 5.5 11.5 5.5 10.5C5.5 9 7 8 7 8Z" fill="#fbbf24"/></svg></span><span style="font-size:12px;font-weight:700;color:${c}">${str}j</span>`:`<span style="font-size:11px;color:var(--t3)">Commence aujourd'hui</span>`}
          <span style="font-size:11px;font-weight:600;color:#4ade80aa">+${xp} XP</span>
        </div>
      </div>
    </div>
    ${actionBtns}
  </div>`;
}

// ══════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════
function renderTaskSection(title,count,items,startIndex){
  if(!items.length)return'';
  return`<section class="habit-section">
    <div class="habit-section-head"><strong>${title}</strong><span>${count}</span></div>
    ${items.map((s,i)=>{
      const done=dates(s).includes(TODAY);
      return`<div class="card card-in" style="margin-bottom:8px;animation-delay:${(startIndex+i)*35}ms">
        <div style="display:flex;align-items:center;gap:12px;padding:14px 14px 14px 12px;${done?'background:rgba(74,222,128,.035)':''}">
          <button class="task-tog" data-tid="${s.__id}" style="width:42px;height:42px;border-radius:13px;background:${done?'rgba(74,222,128,.12)':'rgba(255,255,255,.04)'};border:1px solid ${done?'rgba(74,222,128,.35)':'rgba(255,255,255,.07)'};display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;cursor:pointer;transition:all .25s var(--spring)"style="color:${done?'rgba(74,222,128,.9)':'rgba(255,255,255,.3)'}">${done?'<svg viewBox="0 0 20 20" fill="none" style="width:18px;height:18px"><polyline points="3,10 8,15 17,5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg viewBox="0 0 20 20" fill="none" style="width:18px;height:18px"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.8"/></svg>'}</button>
          <div style="flex:1;min-width:0">
            <p style="font-weight:700;font-size:15px;color:${done?'#4ade80':'var(--t1)'};${done?'text-decoration:line-through;opacity:.65':''}; overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .3s,opacity .3s">${s.text}</p>
            <p style="font-size:11px;color:var(--t3);margin-top:2px">${new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
          <button class="btn-icon danger" onclick="askDel('task','${s.__id}','${s.text.replace(/'/g,"\\'")}')">
            <i data-lucide="trash-2" style="width:13px;height:13px"></i>
          </button>
        </div>
      </div>`;
    }).join('')}
  </section>`;
}
function renderTasks(){
  const list=document.getElementById('tasks-list'),empty=document.getElementById('empty-tasks');
  if(!list)return;
  if(!subtasks.length){list.innerHTML='';empty.style.display='block';return}
  empty.style.display='none';
  const pending=subtasks.filter(s=>!dates(s).includes(TODAY));
  const completed=subtasks.filter(s=>dates(s).includes(TODAY));
  let c=0;
  list.innerHTML=[
    renderTaskSection('À traiter',`${pending.length} ouverte${pending.length>1?'s':''}`,pending,c),
    (c+=pending.length,renderTaskSection('Terminées',`${completed.length} faite${completed.length>1?'s':''}`,completed,c))
  ].join('');
  lucide.createIcons();
}

// ══════════════════════════════════════════════
// PROGRESS / WEEK / LEVEL
// ══════════════════════════════════════════════
let _lastPct=-1;
function updateProgress(){
  const total=habits.length,done=habits.filter(h=>dates(h).includes(TODAY)).length;
  const pct=total?Math.round(done/total*100):0;
  if(pct===_lastPct)return;_lastPct=pct;
  const CIRC=138.2;
  const el=document.getElementById('prog-circle');
  if(el)el.setAttribute('stroke-dashoffset',(CIRC*(1-pct/100)).toFixed(2));
  const pt=document.getElementById('prog-txt');if(pt)pt.textContent=pct+'%';
}

let _lastWeekHash='';
function updateWeekDots(){
  const ct=document.getElementById('week-dots'),sc=document.getElementById('week-score');
  if(!ct)return;
  const days=['L','M','M','J','V','S','D'];
  const today=new Date(),dow=(today.getDay()+6)%7;
  let done=0,html='';
  for(let i=0;i<7;i++){
    const d=new Date(today);d.setDate(d.getDate()-dow+i);
    const ds=d.toISOString().split('T')[0];
    const isT=ds===TODAY,isFut=d>today&&!isT;
    const full=!isFut&&habits.length>0&&habits.every(h=>dates(h).includes(ds));
    if(full)done++;
    html+=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;animation:wdotIn .38s var(--spring) both;animation-delay:${i*48}ms">
      <div class="wdot" style="background:${full?'var(--A)':'rgba(255,255,255,.04)'};border:1px solid ${full?'var(--A)':isT?'rgba(41,121,255,.3)':'rgba(255,255,255,.06)'};box-shadow:${full?'0 0 10px var(--AG)':'none'}"></div>
      <span style="font-size:8px;font-weight:700;color:${isT?'var(--A)':'var(--t3)'};font-family:'Orbitron',monospace">${days[i]}</span>
    </div>`;
  }
  ct.innerHTML=html;
  if(sc)sc.textContent=`${done}/7`;
}

function updateLevel(){
  if(!pdata)return;
  const info=lvlInfo(pdata.total_xp||0);
  const isSAO=info.isSAO;
  const rb=document.getElementById('rank-badge'),rt=document.getElementById('rank-txt');
  if(rb){
    if(isSAO){rb.style.cssText='width:54px;height:54px;clip-path:polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);border-radius:0;border:none;background:'+info.color+'1a;box-shadow:0 0 0 1.5px '+info.color+'55,0 0 18px '+info.color+'20;display:flex;align-items:center;justify-content:center;flex-shrink:0';}
    else{rb.style.cssText='width:50px;height:50px;border-radius:15px;background:'+info.color+'18;border:1px solid '+info.color+'35;box-shadow:0 0 16px '+info.color+'20;display:flex;align-items:center;justify-content:center;flex-shrink:0';}
  }
  if(rt){
    if(isSAO)rt.innerHTML='<span style="font-size:9px;opacity:.55;display:block;line-height:1;margin-bottom:1px">NV</span><span style="font-size:16px;font-weight:900">'+info.level+'</span>';
    else rt.textContent=info.rank;
    rt.style.color=info.color;rt.style.textShadow='0 0 16px '+info.color+'60';
  }
  const xlab=document.getElementById('xp-label');
  if(xlab){
    if(isSAO){const b=(info.level-1)*25;xlab.textContent=((pdata.total_xp||0)-b)+' / 25 XP';}
    else{const b=LEVELS[info.idx]?.xp||0;xlab.textContent=(info.xp-b)+' / '+((info.nextXp||0)-b)+' XP';}
  }
  const xfill=document.getElementById('xp-fill');if(xfill&&xfill.style.width!==info.pct+'%')xfill.style.width=info.pct+'%';
  const rnext=document.getElementById('rank-next');
  if(rnext){if(info.nextRank==='MAX')rnext.textContent=isSAO?'NIVEAU MAX !':'RANG MAX !';else rnext.textContent=isSAO?'→ Niveau '+(info.level+1):'→ Rang '+info.nextRank;}
}

// ══════════════════════════════════════════════
// FORMS
// ══════════════════════════════════════════════
window.saveHabit=function(e,pfx){
  e.preventDefault();
  const name=(document.getElementById(pfx+'hname')?.value||'').trim();
  const dur=parseInt(document.getElementById(pfx+'hdur')?.value)||5;
  const sets=Math.max(1,parseInt(document.getElementById(pfx+'hsets')?.value)||1);
  const rest=Math.max(1,parseInt(document.getElementById(pfx+'hrest')?.value)||1);
  if(!name){toast('Entre un nom','error');return}
  if(editId){
    const h=habits.find(x=>x.__id===editId);
    if(h){h.name=name;h.duration_minutes=dur;h.sets=sets;h.rest_minutes=rest;h.icon=selEI;h.color=selEC;h.base_xp=xpOf(h);}
    syncAll();closeSheet();toast('Quête modifiée');renderAll();
  }else{
    if(habits.some(h=>h.name.toLowerCase()===name.toLowerCase())){toast('Quête déjà existante','error');return}
    if(!pdata)pdata={__id:genId(),total_xp:0,level:1};
    const ic=pfx?selEI:selIcon,col=pfx?selEC:selColor;
    habits.push({__id:genId(),name,icon:ic,color:col,duration_minutes:dur,sets,rest_minutes:rest,completed_dates:'',created_at:new Date().toISOString(),base_xp:0});
    habits[habits.length-1].base_xp=xpOf(habits[habits.length-1]);
    syncAll();searchQ='';const si=document.getElementById('search-input');if(si)si.value='';
    closeSheet();toast(`"${name}" créée`);renderAll();
  }
};
window.saveTask=function(e){
  e.preventDefault();
  const text=(document.getElementById('task-text')?.value||'').trim();
  if(!text)return;
  subtasks.push({__id:genId(),text,completed_dates:'',created_at:new Date().toISOString()});
  syncAll();closeSheet();toast('Tâche créée');
  scheduleTaskRender();
};

// ══════════════════════════════════════════════
// TOGGLE ACTIONS
// ══════════════════════════════════════════════
function toggleHabit(id){
  const h=habits.find(x=>x.__id===id);if(!h)return;
  const ds=dates(h),idx=ds.indexOf(TODAY);
  if(idx<0){
    ds.push(TODAY);
    const str=streak([...ds].sort().reverse());
    const xp=xpFinal(h,str);
    if(!pdata)pdata={__id:genId(),total_xp:0,level:1};
    const old=lvlInfo(pdata.total_xp).idx;
    pdata.total_xp+=xp;
    var _ni=lvlInfo(pdata.total_xp);if(_ni.idx>old)showLevelUp(_ni.isSAO?"NIVEAU "+_ni.level:_ni.rank,_ni.color);
    // Flash carte avec couleur
    const wrap=document.querySelector(`.hcw[data-id="${id}"]`);
    if(wrap){
      const card=wrap.querySelector('.card');
      if(card){
        card.style.transition='background .08s,transform .12s var(--bounce),box-shadow .2s';
        card.style.background=`${h.color}28`;
        card.style.transform='scale(1.03)';
        card.style.boxShadow=`0 0 24px ${h.color}30`;
        setTimeout(()=>{card.style.background='';card.style.transform='';card.style.boxShadow='';},120);
      }
    }
    showXP(xp);
    if(navigator.vibrate)navigator.vibrate([10,40,25]);
    h.completed_dates=ds.join(',');syncAll();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{renderAll();checkAllDay();}));
  }else{
    ds.splice(idx,1);h.completed_dates=ds.join(',');syncAll();renderAll();
  }
}
window.uncomplete=id=>{
  const h=habits.find(x=>x.__id===id);if(!h)return;
  h.completed_dates=dates(h).filter(d=>d!==TODAY).join(',');
  syncAll();toast('Décochée ↩');renderAll();
};
let _taskRenderRaf=0;
function scheduleTaskRender(){
  cancelAnimationFrame(_taskRenderRaf);
  _taskRenderRaf=scheduleTaskRender();
}
function toggleTask(id){
  const s=subtasks.find(x=>x.__id===id);if(!s)return;
  const ds=[...dates(s)],idx=ds.indexOf(TODAY);
  if(idx>=0)ds.splice(idx,1);else ds.push(TODAY);
  s.completed_dates=ds.join(',');syncAll();
  scheduleTaskRender();
}
window.filterHabits=q=>{searchQ=q.trim().toLowerCase();renderHabits()};

// ══════════════════════════════════════════════
// DELETE
// ══════════════════════════════════════════════
window.askDel=(type,id,label)=>{
  delTarget={type,id};
  document.getElementById('del-label').textContent=`"${label}" sera supprimée définitivement.`;
  const m=document.getElementById('del-modal');m.style.display='flex';
  lucide.createIcons();
};
window.cancelDel=()=>{delTarget=null;document.getElementById('del-modal').style.display='none'};
window.confirmDel=()=>{
  if(!delTarget)return;
  if(delTarget.type==='habit')habits=habits.filter(h=>h.__id!==delTarget.id);
  else subtasks=subtasks.filter(s=>s.__id!==delTarget.id);
  syncAll();cancelDel();toast('Supprimée');renderAll();
};

// ══════════════════════════════════════════════
// TIMER — modal premium avec canvas 60fps
// ══════════════════════════════════════════════
function startTimer(habitId){
  const h=habits.find(x=>x.__id===habitId);
  if(!h||activeTimers.has(habitId))return;
  const oldPill=document.getElementById('pill-'+habitId);if(oldPill)oldPill.remove();
  delete timerBoardState[habitId];
  activeTimers.add(habitId);updateHabitCard(habitId,true);
  const col=h.color,totalSets=h.sets||1;
  const setS=(h.duration_minutes||5)*60,restS=(h.rest_minutes||1)*60;
  const fs={tLeft:setS,isRest:false,cur:1,totalSets,setS,restS,paused:false,c:col,name:h.name};
  timerBoardState[habitId]={...fs};
  renderMissionBoard();
  buildTimerModal(h,habitId,fs);
}

function buildTimerModal(h,habitId,initState){
  const c=initState.c||h.color;
  let{tLeft,isRest,cur,totalSets,setS,restS,paused}=initState;
  const isD=window.innerWidth>=900;
  const bw=isD?360:Math.min(310,window.innerWidth-20);
  let iv=null;

  // Ring geometry — tout dans le viewBox, rien qui dépasse
  const R  = isD?108:80;   // rayon du cercle
  const SW = isD?12:9;     // stroke-width
  const M  = SW+4;         // marge = demi-stroke + buffer
  const VB = (R+M)*2;      // viewBox = diamètre + marges des deux côtés
  const CC = VB/2;         // centre X et Y dans le viewBox
  const CIRC = +(2*Math.PI*R).toFixed(1);

  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:rgba(1,3,12,.97);backdrop-filter:blur(20px);animation:fadeIn .15s ease-out';

  modal.innerHTML=`
  <div id="tm-card" style="
    width:${bw}px;
    background:rgba(5,10,26,.99);
    border:1px solid ${c}20;
    border-radius:${isD?26:20}px;
    box-shadow:0 28px 70px rgba(0,0,0,.9);
    animation:timerIn .32s var(--spring) both;
    position:relative">

    <!-- Ligne top -->
    <div style="position:absolute;top:0;left:0;right:0;height:1px;border-radius:${isD?26:20}px ${isD?26:20}px 0 0;background:linear-gradient(90deg,transparent,${c}77,transparent)"></div>

    <!-- Header -->
    <div style="padding:${isD?16:13}px ${isD?20:15}px ${isD?6:5}px;display:flex;align-items:center;gap:9px">
      <div style="width:34px;height:34px;border-radius:10px;background:${c}14;border:1px solid ${c}22;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">${h.icon||''}</div>
      <div style="flex:1;min-width:0">
        <div id="tm-lbl" style="font-family:'Orbitron',monospace;font-size:6px;font-weight:700;letter-spacing:2.5px;color:${c}44;text-transform:uppercase;margin-bottom:2px">SÉRIE ${cur}/${totalSets}</div>
        <div style="font-size:${isD?14:12}px;font-weight:700;color:rgba(255,255,255,.8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.name}</div>
      </div>
      <button id="tm-min" style="width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0" title="Réduire">
        <i data-lucide="minus" style="width:10px;height:10px;color:rgba(255,255,255,.3)"></i>
      </button>
    </div>

    <!-- Barres série -->
    <div style="padding:0 ${isD?20:15}px ${isD?2:2}px">
      <div style="display:flex;gap:3px;height:2px">
        ${Array.from({length:totalSets},(_,i)=>`<div id="tb${i}" style="flex:1;border-radius:99px;background:${i===0?c:'rgba(255,255,255,.06)'};transition:background .3s,box-shadow .3s"></div>`).join('')}
      </div>
    </div>

    <!-- Ring zone -->
    <div style="display:flex;align-items:center;justify-content:center;padding:${isD?16:11}px 0 ${isD?14:10}px;position:relative">

      <!-- SVG ring — viewBox inclut les marges, rien ne dépasse -->
      <svg viewBox="0 0 ${VB} ${VB}" style="width:${VB}px;height:${VB}px;max-width:calc(${bw}px - ${isD?40:30}px);transform:rotate(-90deg)">
        <!-- Track fond -->
        <circle cx="${CC}" cy="${CC}" r="${R}" fill="none" stroke="${c}0e" stroke-width="${SW+4}"/>
        <circle cx="${CC}" cy="${CC}" r="${R}" fill="none" stroke="${c}1a" stroke-width="${SW}"/>
        <!-- Arc de progression -->
        <circle id="tm-arc" cx="${CC}" cy="${CC}" r="${R}" fill="none"
          stroke="${c}" stroke-width="${SW}" stroke-linecap="round"
          stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"
          style="transition:stroke-dashoffset 1s linear,stroke .3s,opacity .3s;filter:drop-shadow(0 0 6px ${c})"/>
      </svg>

      <!-- Texte superposé (position absolute centré sur le SVG) -->
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;pointer-events:none">
        <div id="tm-pause-icon" style="opacity:0;transition:opacity .22s;position:absolute;top:50%;left:50%;transform:translate(-50%,-62%)">
          <svg viewBox="0 0 32 32" fill="none" style="width:${isD?30:24}px;height:${isD?30:24}px">
            <rect x="5" y="4" width="8" height="24" rx="3.5" fill="rgba(255,255,255,.45)"/>
            <rect x="19" y="4" width="8" height="24" rx="3.5" fill="rgba(255,255,255,.45)"/>
          </svg>
        </div>
        <div id="tm-disp" style="
          font-family:'Orbitron',monospace;
          font-size:${isD?60:40}px;
          font-weight:900;
          letter-spacing:-1px;
          line-height:1;
          color:${c};
          text-shadow:0 0 24px ${c}55;
          transition:color .3s,text-shadow .3s,opacity .3s">
          ${fmtTime(tLeft)}
        </div>
        <div id="tm-unit" style="
          font-family:'Orbitron',monospace;
          font-size:${isD?6.5:5.5}px;
          font-weight:700;
          letter-spacing:${isD?3:2.5}px;
          color:${c}35;
          text-transform:uppercase;
          margin-top:${isD?5:4}px;
          transition:color .3s">
          ${isRest?'REPOS':'SÉRIE'} ${cur}/${totalSets}
        </div>
      </div>

    </div>

    <!-- Boutons -->
    <div style="padding:0 ${isD?20:15}px ${isD?18:14}px;display:flex;gap:8px">
      <button id="tm-pause" style="
        flex:1;padding:${isD?13:11}px;
        border-radius:${isD?13:11}px;
        background:${c};border:none;color:#fff;
        font-family:'Orbitron',monospace;font-size:${isD?8.5:7.5}px;font-weight:700;letter-spacing:2px;
        cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:7px;
        transition:background .2s,box-shadow .2s,transform .12s;
        box-shadow:0 5px 16px ${c}35">
        <span id="tm-pi" style="display:flex;align-items:center;width:13px;height:13px"></span>
        <span id="tm-pl">PAUSE</span>
      </button>
      <button id="tm-stop" style="
        width:${isD?46:40}px;
        border-radius:${isD?13:11}px;
        background:rgba(255,255,255,.04);
        border:1px solid rgba(255,255,255,.07);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;flex-shrink:0">
        <i data-lucide="square" style="width:13px;height:13px;color:rgba(255,255,255,.28)"></i>
      </button>
    </div>
  </div>`;

  document.body.appendChild(modal);
  requestAnimationFrame(()=>lucide.createIcons());

  const arc       = modal.querySelector('#tm-arc');
  const tDisp     = modal.querySelector('#tm-disp');
  const tUnit     = modal.querySelector('#tm-unit');
  const tLbl      = modal.querySelector('#tm-lbl');
  const tPI       = modal.querySelector('#tm-pi');
  const tPL       = modal.querySelector('#tm-pl');
  const tPauseBtn = modal.querySelector('#tm-pause');
  const pauseIcon = modal.querySelector('#tm-pause-icon');

  const SVG_PAUSE=`<svg viewBox="0 0 14 14" fill="none" style="width:100%;height:100%"><rect x="2" y="1" width="3.5" height="12" rx="1.5" fill="currentColor"/><rect x="8.5" y="1" width="3.5" height="12" rx="1.5" fill="currentColor"/></svg>`;
  const SVG_PLAY=`<svg viewBox="0 0 14 14" fill="none" style="width:100%;height:100%"><polygon points="2,1 13,7 2,13" fill="currentColor"/></svg>`;

  function getTotal(){ return isRest?restS:setS; }

  function refreshDOM(){
    const cc=isRest?'#29b6f6':c;
    const total=getTotal();
    const t=total>0?Math.max(0,Math.min(1,tLeft/total)):0;

    // Arc SVG
    arc.style.strokeDashoffset=(CIRC*(1-t)).toFixed(1);
    arc.setAttribute('stroke',cc);
    arc.style.filter=`drop-shadow(0 0 6px ${cc})`;
    arc.style.opacity=paused?'0.28':'1';

    // Temps
    tDisp.textContent=fmtTime(tLeft);
    tDisp.style.color=paused?'rgba(255,255,255,.3)':cc;
    tDisp.style.textShadow=paused?'none':`0 0 24px ${cc}55`;
    tDisp.style.opacity=paused?'0.5':'1';

    // Icône pause
    pauseIcon.style.opacity=paused?'1':'0';

    // Labels
    tUnit.textContent=(isRest?'REPOS':'SÉRIE')+` ${cur}/${totalSets}`;
    tUnit.style.color=paused?'rgba(255,255,255,.12)':`${cc}35`;
    if(tLbl){tLbl.textContent=`${isRest?'REST':'SÉRIE'} ${cur}/${totalSets}`;tLbl.style.color=paused?'rgba(255,255,255,.1)':`${cc}44`;}

    // Bouton pause
    tPI.innerHTML=paused?SVG_PLAY:SVG_PAUSE;
    tPL.textContent=paused?'REPRENDRE':'PAUSE';
    tPauseBtn.style.background=paused?'rgba(255,255,255,.06)':cc;
    tPauseBtn.style.boxShadow=paused?'none':`0 5px 16px ${cc}35`;
    tPauseBtn.style.color=paused?'rgba(255,255,255,.4)':'#fff';
    tPauseBtn.style.border=paused?'1px solid rgba(255,255,255,.1)':'1px solid transparent';

    // Barres série
    for(let i=0;i<totalSets;i++){
      const b=modal.querySelector('#tb'+i);if(!b)continue;
      if(i<cur-1){b.style.background=c;b.style.boxShadow=`0 0 4px ${c}55`;}
      else if(i===cur-1){b.style.background=isRest?'rgba(41,182,246,.5)':`${cc}aa`;b.style.boxShadow=`0 0 7px ${cc}55`;}
      else{b.style.background='rgba(255,255,255,.06)';b.style.boxShadow='none';}
    }

    timerBoardState[habitId]={tLeft,isRest,cur,totalSets,setS,restS,paused,c,name:h.name};
  }

  function resetRing(){
    arc.style.transition='none';
    arc.style.strokeDashoffset=CIRC;
    requestAnimationFrame(()=>{
      arc.style.transition='stroke-dashoffset 1s linear,stroke .3s,opacity .3s';
    });
  }

  let _endAt=null;
  function tick(){
    if(_endAt===null)return;
    const newTL=Math.max(0,Math.floor((_endAt-performance.now())/1000));
    if(newTL!==tLeft){tLeft=newTL;refreshDOM();}
    if(tLeft<=0){
      clearInterval(iv);iv=null;_endAt=null;
      playSound();if(navigator.vibrate)navigator.vibrate([40,60,40,60,100]);
      if(isRest){isRest=false;tLeft=setS;_endAt=performance.now()+tLeft*1000;resetRing();refreshDOM();iv=setInterval(tick,200);}
      else if(cur<totalSets){cur++;isRest=true;tLeft=restS;_endAt=performance.now()+tLeft*1000;resetRing();refreshDOM();iv=setInterval(tick,200);}
      else{completedTimer(h,modal);}
    }
  }
  tPauseBtn.addEventListener('click',()=>{
    paused=!paused;
    if(paused){clearInterval(iv);iv=null;if(_endAt!==null){tLeft=Math.max(0,Math.floor((_endAt-performance.now())/1000));}_endAt=null;}
    else{_endAt=performance.now()+tLeft*1000;iv=setInterval(tick,200);}
    tPauseBtn.style.transform='scale(.9)';setTimeout(()=>{tPauseBtn.style.transform='';},110);
    refreshDOM();
  });

  modal.querySelector('#tm-stop').addEventListener('click',()=>{
    clearInterval(iv);
    delete timerBoardState[habitId];activeTimers.delete(habitId);
    modal.remove();updateHabitCard(habitId,false);renderMissionBoard();
  });

  modal.querySelector('#tm-min').addEventListener('click',()=>{
    clearInterval(iv);modal.remove();
    showPill(h,habitId,{tLeft,isRest,paused,cur,totalSets,setS,restS,c});
  });

  tPI.innerHTML=SVG_PAUSE;
  refreshDOM();
  if(!paused){_endAt=performance.now()+tLeft*1000;iv=setInterval(tick,200);}
}





window.restoreTimer=function(habitId){
  const ex=document.getElementById('pill-'+habitId);if(ex)ex.remove();
  const st=timerBoardState[habitId];if(!st)return;
  const h=habits.find(x=>x.__id===habitId);if(!h)return;
  buildTimerModal(h,habitId,{...st});
};


function completedTimer(h,modal){
  activeTimers.delete(h.__id);updateHabitCard(h.__id,false);
  delete timerBoardState[h.__id];
  const hh=habits.find(x=>x.__id===h.__id);if(!hh)return;
  const ds=dates(hh);ds.push(TODAY);
  const str=streak([...ds].sort().reverse());
  const xp=xpFinal(hh,str);
  if(!pdata)pdata={__id:genId(),total_xp:0,level:1};
  const old=lvlInfo(pdata.total_xp).idx;
  pdata.total_xp+=xp;
  var _ni=lvlInfo(pdata.total_xp);if(_ni.idx>old)showLevelUp(_ni.isSAO?"NIVEAU "+_ni.level:_ni.rank,_ni.color);
  hh.completed_dates=ds.join(',');syncAll();
  if(navigator.vibrate)navigator.vibrate([50,30,50,30,180]);
  if(modal){
    modal.innerHTML=`<div style="text-align:center;padding:52px 36px;animation:rise .5s var(--spring)">
      <div style="margin-bottom:16px;animation:pop .6s var(--bounce)"><svg viewBox="0 0 64 64" fill="none" style="width:56px;height:56px"><polygon points="36,4 20,34 30,34 28,60 44,30 34,30" fill="#2979ff" opacity=".9" filter="url(#gf)"/><defs><filter id="gf"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg></div>
      <p style="font-family:'Orbitron',monospace;font-size:20px;font-weight:900;letter-spacing:2px;color:#4ade80;text-shadow:0 0 24px rgba(74,222,128,.6)">VICTOIRE !</p>
      <p style="font-size:16px;font-weight:700;color:rgba(74,222,128,.5);margin-top:10px">+${xp} XP</p>
    </div>`;
    modal.style.background='rgba(2,8,18,.96)';
  }
  setTimeout(()=>{if(modal)modal.remove();renderAll();checkAllDay();},2100);
}

function updateHabitCard(id,active){
  const wrap=document.querySelector(`.hcw[data-id="${id}"]`);if(!wrap)return;
  const card=wrap.querySelector('.card');if(!card)return;
  const h=habits.find(x=>x.__id===id);if(!h)return;
  const c=h.color;

  // Verrouiller/déverrouiller l'attribut CSS pour bloquer hover PC
  wrap.setAttribute('data-timer-active',active?'1':'');
  card.classList.toggle('hcard-active',active);

  // Bouton play/clock
  const pb=wrap.querySelector('.tmr-btn');
  if(pb){
    pb.disabled=active;pb.style.cursor=active?'not-allowed':'pointer';
    pb.innerHTML=active
      ?`<i data-lucide="clock" style="width:20px;height:20px;color:${c}" class="spin-anim"></i>`
      :`<i data-lucide="play" style="width:20px;height:20px;color:${c}"></i>`;
  }

  // Nom + label
  const nameEl=wrap.querySelector('.hcard-name');
  if(nameEl){nameEl.style.color=active?c:'var(--t1)';nameEl.style.textShadow=active?`0 0 14px ${c}44`:'';}
  const lbl=wrap.querySelector('.tmr-label');
  if(lbl){
    const sets=h.sets||1,rest=h.rest_minutes||1,l=sets>1?`${sets}x${h.duration_minutes}min REST${rest}min`:`${h.duration_minutes}min`;
    lbl.innerHTML=active
      ?`<div style="display:flex;align-items:center;gap:5px"><div class="pulse-dot" style="width:5px;height:5px;border-radius:50%;background:${c};flex-shrink:0;box-shadow:0 0 8px ${c}"></div><span style="font-family:'Orbitron',monospace;font-size:8.5px;font-weight:700;color:${c};letter-spacing:.5px">EN COURS</span></div>`
      :`<span style="font-family:'Orbitron',monospace;font-size:9px;font-weight:700;color:${c}60">${l}</span>`;
  }

  // Boutons mobile (swipe reveal) — verrouiller pendant le timer
  const mobileAct=wrap.querySelector('.hcw-actions');
  if(mobileAct){
    if(active){
      mobileAct.innerHTML=`<div style="display:flex;align-items:center;gap:6px;padding:0 12px"><div class="pulse-dot" style="width:5px;height:5px;border-radius:50%;background:${c};box-shadow:0 0 8px ${c}"></div><span style="font-family:'Orbitron',monospace;font-size:7px;font-weight:700;color:${c}88;letter-spacing:1px;white-space:nowrap">LIVE</span></div>`;
    }else{
      mobileAct.innerHTML=`<button class="btn-icon warn" onclick="openSheet('habit','${id}')" style="width:40px;height:40px;border-radius:13px"><i data-lucide="pencil" style="width:15px;height:15px"></i></button><button class="btn-icon danger" onclick="askDel('habit','${id}','${h.name.replace(/'/g,"\\'")}')"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button>`;
    }
  }

  // Boutons PC (hover) — vider le contenu et bloquer pointer-events
  const pcAct=wrap.querySelector('.hcw-pc-actions');
  if(pcAct){
    if(active){
      pcAct.innerHTML='';
      pcAct.style.cssText='pointer-events:none;opacity:0';
    }else{
      pcAct.innerHTML=`<button class="btn-icon warn" onclick="openSheet('habit','${id}')" style="width:34px;height:34px;border-radius:10px" title="Modifier"><i data-lucide="pencil" style="width:13px;height:13px"></i></button><button class="btn-icon danger" onclick="askDel('habit','${id}','${h.name.replace(/'/g,"\\'")}')"><i data-lucide="trash-2" style="width:13px;height:13px"></i></button>`;
      pcAct.style.cssText='';
    }
  }

  lucide.createIcons();
}

// ══ PILL ══ (minimisée — plus visible)
function showPill(h,id,state){
  const ex=document.getElementById('pill-'+id);if(ex)ex.remove();
  const c=state.c;
  let{tLeft,isRest,cur,totalSets,setS,restS}=state;
  let paused=state.paused||false,lv=null;
  const CIRC=+(2*Math.PI*25).toFixed(2);
  timerBoardState[id]={tLeft,isRest,cur,totalSets,setS,restS,paused,c,name:h.name};

  const pill=document.createElement('div');
  pill.id='pill-'+id;
  pill.style.cssText=`pointer-events:auto;border-radius:20px;overflow:hidden;animation:rise .32s var(--spring);box-shadow:0 16px 50px rgba(0,0,0,.6),0 0 0 1px ${c}22,0 0 40px ${c}10;transition:box-shadow .3s;position:relative`;
  pill.innerHTML=`
    <div style="position:absolute;inset:0;background:rgba(3,7,20,.97);backdrop-filter:blur(32px)"></div>
    <div style="position:absolute;top:0;left:0;right:0;height:1.5px;background:linear-gradient(90deg,transparent,${c}bb,${c}77,transparent)"></div>
    <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(to bottom,${c},${c}44)"></div>
    <div style="position:relative;z-index:1;display:flex;align-items:center;gap:11px;padding:12px 14px 12px 18px">
      <div style="position:relative;width:52px;height:52px;flex-shrink:0">
        <svg width="60" height="60" viewBox="0 0 60 60" style="transform:rotate(-90deg);position:absolute;inset:-4px">
          <circle cx="30" cy="30" r="25" fill="none" stroke="${c}15" stroke-width="4.5"/>
          <circle id="pr-${id}" cx="30" cy="30" r="25" fill="none" stroke="${c}" stroke-width="4.5" stroke-linecap="round"
            stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"
            style="filter:drop-shadow(0 0 6px ${c});transition:stroke-dashoffset .9s var(--spring),stroke .3s;will-change:stroke-dashoffset"/>
        </svg>
        <!-- Icône de la quête -->
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px">${h.icon||''}</div>
        <!-- Badge état (repos/actif) en bas-droite -->
        <div id="pe-${id}" style="position:absolute;bottom:-1px;right:-1px;width:17px;height:17px;border-radius:50%;background:${c};display:flex;align-items:center;justify-content:center;box-shadow:0 0 6px ${c};border:1.5px solid rgba(3,7,20,.97)">${isRest?'<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><rect x=".5" y="2.5" width="8" height="1.5" rx=".75" fill="#fff" opacity=".9"/><rect x="2" y="5" width="5" height="1.2" rx=".6" fill="#fff" opacity=".55"/></svg>':'<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><polygon points="2,1 8,4.5 2,8" fill="#fff"/></svg>'}</div>
      </div>
      <div style="flex:1;min-width:0">
        <p style="font-weight:700;font-size:14px;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.name}</p>
        <p id="ps-${id}" style="font-family:'Orbitron',monospace;font-size:7.5px;font-weight:700;letter-spacing:1.5px;color:${c}88;margin-top:3px;transition:color .3s">SÉRIE ${cur}/${totalSets}</p>
      </div>
      <div id="pt-${id}" style="font-family:'Orbitron',monospace;font-size:26px;font-weight:900;color:${c};text-shadow:0 0 20px ${c}88;min-width:72px;text-align:right;flex-shrink:0;transition:color .3s,text-shadow .3s">${fmtTime(tLeft)}</div>
      <button id="pp-${id}" style="width:40px;height:40px;border-radius:13px;background:${c}20;border:1px solid ${c}50;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .22s var(--spring)">
        <i data-lucide="pause" style="width:15px;height:15px;color:${c}"></i>
      </button>
      <button id="pex-${id}" onclick="restoreTimer('${id}')" style="width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .22s var(--spring)" title="Agrandir">
        <i data-lucide="maximize-2" style="width:14px;height:14px;color:rgba(255,255,255,.4)"></i>
      </button>
      <button id="ps2-${id}" style="width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .2s" title="Arrêter">
        <i data-lucide="square" style="width:13px;height:13px;color:rgba(255,255,255,.3)"></i>
      </button>
    </div>`;

  const stack=document.getElementById('tstack');if(stack)stack.appendChild(pill);
  lucide.createIcons();

  function rfn(){
    const cc=isRest?'#29b6f6':c;
    const total2=isRest?restS:setS;
    const frac=Math.max(0,Math.min(1,tLeft/total2));
    const offset=CIRC*(1-frac);
    const rr=document.getElementById('pr-'+id);
    if(rr){rr.style.strokeDashoffset=offset;rr.setAttribute('stroke',paused?'rgba(255,255,255,.1)':cc);}
    const te=document.getElementById('pt-'+id);
    if(te){te.textContent=fmtTime(tLeft);te.style.color=paused?'rgba(255,255,255,.2)':cc;te.style.textShadow=paused?'none':`0 0 20px ${cc}88`;}
    const se=document.getElementById('ps-'+id);
    if(se){se.textContent=isRest?`REST · ${cur}/${totalSets}`:`SÉRIE ${cur}/${totalSets}`;se.style.color=paused?'rgba(255,255,255,.1)':`${cc}88`;}
    const em=document.getElementById('pe-'+id);
    if(em)em.innerHTML=isRest?'<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><rect x=".5" y="2.5" width="8" height="1.5" rx=".75" fill="#fff" opacity=".9"/><rect x="2" y="5" width="5" height="1.2" rx=".6" fill="#fff" opacity=".55"/></svg>':'<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><polygon points="2,1 8,4.5 2,8" fill="#fff"/></svg>';
    const pb=document.getElementById('pp-'+id);
    if(pb){
      pb.innerHTML=paused
        ?`<i data-lucide="play" style="width:15px;height:15px;color:rgba(255,255,255,.45)"></i>`
        :`<i data-lucide="pause" style="width:15px;height:15px;color:${cc}"></i>`;
      pb.style.background=paused?'rgba(255,255,255,.05)':`${cc}20`;
      pb.style.borderColor=paused?'rgba(255,255,255,.08)':`${cc}50`;
      lucide.createIcons();
    }
    pill.style.boxShadow=`0 16px 50px rgba(0,0,0,.6),0 0 0 1px ${paused?'rgba(255,255,255,.06)':cc+'22'},0 0 40px ${paused?'transparent':cc+'10'}`;
    timerBoardState[id]={tLeft,isRest,cur,totalSets,setS,restS,paused,c,name:h.name};
  }
  function resetPillRing(){
    // Supprime la transition le temps du reset pour éviter l'animation inversée
    const rr=document.getElementById('pr-'+id);
    if(!rr)return;
    rr.style.transition='none';
    rr.style.strokeDashoffset=CIRC;
    // Réactive la transition au prochain frame
    requestAnimationFrame(()=>{
      rr.style.transition='stroke-dashoffset .95s var(--spring),stroke .3s';
    });
  }
  let _pEndAt=null;
  function pillTick(){
    if(_pEndAt===null)return;
    const newT=Math.max(0,Math.floor((_pEndAt-performance.now())/1000));
    if(newT!==tLeft){tLeft=newT;rfn();}
    if(tLeft<=0){
      clearInterval(lv);lv=null;_pEndAt=null;
      playSound();if(navigator.vibrate)navigator.vibrate([30,40,80]);
      if(isRest){isRest=false;tLeft=setS;_pEndAt=performance.now()+tLeft*1000;resetPillRing();rfn();lv=setInterval(pillTick,200);}
      else if(cur<totalSets){cur++;isRest=true;tLeft=restS;_pEndAt=performance.now()+tLeft*1000;resetPillRing();rfn();lv=setInterval(pillTick,200);}
      else{pill.remove();completedTimer(h,null);activeTimers.delete(id);updateHabitCard(id,false);}
    }
  }
  const pb2=document.getElementById('pp-'+id),sb=document.getElementById('ps2-'+id);
  if(pb2)pb2.addEventListener('click',()=>{
    paused=!paused;
    if(paused){clearInterval(lv);lv=null;if(_pEndAt!==null){tLeft=Math.max(0,Math.floor((_pEndAt-performance.now())/1000));}_pEndAt=null;}
    else{_pEndAt=performance.now()+tLeft*1000;lv=setInterval(pillTick,200);}
    rfn();
  });
  if(sb)sb.addEventListener('click',()=>{clearInterval(lv);pill.remove();delete timerBoardState[id];activeTimers.delete(id);updateHabitCard(id,false);renderMissionBoard();});
  rfn();if(!paused){_pEndAt=performance.now()+tLeft*1000;lv=setInterval(pillTick,200);}
}


// ══════════════════════════════════════════════
// DRAG & DROP
// ══════════════════════════════════════════════
let _dragSrc=null;
function initDrag(){
  const list=document.getElementById('habits-list');if(!list)return;
  list.querySelectorAll('.hcw').forEach(card=>{
    card.draggable=true;
    card.addEventListener('dragstart',e=>{_dragSrc=card;card.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
    card.addEventListener('dragend',()=>{card.classList.remove('dragging');list.querySelectorAll('.drag-over').forEach(c=>c.classList.remove('drag-over'));_dragSrc=null;});
    card.addEventListener('dragover',e=>{e.preventDefault();if(_dragSrc&&_dragSrc!==card){list.querySelectorAll('.drag-over').forEach(c=>c.classList.remove('drag-over'));card.classList.add('drag-over');}});
    card.addEventListener('drop',e=>{
      e.preventDefault();if(!_dragSrc||_dragSrc===card)return;
      const fi=habits.findIndex(h=>h.__id===_dragSrc.dataset.id);
      const ti=habits.findIndex(h=>h.__id===card.dataset.id);
      if(fi<0||ti<0)return;
      const[m]=habits.splice(fi,1);habits.splice(ti,0,m);syncAll();
      card.classList.remove('drag-over');renderHabits();
    });
  });
  list.querySelectorAll('.drag-handle').forEach(handle=>{
    let sy,srcWrap=null,ghost=null,lastOver=null,isDrag=false;
    let srcLeft=0;
    handle.addEventListener('pointerdown',e=>{srcWrap=handle.closest('.hcw');if(!srcWrap)return;sy=e.clientY;srcLeft=srcWrap.getBoundingClientRect().left;isDrag=false;handle.setPointerCapture(e.pointerId);});
    handle.addEventListener('pointermove',e=>{
      if(!srcWrap)return;
      if(!isDrag&&Math.abs(e.clientY-sy)>6){
        isDrag=true;ghost=srcWrap.cloneNode(true);
        ghost.style.cssText=`position:fixed;z-index:9999;width:${srcWrap.offsetWidth}px;opacity:.62;pointer-events:none;transform:scale(1.03) rotate(.4deg);will-change:top,left;`;
        document.body.appendChild(ghost);srcWrap.classList.add('dragging');
      }
      if(!isDrag||!ghost)return;
      e.preventDefault();
      ghost.style.top=(e.clientY-32)+'px';ghost.style.left=srcLeft+'px';
      const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('.hcw');
      if(lastOver&&lastOver!==srcWrap)lastOver.classList.remove('drag-over');
      if(el&&el!==srcWrap){el.classList.add('drag-over');lastOver=el;}
    });
    const cleanup=()=>{ghost?.remove();ghost=null;srcWrap?.classList.remove('dragging');lastOver?.classList.remove('drag-over');isDrag=false;srcWrap=null;lastOver=null;};
    handle.addEventListener('pointerup',e=>{
      if(isDrag&&lastOver&&lastOver!==srcWrap){
        const fi=habits.findIndex(h=>h.__id===srcWrap.dataset.id);
        const ti=habits.findIndex(h=>h.__id===lastOver.dataset.id);
        if(fi>=0&&ti>=0){const[m]=habits.splice(fi,1);habits.splice(ti,0,m);syncAll();}
      }
      cleanup();renderHabits();
    });
    handle.addEventListener('pointercancel',cleanup);
  });
}

// ══════════════════════════════════════════════
// SWIPE
// ══════════════════════════════════════════════
let _swipeController=null;
function initSwipe(){
  if(_swipeController)_swipeController.abort();
  _swipeController=new AbortController();
  const sig={signal:_swipeController.signal};
  const listEl=document.getElementById('habits-list');if(!listEl)return;
  let ts=0,tx=0,target=null;
  listEl.addEventListener('touchstart',e=>{target=e.target.closest('.hcw');ts=e.touches[0].clientX;tx=0;},{passive:true,...sig});
  listEl.addEventListener('touchmove',e=>{if(!target)return;tx=e.touches[0].clientX-ts;},{passive:true,...sig});
  listEl.addEventListener('touchend',()=>{
    if(!target)return;
    const hid=target.dataset.id;
    const isActive=hid&&activeTimers.has(hid);
    if(!isActive){
      if(tx<-52){document.querySelectorAll('.hcw.open').forEach(w=>{if(w!==target)w.classList.remove('open');});target.classList.add('open');}
      else if(tx>30){target.classList.remove('open');}
    }
    target=null;
  },{passive:true,...sig});
}

// ══════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════
function renderStatsHero(){
  const card=document.getElementById('stats-hero-card');if(!card)return;
  const total=habits.length,todayDone=habits.filter(h=>dates(h).includes(TODAY)).length;
  const best=Math.max(0,...habits.map(h=>streak(dates(h))));
  const level=lvlInfo((pdata&&pdata.total_xp)||0);
  card.innerHTML=`
    <div class="insight-grid">
      <div>
        <span class="status-pill" style="cursor:default">Performance</span>
        <h3 class="page-title">Vue d'ensemble du système</h3>
        <p class="page-copy">Lis en un coup d'œil ta cadence, ton rang et la solidité de ta discipline.</p>
      </div>
      <div class="mini-kpi-grid">
        <div class="mini-kpi"><strong>${level.rank}</strong><span>${getU()==='sao'?'Niveau actuel':'Rang actuel'}</span></div>
        <div class="mini-kpi"><strong>${todayDone}/${total||0}</strong><span>Réalisé aujourd'hui</span></div>
        <div class="mini-kpi"><strong>${best}j</strong><span id="lbl-streak">Meilleure série</span></div>
        <div class="mini-kpi"><strong>${(pdata&&pdata.total_xp)||0}</strong><span>XP cumulée</span></div>
      </div>
    </div>`;
}

function renderStats(){
  renderStatsHero();
  const today=new Date(),yr=today.getFullYear(),mo=today.getMonth(),dmax=today.getDate();
  const ds=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const isDone=(h,s)=>dates(h).includes(s);
  const total=habits.length;
  const todayDone=habits.filter(h=>isDone(h,TODAY)).length;
  const best=Math.max(0,...habits.map(h=>streak(dates(h))));
  let mDone=0,mPos=0;
  for(let d=1;d<=dmax;d++){const s=ds(yr,mo,d);mPos+=habits.length;mDone+=habits.filter(h=>isDone(h,s)).length;}
  const pct=mPos>0?Math.round(mDone/mPos*100):0;

  countAnim(document.getElementById('s-total'),total,'',550);
  countAnim(document.getElementById('s-today'),todayDone,'',550);
  countAnim(document.getElementById('s-streak'),best,'j',650);
  countAnim(document.getElementById('s-month'),pct,'%',700);

  const days14=Array.from({length:14},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-13+i);return d;});
  const bv=days14.map(d=>{const s=d.toISOString().split('T')[0];const n=habits.filter(h=>isDone(h,s)).length;return{s,n,pct:habits.length?n/habits.length:0,d};});
  const avg=bv.length?Math.round(bv.reduce((a,v)=>a+v.pct,0)/bv.length*100):0;
  const ae=document.getElementById('s-avg');if(ae)ae.textContent=`moy. ${avg}%`;
  const dnames=['D','L','M','M','J','V','S'];
  const bc=document.getElementById('bar-chart');
  if(bc)bc.innerHTML=bv.map(v=>{
    const isT=v.s===TODAY,isFut=v.d>today&&!isT;
    const ht=isFut?4:Math.max(v.pct*100,v.n>0?8:4);
    const bg=isFut?'rgba(80,140,255,.04)':v.n===habits.length&&habits.length>0?'var(--A)':v.n>0?'rgba(41,121,255,.4)':'rgba(80,140,255,.07)';
    return`<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;position:relative">
      ${isT?`<div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);font-family:'Orbitron',monospace;font-size:6px;color:var(--A);white-space:nowrap">${v.n}/${habits.length}</div>`:''}
      <div style="background:${bg};height:${ht}%;border-radius:4px 4px 0 0;min-height:3px;${v.n===habits.length&&habits.length>0?'box-shadow:0 0 8px var(--AG);':''}${isT?'outline:1.5px solid rgba(41,121,255,.5);outline-offset:1px;':''}transition:height .65s var(--spring)" data-h="${ht}" class="bar-col"></div>
    </div>`;
  }).join('');
  const bl=document.getElementById('bar-labels');
  if(bl)bl.innerHTML=bv.map(v=>`<div style="flex:1;text-align:center;font-family:'Orbitron',monospace;font-size:5.5px;font-weight:700;color:${v.s===TODAY?'var(--A)':'var(--t3)'}">${dnames[v.d.getDay()]}</div>`).join('');
  requestAnimationFrame(()=>{requestAnimationFrame(()=>{document.querySelectorAll('.bar-col').forEach((b,i)=>{const ht=b.dataset.h;b.style.height='0%';setTimeout(()=>{b.style.height=ht+'%';},i*25+16);});});});

  const mNames=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const dim=new Date(yr,mo+1,0).getDate();
  const cl=document.getElementById('cal-label');if(cl)cl.textContent=`${mNames[mo]} ${yr}`;
  const cp2=document.getElementById('cal-pct');if(cp2)cp2.textContent=pct+'%';
  const leg=document.getElementById('cal-legend');
  if(leg)leg.innerHTML=habits.slice(0,5).map(h=>`<div style="width:7px;height:7px;border-radius:2px;background:${h.color};box-shadow:0 0 4px ${h.color}66"></div>`).join('');
  const hwd=habits.filter(h=>Array.from({length:dim},(_,i)=>i+1).some(d=>isDone(h,ds(yr,mo,d))));
  const cg=document.getElementById('cal-grid');if(!cg)return;
  if(!hwd.length){cg.innerHTML=`<p style="text-align:center;padding:22px;font-size:11px;color:var(--t3)">${!habits.length?'Créez des quêtes pour voir le calendrier':'Aucune quête complétée ce mois'}</p>`;return;}
  const CELL=15,NW=74,GAP=2,TW=NW+(CELL+GAP)*dim;
  let html=`<div style="width:${TW}px"><div style="display:flex;gap:${GAP}px;padding-left:${NW}px;margin-bottom:${GAP}px">`;
  for(let d=1;d<=dim;d++){html+=`<div style="width:${CELL}px;text-align:center;font-family:'Orbitron',monospace;font-size:5px;font-weight:700;color:${d===dmax?'var(--A)':'rgba(80,140,255,.22)'};flex-shrink:0">${d}</div>`;}
  html+='</div>';
  hwd.forEach(h=>{
    const str2=streak(dates(h).filter(Boolean));
    html+=`<div style="display:flex;align-items:center;gap:${GAP}px;margin-bottom:${GAP}px">
      <div style="width:${NW}px;flex-shrink:0;display:flex;align-items:center;gap:4px;overflow:hidden">
        <div style="width:5px;height:5px;border-radius:50%;background:${h.color};flex-shrink:0;box-shadow:0 0 5px ${h.color}99"></div>
        <span style="font-size:8px;font-weight:600;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.name}</span>
        ${str2>0?`<span style="font-size:7px;color:${h.color};flex-shrink:0;display:inline-flex;align-items:center;gap:1px"><svg viewBox="0 0 10 12" fill="none" style="width:7px;height:7px"><path d="M5 0.5C5 0.5 7.5 3 7.5 5.5C7.5 6.8 6.8 7.5 5.8 7.5C6 6.8 5.7 5.8 4.8 5.3C4.8 6.5 3.2 7.5 3.2 8.8C3.2 10.1 4.1 11 5 11C6.8 11 8.5 9.8 8.5 8C8.5 5.2 6.5 2.3 5 0.5Z" fill="${h.color}"/></svg>${str2}</span>`:''}
      </div>`;
    for(let d=1;d<=dim;d++){
      const s=ds(yr,mo,d);const done=isDone(h,s);const fut=new Date(yr,mo,d)>today;const isT=d===dmax;
      html+=`<div style="width:${CELL}px;height:${CELL}px;border-radius:3px;flex-shrink:0;background:${done?h.color:fut?'rgba(255,255,255,.015)':'rgba(80,140,255,.05)'};border:1px solid ${done?h.color+'88':isT?'rgba(41,121,255,.38)':'rgba(80,140,255,.08)'};box-shadow:${done?`0 0 5px ${h.color}55`:'none'};display:flex;align-items:center;justify-content:center;transition:transform .2s var(--spring)" ${done?'title="Complété"':''}>
        ${done?`<svg width="7" height="7" viewBox="0 0 8 8"><path d="M1.5 4L3.5 6L6.5 2" stroke="rgba(0,0,0,.55)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`:''}
      </div>`;
    }
    html+='</div>';
  });
  html+='</div>';cg.innerHTML=html;
  const cw=document.getElementById('cal-wrap');
  if(cw)cw.scrollLeft=Math.max(0,NW+(dmax-1)*(CELL+GAP)-62);
}

// ══════════════════════════════════════════════
// BADGES
// ══════════════════════════════════════════════
function renderBadgesHero(){
  const card=document.getElementById('badges-hero-card');if(!card)return;
  const unlocked=BADGES.filter(b=>b.chk()).length,total=BADGES.length;
  const pct=total?Math.round(unlocked/total*100):0;
  const bestStr=habits.length?Math.max(0,...habits.map(h=>streak(dates(h)))):0;
  // Hexagones badges
  const hexes=BADGES.map((b,i)=>{
    const e=b.chk();
    return`<div title="${b.name}" style="width:28px;height:28px;
      clip-path:polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);
      background:${e?'linear-gradient(135deg,#fbbf24,#f59e0b)':'rgba(255,255,255,.04)'};
      box-shadow:${e?'0 0 10px rgba(251,191,36,.45)':'none'};
      display:flex;align-items:center;justify-content:center;font-size:11px;
      animation:bKpi .4s var(--spring) ${i*.055}s both;
      transition:transform .25s var(--spring),filter .25s"
      onmouseover="this.style.transform='scale(1.18)'"
      onmouseout="this.style.transform='scale(1)'">${e?b.icon:''}</div>`;
  }).join('');
  // Milestones
  const milestones=[25,50,75,100];
  card.innerHTML=`
    <div class="insight-grid">
      <div>
        <span class="status-pill" style="cursor:default">Collection</span>
        <h3 class="page-title">Palmarès</h3>
        <p class="page-copy">Débloque les distinctions en maintenant ton rythme et tes séries.</p>
      </div>
      <div class="mini-kpi-grid">
        ${[[unlocked+'/'+total,'Badges','#fbbf24',.04],[pct+'%','Complétion','#fbbf24',.11],[bestStr+'j','Série phare','var(--t1)',.18],[habits.length,'Quêtes','var(--t1)',.25]]
          .map(([v,l,col,d])=>`<div class="mini-kpi" style="animation:bKpi .42s var(--spring) ${d}s both">
            <strong style="color:${col};animation:bNumPop .5s var(--spring) ${d+.07}s both">${v}</strong>
            <span>${l}</span></div>`).join('')}
      </div>
    </div>
    <!-- Hexagones -->
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;margin-bottom:2px">${hexes}</div>
    <!-- Barre de progression — orbe + plasma -->
    <div class="bpbar-outer">
      <div class="bpbar-header">
        <span class="bpbar-label">PROGRESSION</span>
        <span class="bpbar-pct">${pct}%</span>
      </div>
      <div class="bpbar-track" id="bpbar-track">
        <div class="bpbar-fill" id="bpbar"></div>
        <!-- Segments déco -->
        <div class="bpbar-segs">
          ${Array(4).fill(0).map(()=>'<div class="bpbar-seg"></div>').join('')}
        </div>
        <!-- Orbe lumineux au bout -->
        <div class="bpbar-orb" id="bpbar-orb"></div>
      </div>
      <!-- Milestones avec point -->
      <div class="bpbar-milestones">
        ${milestones.map((m,i)=>`<span class="bpbar-ms ${pct>=m?'reached':'unreached'}" style="animation-delay:${i*.06+.3}s">
          <div class="bpbar-ms-dot"></div>
          <span class="bpbar-ms-txt">${m}%</span>
        </span>`).join('')}
      </div>
    </div>`;
  // Animer fill + orbe
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const bar=document.getElementById('bpbar');
    const orb=document.getElementById('bpbar-orb');
    const track=document.getElementById('bpbar-track');
    if(bar)bar.style.width=pct+'%';
    if(orb&&track){
      const tw=track.offsetWidth||220;
      // Orbe centré sur le bout de la barre, avec marge
      const orbPx=Math.max(0, pct/100*tw - 9);
      orb.style.left=orbPx+'px';
      // Masquer l'orbe si 0%
      orb.style.opacity=pct>0?'1':'0';
    }
  }));
}

function renderBadges(){
  renderBadgesHero();
  const grid=document.getElementById('badges-grid');if(!grid)return;
  const isSAO=getU()==='sao';
  const nmap={rankD:'Niveau 5',rankS:'Niveau 60',perfect:'All Clear',first:'Première mission'};
  const dmap={rankD:'Atteindre le niveau 5',rankS:'Atteindre le niveau 60',perfect:'Toutes les missions du jour'};
  const bN=b=>isSAO?(nmap[b.id]||b.name):b.name;
  const bD=b=>isSAO?(dmap[b.id]||b.desc):b.desc;
  const sorted=[...BADGES.filter(b=>b.chk()),...BADGES.filter(b=>!b.chk())];
  grid.innerHTML=sorted.map((b,i)=>{
    const e=b.chk(),d=i*80;
    if(e) return`<div class="badge-card earned" style="animation:bIn .56s cubic-bezier(.16,1,.3,1) ${d}ms both">
      <div class="b-ripple"></div>
      <div class="b-shimmer"></div>
      <div class="b-scan"></div>
      <div class="badge-card-inner">
        <div style="position:absolute;top:12px;left:12px;width:22px;height:22px;border-radius:50%;
          background:linear-gradient(135deg,#fbbf24,#f59e0b);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 14px rgba(251,191,36,.6),0 0 0 2px rgba(251,191,36,.2);
          z-index:5;animation:bCheckClap .62s cubic-bezier(.34,1.56,.64,1) ${d+215}ms both">
          <svg viewBox="0 0 12 12" fill="none" style="width:10px;height:10px">
            <polyline points="1.5,6 4.5,9 10.5,3" stroke="#1a0800" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="badge-icon-wrap">
          <span class="badge-icon" style="animation:bIconBurst .66s cubic-bezier(.34,1.56,.64,1) ${d+65}ms both">${b.icon}</span>
        </div>
        <p class="badge-name" style="color:#fbbf24;animation:bTxtIn .34s ease-out ${d+140}ms both">${bN(b)}</p>
        <p class="badge-desc" style="color:rgba(251,191,36,.45);animation:bTxtIn .34s ease-out ${d+182}ms both">${bD(b)}</p>
        <div class="badge-tag" style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.25);
          animation:bTagBounce .4s cubic-bezier(.34,1.56,.64,1) ${d+260}ms both">
          <div class="badge-tag-dot"></div>
          <span class="badge-tag-txt" style="color:#fbbf24">DÉBLOQUÉ</span>
        </div>
      </div>
    </div>`;
    return`<div class="badge-card locked" style="animation:bLockIn .46s cubic-bezier(.16,1,.3,1) ${d}ms both">
      <div class="badge-card-inner">
        <div class="badge-icon-wrap">
          <span class="badge-icon" style="opacity:.18;filter:grayscale(1) brightness(.55)">
            <svg viewBox="0 0 24 24" fill="none" style="width:32px;height:32px">
              <rect x="5" y="11" width="14" height="11" rx="3" stroke="currentColor" stroke-width="1.8"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
            </svg>
          </span>
        </div>
        <p class="badge-name" style="color:rgba(255,255,255,.16);animation:bTxtIn .3s ease-out ${d+55}ms both">${bN(b)}</p>
        <p class="badge-desc" style="color:rgba(255,255,255,.08);animation:bTxtIn .3s ease-out ${d+88}ms both">${bD(b)}</p>
        <div class="badge-tag" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
          animation:bTagBounce .34s cubic-bezier(.34,1.56,.64,1) ${d+135}ms both">
          <span class="badge-tag-txt" style="color:rgba(255,255,255,.2)">VERROUILLÉ</span>
        </div>
      </div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.badge-card.earned').forEach((el,i)=>{
    setTimeout(()=>burstBadge(el), i*80+440);
  });
}

function burstBadge(card){
  requestAnimationFrame(()=>{
    const r=card.getBoundingClientRect();
    const cx=r.left+r.width/2, cy=r.top+r.height/2;
    const colors=['#fbbf24','#f59e0b','#fde68a','#fff7ed','#fcd34d'];
    for(let i=0;i<16;i++){
      const p=document.createElement('div');
      const angle=(i/16)*Math.PI*2+(Math.random()-.5)*.4;
      const dist=28+Math.random()*32;
      const sz=Math.random()*3.5+1.5;
      const col=colors[i%colors.length];
      const dx=Math.cos(angle)*dist+'px';
      const dy=(Math.sin(angle)*dist-10)+'px';
      p.style.cssText=`position:fixed;z-index:9999;border-radius:50%;
        width:${sz}px;height:${sz}px;
        background:${col};
        left:${cx-sz/2}px;top:${cy-sz/2}px;
        pointer-events:none;
        --dx:${dx};--dy:${dy};
        animation:bParticle .6s cubic-bezier(.2,0,.8,1) ${i*18}ms both`;
      document.body.appendChild(p);
      setTimeout(()=>p.remove(), 650+i*18);
    }
  });
}


// ══════════════════════════════════════════════
// FX
// ══════════════════════════════════════════════
function playSound(){
  if(settings.sound===false)return;
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [[880,.28],[660,.18],[440,.1]].forEach(([freq,vol],i)=>{
      const osc=ctx.createOscillator(),g=ctx.createGain();
      osc.connect(g);g.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq,ctx.currentTime+i*.12);
      osc.frequency.exponentialRampToValueAtTime(freq*.8,ctx.currentTime+i*.12+.3);
      g.gain.setValueAtTime(vol,ctx.currentTime+i*.12);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.12+.45);
      osc.start(ctx.currentTime+i*.12);
      osc.stop(ctx.currentTime+i*.12+.45);
    });
  }catch(e){}
}

function showXP(xp){
  const p=document.createElement('div');p.className='xp-popup';
  p.style.cssText='left:50%;top:42%;transform:translate(-50%,-50%)';
  p.textContent='+'+xp+' XP';document.body.appendChild(p);
  for(let i=0;i<10;i++){
    const sp=document.createElement('div');
    const a=(i/10)*Math.PI*2,d=50+Math.random()*24;
    sp.style.cssText=`position:fixed;left:50%;top:42%;z-index:9999;pointer-events:none;width:${Math.random()*4+2}px;height:${Math.random()*4+2}px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px rgba(74,222,128,.9);opacity:1`;
    document.body.appendChild(sp);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      sp.style.transition='transform .7s cubic-bezier(.2,0,.8,1),opacity .7s ease-out';
      sp.style.transform=`translate(${Math.cos(a)*d-2}px,${Math.sin(a)*d-2}px) scale(0)`;
      sp.style.opacity='0';
    }));
    setTimeout(()=>sp.remove(),740);
  }
  setTimeout(()=>p.remove(),2100);
}

function showLevelUp(rank,color){
  const m=document.createElement('div');
  m.style.cssText='position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(2,5,14,.65);backdrop-filter:blur(12px);animation:fadeIn .3s ease-out';
  m.innerHTML=`<div style="text-align:center;animation:lvlup .7s var(--spring)">
    <div style="position:relative;display:inline-block;margin-bottom:18px">
      <div style="font-size:76px;filter:drop-shadow(0 0 32px ${color})">⭐</div>
      <div style="position:absolute;inset:-20px;border-radius:50%;border:1.5px solid ${color}44;animation:ripple 1.2s ease-out infinite"></div>
      <div style="position:absolute;inset:-38px;border-radius:50%;border:1px solid ${color}22;animation:ripple 1.2s ease-out infinite .6s"></div>
    </div>
    <p style="font-family:'Orbitron',monospace;font-size:8.5px;letter-spacing:4.5px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:12px">LEVEL UP</p>
    <p style="font-family:'Orbitron',monospace;font-size:76px;font-weight:900;line-height:1;color:${color};filter:drop-shadow(0 0 44px ${color})">${rank}</p>
    <p style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:3.5px;color:rgba(255,255,255,.25);margin-top:12px">RANG ATTEINT</p>
  </div>`;
  document.body.appendChild(m);
  if(navigator.vibrate)navigator.vibrate([100,50,100,50,200]);
  setTimeout(()=>{m.style.transition='opacity .45s';m.style.opacity='0';setTimeout(()=>m.remove(),460);},3000);
}

function toast(msg,type='ok'){
  const ct=document.getElementById('toast-ct');
  const t=document.createElement('div');t.className='toast';
  t.style.cssText+=`background:rgba(4,9,24,.97);border:1px solid ${type==='error'?'rgba(229,57,53,.3)':'rgba(74,222,128,.18)'};color:${type==='error'?'#e57373':'#4ade80'};box-shadow:0 10px 28px rgba(0,0,0,.45),0 0 18px ${type==='error'?'rgba(229,57,53,.08)':'rgba(74,222,128,.06)'}`;
  t.textContent=msg;ct.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(8px) scale(.94)';setTimeout(()=>t.remove(),280);},2400);
}

// Ripple universel amélioré
document.addEventListener('pointerdown',e=>{
  const btn=e.target.closest('.fab,.btn-icon,.btn-prim,.btn-ghost,.tab-btn,.section-cta');
  if(!btn)return;
  // Lire le rect avant toute mutation DOM (évite layout thrash)
  const rect=btn.getBoundingClientRect();
  const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
  const sz=Math.max(rect.width,rect.height)*2.6;
  requestAnimationFrame(()=>{
    const rip=document.createElement('span');rip.className='rip';
    rip.style.cssText=`width:${sz}px;height:${sz}px;left:${cx-sz/2}px;top:${cy-sz/2}px`;
    btn.appendChild(rip);
    setTimeout(()=>rip.remove(),560);
  });
},{passive:true});

// ══════════════════════════════════════════════
// ALL DAY CONFETTI
// ══════════════════════════════════════════════
function checkAllDay(){
  if(!habits.length||lastConf===TODAY)return;
  if(habits.every(h=>dates(h).includes(TODAY))){lastConf=TODAY;allDayConfetti();}
}
function allDayConfetti(){
  if(navigator.vibrate)navigator.vibrate([80,40,80,40,80,40,250]);
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:190;background:rgba(2,5,14,.9);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:center;pointer-events:none;animation:fadeIn .38s ease-out';
  const cv=document.createElement('canvas');cv.style.cssText='position:absolute;inset:0;width:100%;height:100%';
  cv.width=window.innerWidth;cv.height=window.innerHeight;ov.appendChild(cv);
  const box=document.createElement('div');box.style.cssText='position:relative;z-index:2;text-align:center;padding:0 32px';
  box.innerHTML=`<div id="vc-icon" style="margin-bottom:18px;opacity:0;transform:scale(.2) rotate(-20deg);transition:none"><svg viewBox="0 0 80 80" fill="none" style="width:72px;height:72px"><polygon points="46,4 26,42 40,42 34,76 54,38 40,38" fill="#2979ff" opacity=".95"/></svg></div>
    <p id="vc-sub" style="font-family:'Orbitron',monospace;font-size:8px;font-weight:700;letter-spacing:5px;color:rgba(74,222,128,.55);text-transform:uppercase;margin-bottom:10px;opacity:0">JOURNÉE PARFAITE</p>
    <h2 id="vc-t1" style="font-family:'Orbitron',monospace;font-size:clamp(26px,7vw,48px);font-weight:900;letter-spacing:4px;margin:0;opacity:0;background:linear-gradient(135deg,#4ade80,#22d3ee,#2979ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">TOUTES LES QUÊTES</h2>
    <h2 id="vc-t2" style="font-family:'Orbitron',monospace;font-size:clamp(26px,7vw,48px);font-weight:900;letter-spacing:4px;margin:4px 0 0;opacity:0;background:linear-gradient(135deg,#22d3ee,#2979ff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">ACCOMPLIES</h2>`;
  ov.appendChild(box);document.body.appendChild(ov);
  const ctx=cv.getContext('2d');
  const cols=['#4ade80','#22d3ee','#2979ff','#a78bfa','#fbbf24','#f472b6','#fb923c'];
  const parts=Array.from({length:120},()=>({x:Math.random()*cv.width,y:cv.height+10,vx:(Math.random()-.5)*5.5,vy:-(Math.random()*10+5),r:Math.random()*4+1.5,c:cols[0|Math.random()*cols.length],rot:Math.random()*360,vr:(Math.random()-.5)*7,life:1,decay:Math.random()*.006+.002,delay:Math.random()*40,shape:Math.random()>.5?'r':'c'}));
  let fr=0,raf2;
  function dp(){ctx.clearRect(0,0,cv.width,cv.height);fr++;parts.forEach(p=>{if(fr<p.delay)return;p.x+=p.vx;p.y+=p.vy;p.vy+=.17;p.rot+=p.vr;p.life-=p.decay;if(p.life<=0)return;ctx.save();ctx.globalAlpha=p.life;ctx.fillStyle=p.c;ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);if(p.shape==='c'){ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();}else ctx.fillRect(-p.r,-p.r/2,p.r*2,p.r);ctx.restore();});if(parts.some(p=>p.life>0))raf2=requestAnimationFrame(dp);}
  raf2=requestAnimationFrame(dp);
  const eb='cubic-bezier(.34,1.56,.64,1)',es='cubic-bezier(.16,1,.3,1)';
  function sh(id,delay,dur,ease=es,extra=''){setTimeout(()=>{const el=box.querySelector('#'+id);if(!el)return;el.style.transition=`opacity ${dur}ms ${ease},transform ${dur}ms ${ease}`;el.style.opacity='1';el.style.transform='scale(1) rotate(0) translateY(0)';},delay);}
  sh('vc-icon',80,600,eb);sh('vc-sub',380,500);sh('vc-t1',580,540);sh('vc-t2',730,540);
  setTimeout(()=>{cancelAnimationFrame(raf2);ov.style.transition='opacity .5s';ov.style.opacity='0';setTimeout(()=>ov.remove(),520);},3600);
}

// ══════════════════════════════════════════════
// EVENT DELEGATION
// ══════════════════════════════════════════════
document.getElementById('habits-list').addEventListener('click',e=>{
  const tmr=e.target.closest('.tmr-btn');
  if(tmr&&!tmr.disabled){startTimer(tmr.dataset.hid);return;}
  const tog=e.target.closest('.tog-btn');
  if(tog){toggleHabit(tog.dataset.hid);return;}
});
document.getElementById('tasks-list').addEventListener('click',e=>{
  const tog=e.target.closest('.task-tog');
  if(tog){toggleTask(tog.dataset.tid);return;}
});
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  closeSheet();closeSettings();cancelDel();
});

// ══════════════════════════════════════════════
// INTRO — COSMIC ASSEMBLY
// ══════════════════════════════════════════════
(function(){
  const done=sessionStorage.getItem('hr_done');
  const app=document.getElementById('app');
  if(done){
    document.getElementById('intro').style.display='none';
    app.style.visibility='visible';
    app.style.opacity='1';
    return;
  }

  const cv=document.getElementById('ic');
  const ctx=cv.getContext('2d');
  let W,H,CX,CY;
  function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;CX=W/2;CY=H/2;}
  resize();

  // ── Easing ──────────────────────────────────
  const eOut  = t=>1-Math.pow(1-t,3);
  const eOut5 = t=>1-Math.pow(1-t,5);
  const eSpr  = t=>t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*(2*Math.PI/3))+1;
  const eBounce=t=>{
    const n=7.5625,d=2.75;
    if(t<1/d)return n*t*t;
    if(t<2/d)return n*(t-=1.5/d)*t+.75;
    if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;
    return n*(t-=2.625/d)*t+.984375;
  };

  // ── Palette ─────────────────────────────────
  const C={
    blue:'#2979ff', cyan:'#29b6f6', violet:'#7c4dff',
    white:'#ddeeff', dark:'#04080f',
    blueA:a=>`rgba(41,121,255,${a})`,
    cyanA:a=>`rgba(41,182,246,${a})`,
    violetA:a=>`rgba(124,77,255,${a})`,
    whiteA:a=>`rgba(221,238,255,${a})`
  };

  // ══════════════════════════════════════════════
  // LOGO GÉOMÉTRIQUE — dessiné à la main sur canvas
  // Hexagone multicouche avec rayons, rotation, pulse
  // ══════════════════════════════════════════════
  const LOGO = {
    x:0, y:0,       // set in resize
    R:Math.min(W,H)*0.17, // rayon adaptatif
    angle:0,
    pulse:0,
    alpha:0,
    scale:0,
    rings:[],
    arcs:[],
    nodes:[]
  };

  function initLogo(){
    LOGO.x=CX; LOGO.y=CY*0.48;
    LOGO.R=Math.min(W,H)*0.17;
    LOGO.rings=[];
    LOGO.arcs=[];
    LOGO.nodes=[];
    const R=LOGO.R;

    // 3 hexagones concentriques avec vitesses de rotation différentes
    LOGO.rings=[
      {r:R,      sides:6, stroke:1.8, col:C.blue,   rotSpd:.003,  phase:0,        dash:[0,0],   alpha:1},
      {r:R*.62,  sides:6, stroke:1.2, col:C.cyan,   rotSpd:-.005, phase:Math.PI/6,dash:[5,7],   alpha:.8},
      {r:R*.32,  sides:6, stroke:1,   col:C.violet, rotSpd:.008,  phase:0,        dash:[3,5],   alpha:.6},
    ];

    // Arcs rotatifs (2 arcs antagonistes)
    LOGO.arcs=[
      {r:R*1.12, start:0, len:Math.PI*.55, width:2, col:C.cyan,   spd:.012, alpha:.7},
      {r:R*1.12, start:Math.PI, len:Math.PI*.35, width:1.5, col:C.violet, spd:-.009, alpha:.5},
      {r:R*.78,  start:.8, len:Math.PI*.4, width:1.5, col:C.blue, spd:.015,  alpha:.6},
    ];

    // 6 noeuds aux sommets de l'hexagone principal
    LOGO.nodes=Array.from({length:6},(_,i)=>({
      a:i*Math.PI/3-Math.PI/6,
      r:R, rDot:4+Math.random()*2,
      col:i%2?C.cyan:C.blue,
      pulse:Math.random()*Math.PI*2
    }));
  }

  function drawLogo(ts, alpha){
    if(alpha<.005)return;
    const {x,y,R,angle,scale}=LOGO;
    const sc=scale;
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(sc,sc);
    ctx.globalAlpha=alpha;

    // ── Glow central ──
    const gc=ctx.createRadialGradient(0,0,0,0,0,R*1.4);
    gc.addColorStop(0,C.blueA(.18));gc.addColorStop(.5,C.blueA(.06));gc.addColorStop(1,C.blueA(0));
    ctx.fillStyle=gc;ctx.beginPath();ctx.arc(0,0,R*1.4,0,Math.PI*2);ctx.fill();

    // ── Rayons du centre vers les noeuds ──
    LOGO.nodes.forEach(n=>{
      const a=n.a+LOGO.rings[0].phase;
      const gLine=ctx.createLinearGradient(0,0,Math.cos(a)*R,Math.sin(a)*R);
      gLine.addColorStop(0,C.cyanA(.9));gLine.addColorStop(1,C.blueA(.2));
      ctx.save();ctx.strokeStyle=gLine;ctx.lineWidth=1.2;ctx.globalAlpha=alpha*.7;
      ctx.shadowBlur=6;ctx.shadowColor=C.cyan;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);ctx.stroke();
      ctx.restore();
    });

    // ── Hexagones ──
    LOGO.rings.forEach(ring=>{
      ctx.save();
      ctx.rotate(ring.phase);
      if(ring.dash[0])ctx.setLineDash(ring.dash);
      ctx.strokeStyle=ring.col;ctx.lineWidth=ring.stroke;
      ctx.globalAlpha=alpha*ring.alpha;
      ctx.shadowBlur=ring.stroke*6;ctx.shadowColor=ring.col;
      ctx.beginPath();
      for(let i=0;i<ring.sides;i++){
        const a=i*Math.PI/3;
        i?ctx.lineTo(Math.cos(a)*ring.r,Math.sin(a)*ring.r)
         :ctx.moveTo(Math.cos(a)*ring.r,Math.sin(a)*ring.r);
      }
      ctx.closePath();ctx.stroke();
      ctx.restore();
    });

    // ── Arcs rotatifs ──
    LOGO.arcs.forEach(arc=>{
      ctx.save();
      ctx.strokeStyle=arc.col;ctx.lineWidth=arc.width;ctx.lineCap='round';
      ctx.globalAlpha=alpha*arc.alpha;
      ctx.shadowBlur=arc.width*8;ctx.shadowColor=arc.col;
      ctx.beginPath();ctx.arc(0,0,arc.r,arc.start,arc.start+arc.len);ctx.stroke();
      ctx.restore();
    });

    // ── Noeuds pulsants ──
    LOGO.nodes.forEach(n=>{
      const a=n.a+LOGO.rings[0].phase;
      const nx=Math.cos(a)*R, ny=Math.sin(a)*R;
      const p=0.5+0.5*Math.sin(ts*.003+n.pulse);
      ctx.save();
      ctx.shadowBlur=n.rDot*5+p*6;ctx.shadowColor=n.col;
      ctx.fillStyle=n.col;ctx.globalAlpha=alpha*(.7+p*.3);
      ctx.beginPath();ctx.arc(nx,ny,n.rDot*(0.9+p*.25),0,Math.PI*2);ctx.fill();
      // Halo
      ctx.strokeStyle=n.col;ctx.lineWidth=1;ctx.globalAlpha=alpha*p*.4;
      ctx.beginPath();ctx.arc(nx,ny,n.rDot*2.5,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    });

    // ── Point central ──
    const pcPulse=0.5+0.5*Math.sin(ts*.004);
    ctx.save();
    ctx.fillStyle='#fff';ctx.shadowBlur=16+pcPulse*10;ctx.shadowColor=C.cyan;
    ctx.globalAlpha=alpha*(.8+pcPulse*.2);
    ctx.beginPath();ctx.arc(0,0,5+pcPulse*1.5,0,Math.PI*2);ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // ── Mise à jour angles logo ──
  function updateLogo(dt){
    LOGO.rings.forEach(r=>r.phase+=r.rotSpd*dt);
    LOGO.arcs.forEach(a=>{a.start+=a.spd*dt;});
  }

  // ══════════════════════════════════════════════
  // PARTICULES AMBIANTES — constellation 3D
  // ══════════════════════════════════════════════
  const STARS=Array.from({length:280},()=>({
    x:Math.random()*2, y:Math.random()*2, // normalisé 0-2, centré sur 1
    z:Math.random(),   // profondeur
    r:Math.random()*1.4+.2,
    bright:Math.random()*.5+.1,
    ph:Math.random()*Math.PI*2,
    spd:Math.random()*.018+.003,
    drift:{dx:(Math.random()-.5)*.0002, dy:(Math.random()-.5)*.0002}
  }));

  function drawStars(alpha,ts){
    STARS.forEach(s=>{
      s.x=(s.x+s.drift.dx+2)%2; s.y=(s.y+s.drift.dy+2)%2;
      const sx=(s.x-1)*W+W/2, sy=(s.y-1)*H+H/2;
      const twinkle=s.bright*(0.5+0.5*Math.sin(ts*s.spd+s.ph));
      const depth=0.4+s.z*.6;
      ctx.beginPath();
      ctx.arc(sx,sy,s.r*depth,0,Math.PI*2);
      ctx.fillStyle=`rgba(221,238,255,${Math.max(0,twinkle*alpha)})`;
      ctx.fill();
    });
  }

  // ══════════════════════════════════════════════
  // NÉBULEUSES de fond — orbes animés
  // ══════════════════════════════════════════════
  const NEBULAE=[
    {ox:.5, oy:.36, rx:.4, ry:.35, col:[41,121,255],  b:.16, spd:.00022, ph:0},
    {ox:.22, oy:.6,  rx:.3, ry:.28, col:[124,77,255], b:.09, spd:.00031, ph:2.1},
    {ox:.78, oy:.3,  rx:.28,ry:.24, col:[41,182,246], b:.07, spd:.00028, ph:4.4},
    {ox:.6,  oy:.7,  rx:.22,ry:.2,  col:[29,78,216],  b:.05, spd:.00019, ph:1.8},
  ];
  function drawNebulae(alpha,ts){
    NEBULAE.forEach(n=>{
      const px=n.ox*W+Math.sin(ts*n.spd+n.ph)*W*.03;
      const py=n.oy*H+Math.cos(ts*n.spd+n.ph)*H*.025;
      const rx=n.rx*W, ry=n.ry*H;
      const g=ctx.createRadialGradient(px,py,0,px,py,Math.max(rx,ry));
      const a=n.b*alpha;
      g.addColorStop(0,`rgba(${n.col},${a})`);
      g.addColorStop(.4,`rgba(${n.col},${a*.3})`);
      g.addColorStop(1,`rgba(${n.col},0)`);
      ctx.save();ctx.scale(rx/Math.max(rx,ry),ry/Math.max(rx,ry));
      ctx.beginPath();ctx.arc(px/(rx/Math.max(rx,ry)),py/(ry/Math.max(rx,ry)),Math.max(rx,ry),0,Math.PI*2);
      ctx.fillStyle=g;ctx.fill();ctx.restore();
    });
  }

  // ══════════════════════════════════════════════
  // GRILLE DE FOND — hexagonale, animée
  // ══════════════════════════════════════════════
  function drawGrid(alpha,ts){
    if(alpha<.01)return;
    ctx.save();ctx.globalAlpha=alpha*.045;ctx.strokeStyle=C.blue;ctx.lineWidth=.7;
    const S=50, pulse=1+Math.sin(ts*.0006)*.04;
    const cols=Math.ceil(W/(S*1.5*pulse))+3, rows=Math.ceil(H/(S*.866*pulse))+3;
    for(let row=-2;row<rows;row++){
      for(let col=-2;col<cols;col++){
        const ox=col*S*1.5*pulse+((row%2)?.75*S*pulse:0);
        const oy=row*S*.866*pulse;
        ctx.beginPath();
        for(let i=0;i<6;i++){
          const a=i*Math.PI/3;
          const vx=ox+Math.cos(a)*S*.48*pulse;
          const vy=oy+Math.sin(a)*S*.48*pulse;
          i?ctx.lineTo(vx,vy):ctx.moveTo(vx,vy);
        }
        ctx.closePath();ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ══════════════════════════════════════════════
  // ONDES DE CHOC
  // ══════════════════════════════════════════════
  const waves=[];
  function addWave(x,y,col,maxR=600,thick=1.5,speed=6){
    waves.push({x,y,r:0,maxR,alpha:1,col,thick,speed});
  }
  function drawWaves(){
    for(let i=waves.length-1;i>=0;i--){
      const w=waves[i];
      w.r+=w.speed;w.alpha=Math.max(0,1-w.r/w.maxR);
      if(w.alpha<.005){waves.splice(i,1);continue;}
      ctx.save();ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,Math.PI*2);
      ctx.strokeStyle=w.col;ctx.lineWidth=w.thick;
      ctx.globalAlpha=w.alpha*.45;ctx.shadowBlur=18;ctx.shadowColor=w.col;
      ctx.stroke();ctx.restore();
    }
  }

  // ══════════════════════════════════════════════
  // LIGNES DE SCAN
  // ══════════════════════════════════════════════
  let scanY=-H, scanActive=false;
  function launchScan(){
    if(scanActive)return;scanActive=true;
    scanY=-H*.02;
  }
  function drawScan(dt){
    if(!scanActive)return;
    scanY+=H*.0035*dt;
    if(scanY>H*1.02){scanActive=false;return;}
    const progress=Math.max(0,Math.min(1,scanY/H));
    const fadeIn=progress<.05?progress/.05:1;
    const fadeOut=progress>.85?(1-progress)/.15:1;
    const alpha=fadeIn*fadeOut;
    ctx.save();
    const g=ctx.createLinearGradient(0,scanY-30,0,scanY+30);
    g.addColorStop(0,'rgba(41,182,246,0)');
    g.addColorStop(.4,`rgba(41,182,246,${alpha*.25})`);
    g.addColorStop(.5,`rgba(255,255,255,${alpha*.6})`);
    g.addColorStop(.6,`rgba(41,121,255,${alpha*.25})`);
    g.addColorStop(1,'rgba(41,121,255,0)');
    ctx.fillStyle=g;ctx.fillRect(0,scanY-30,W,60);
    // Ligne principale
    ctx.strokeStyle=`rgba(41,182,246,${alpha*.8})`;ctx.lineWidth=1;
    ctx.shadowBlur=20;ctx.shadowColor=C.cyan;
    ctx.beginPath();ctx.moveTo(0,scanY);ctx.lineTo(W,scanY);ctx.stroke();
    ctx.restore();
  }

  // ══════════════════════════════════════════════
  // LETTRES — apparition magnétique depuis la scan
  // ══════════════════════════════════════════════
  const letters=Array.from(document.querySelectorAll('.il'));
  const LETTER_SCHEDULE=[0, 80,160,240,340,440,520,610]; // ms depuis déclenchement
  let lettersTriggered=false;

  function triggerLetters(){
    if(lettersTriggered)return;lettersTriggered=true;
    letters.forEach((el,i)=>{
      const col=el.dataset.c||'#ddeeff';
      const bright=el.dataset.bright==='1';
      el.style.setProperty('--letter-col',col);
      setTimeout(()=>{
        el.style.transition=`opacity 280ms ease-out, transform 400ms cubic-bezier(.34,1.56,.64,1), filter 350ms ease-out`;
        el.style.opacity='1';
        el.style.transform='translateY(0) scale(1)';
        el.style.filter=bright?`drop-shadow(0 0 14px ${col}) blur(0px)`:'blur(0px)';
        // Micro-glow flash sur la lettre
        if(bright){
          el.style.textShadow=`0 0 30px ${col}, 0 0 60px ${col}88`;
          setTimeout(()=>{el.style.textShadow='';},600);
        }
      },LETTER_SCHEDULE[i]);
    });
  }

  // ══════════════════════════════════════════════
  // TAGLINE + LOADER
  // ══════════════════════════════════════════════
  function showTagline(){
    const el=document.getElementById('i-tag');
    if(el){el.style.color='rgba(41,182,246,.5)';}
  }

  let barStarted=false;
  function startBar(){
    if(barStarted)return;barStarted=true;
    const bar=document.getElementById('ibfill');
    const txt=document.getElementById('ibtxt');
    const ibar=document.getElementById('ibar');
    if(ibar){ibar.style.opacity='1';}
    const msgs=['INITIALISATION','CHARGEMENT','SYNCHRONISATION','ACTIVATION','LEVELINK — PRÊT'];
    let prog=0,mi=0;
    const iv=setInterval(()=>{
      prog+=Math.random()*2.2+.5;
      if(prog>=100){prog=100;clearInterval(iv);setTimeout(exitIntro,420);}
      if(bar)bar.style.width=prog+'%';
      const ni=Math.min(msgs.length-1,Math.floor(prog/21));
      if(ni!==mi){mi=ni;if(txt)txt.textContent=msgs[mi];}
    },30);
  }

  // ══════════════════════════════════════════════
  // EXIT
  // ══════════════════════════════════════════════
  let exitDone=false;
  function exitIntro(){
    if(exitDone)return;exitDone=true;
    cancelAnimationFrame(rafI);
    sessionStorage.setItem('hr_done','1');
    const intro=document.getElementById('intro');
    const fl=document.getElementById('iflash');
    // Flash blanc rapide
    if(fl){fl.style.transition='opacity .08s';fl.style.opacity='.5';}
    setTimeout(()=>{
      // Fade-out intro
      if(fl){fl.style.transition='opacity .32s ease-out';fl.style.opacity='0';}
      if(intro){intro.style.transition='opacity .4s ease-out';intro.style.opacity='0';}
      // Révéler l'app
      app.style.visibility='visible';
      app.style.opacity='1';
      entrance();
      setTimeout(()=>{if(intro)intro.style.display='none';},440);
    },90);
  }

  function entrance(){
    // Ajouter les classes CSS — GPU-only, zéro layout thrashing
    app.classList.add('e-app');
    const hero =document.querySelector('.hero');
    const board=document.getElementById('mission-board');
    const list =document.getElementById('habits-list');
    const empty=document.getElementById('empty-habits');
    const tabs =document.getElementById('tab-bar');
    const fab  =document.getElementById('fab');
    if(hero) hero.classList.add('e-hero');
    if(board)board.classList.add('e-board');
    if(list) list.classList.add('e-list');
    if(empty)empty.classList.add('e-list');
    if(tabs) tabs.classList.add('e-tab');
    if(fab)  fab.classList.add('e-fab');
    // Nettoyer après les animations (max 650ms)
    setTimeout(()=>{
      [app,hero,board,list,empty,tabs,fab].forEach(el=>{
        if(!el)return;
        el.classList.remove('e-app','e-hero','e-board','e-list','e-tab','e-fab');
      });
    },700);
  }

  // ══════════════════════════════════════════════
  // SÉQUENCE TEMPORELLE
  // ══════════════════════════════════════════════
  // 0ms      — fond + étoiles
  // 200ms    — nébuleuses + grille
  // 600ms    — logo scale-in + ondes
  // 1100ms   — scan line traverse l'écran
  // 1500ms   — lettres apparaissent (synchronisées avec la scan)
  // 2100ms   — tagline
  // 2500ms   — loader
  // ~~3200ms — exit

  let t0=null, rafI;
  let lastTs=0;
  let logoAppeared=false, scanFired=false, lettersFired=false, tagFired=false, barFired=false;
  let logoAlpha=0, logoScale=0;
  let bgAlpha=0, gridAlpha=0;

  function loop(ts){
    if(!t0){t0=ts;lastTs=ts;}
    const el=ts-t0;
    const dt=(ts-lastTs)*.06; // delta normalisé
    lastTs=ts;
    rafI=requestAnimationFrame(loop);

    // Fond
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);

    // Nébuleuses (fade-in dès 200ms)
    bgAlpha=Math.min(1,Math.max(0,(el-200)/1200));
    drawNebulae(bgAlpha,ts);
    drawStars(Math.min(1,(el-200)/900),ts);

    // Grille (fade-in 400ms)
    gridAlpha=Math.min(1,Math.max(0,(el-400)/1000));
    drawGrid(gridAlpha,ts);

    // Ondes
    drawWaves();

    // Scan line (lance à 1100ms)
    if(el>1100&&!scanFired){scanFired=true;launchScan();}
    drawScan(dt);

    // Logo
    if(el>600){
      if(!logoAppeared){
        logoAppeared=true;
        initLogo();
        // Ondes d'apparition du logo
        addWave(LOGO.x,LOGO.y,C.blue, LOGO.R*4, 2, 5);
        addWave(LOGO.x,LOGO.y,C.cyan, LOGO.R*3, 1.5, 4);
        setTimeout(()=>addWave(LOGO.x,LOGO.y,C.violet,LOGO.R*2.5,1,3),250);
      }
      // Scale spring sur 800ms
      const lt=Math.min(1,(el-600)/800);
      logoScale=eSpr(lt);
      // Pulse permanent
      LOGO.scale=logoScale*(1+Math.sin(ts*.0025)*.015);
      logoAlpha=Math.min(1,(el-600)/500);
      updateLogo(dt);
      drawLogo(ts,logoAlpha);
    }

    // Flash d'impact du logo à 650ms
    if(el>650&&el<900){
      const flashT=(el-650)/250;
      const fa=Math.max(0,eOut(1-flashT)*.35);
      if(fa>0){
        const gf=ctx.createRadialGradient(LOGO.x,LOGO.y,0,LOGO.x,LOGO.y,LOGO.R*2);
        gf.addColorStop(0,C.blueA(fa));gf.addColorStop(1,C.blueA(0));
        ctx.fillStyle=gf;ctx.fillRect(0,0,W,H);
      }
    }

    // Vignette permanente
    const vig=ctx.createRadialGradient(CX,CY,H*.08,CX,CY,H*.75);
    vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.65)');
    ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);

    // Lettres — déclenchées QUAND la scan line atteint la zone des lettres
    if(el>1500&&!lettersFired){lettersFired=true;triggerLetters();}

    // Tagline
    if(el>2100&&!tagFired){tagFired=true;showTagline();}

    // Loader
    if(el>2500&&!barFired){barFired=true;startBar();}
  }

  rafI=requestAnimationFrame(loop);
})();

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════

// ══ SYSTÈME UNIVERS ══
function applyUniverse(u, skipRender){
  document.documentElement.setAttribute('data-u',u||'sl');
  var scan=document.querySelector('.sao-scan-line');
  if(scan)scan.style.display=u==='sao'?'block':'none';
  var lbl=document.getElementById('cur-u-lbl');
  if(lbl)lbl.textContent=u==='sao'?'SWORD ART ONLINE':'SOLO LEVELING';
  var raw2=load();
  habits=raw2.filter(i=>i.name!=null);
  subtasks=raw2.filter(i=>i.text!=null);
  pdata=raw2.find(i=>i.total_xp!=null)||null;
  activeTimers.clear();
  if(typeof timerBoardState!=='undefined')Object.keys(timerBoardState).forEach(k=>delete timerBoardState[k]);
  if(!skipRender){renderAll();updateLevel();updateHeroSummary();}
}
function playUniverseTransition(targetU,cb){
  var ov=document.getElementById('u-transition');if(!ov)return cb&&cb();
  var s=targetU==='sao';
  var col=s?'#00d4ff':'#2979ff';
  var colHalf=s?'rgba(0,200,255,.55)':'rgba(41,130,255,.55)';
  var bg=ov.querySelector('.ut-bg'),band=ov.querySelector('.ut-band');
  var scan=ov.querySelector('.ut-scan');
  var l1=ov.querySelector('.ut-line-1'),l2=ov.querySelector('.ut-line-2');
  var center=ov.querySelector('.ut-center'),bar=ov.querySelector('.ut-bar');
  var nm=ov.querySelector('.ut-name'),sb=ov.querySelector('.ut-sub');

  // Couleurs
  bg.style.background=s?'rgba(0,5,18,1)':'rgba(1,2,12,1)';
  band.style.background=s
    ?'linear-gradient(155deg,rgba(0,18,50,.99),rgba(0,28,68,.97),rgba(0,12,36,.99))'
    :'linear-gradient(155deg,rgba(3,7,24,.99),rgba(5,12,35,.97),rgba(2,5,18,.99))';
  band.style.boxShadow='0 0 100px 20px '+col+'10';
  scan.style.background='linear-gradient(90deg,transparent 0%,'+colHalf+' 25%,#fff 50%,'+colHalf+' 75%,transparent 100%)';
  if(l1)l1.style.background='linear-gradient(90deg,transparent,'+col+'35 20%,'+col+'12 55%,transparent)';
  if(l2)l2.style.background='linear-gradient(90deg,transparent,'+col+'28 25%,'+col+'08 60%,transparent)';
  bar.style.background='linear-gradient(90deg,transparent,'+col+',transparent)';
  bar.style.boxShadow='0 0 8px '+col+',0 0 16px '+col+'44';
  nm.style.color=col;
  nm.style.textShadow='0 0 30px '+col+'aa,0 0 65px '+col+'22';
  sb.style.color=col;
  nm.textContent=s?'SWORD ART ONLINE':'SOLO LEVELING';
  sb.textContent=s?'[ CONNEXION AU SYSTÈME ]':'[ ACCÈS AU DONJON ]';

  // Reset
  [bg,band,scan,l1,l2,center,bar].forEach(function(el){
    if(el){el.style.animation='none';el.style.opacity='0';}
  });
  band.style.transform='translateY(-112%) skewY(-6deg)';
  ov.style.display='block';

  var T=860;

  requestAnimationFrame(function(){requestAnimationFrame(function(){
    // Fond + bande entrent ensemble
    bg.style.animation='utBgFadeIn .16s ease-out both';
    band.style.animation='utBandIn .36s cubic-bezier(.9,0,.1,1) both';

    // Scan line (légèrement après la bande)
    setTimeout(function(){
      scan.style.animation='utScanDown '+(T*.86)+'ms linear both';
    },60);

    // Lignes déco
    setTimeout(function(){
      if(l1){l1.style.opacity='0';l1.style.animation='utLineIn .42s cubic-bezier(.16,1,.3,1) both';}
    },180);
    setTimeout(function(){
      if(l2){l2.style.opacity='0';l2.style.animation='utLineIn .42s cubic-bezier(.16,1,.3,1) .05s both';}
    },340);

    // Texte + barre
    setTimeout(function(){
      center.style.opacity='0';
      center.style.animation='utCenterIn .34s cubic-bezier(.16,1,.3,1) both';
    },200);
    setTimeout(function(){
      bar.style.opacity='0';
      bar.style.animation='utBarGrow .6s cubic-bezier(.16,1,.3,1) both';
    },270);

    // Switch données au cœur (44%)
    setTimeout(function(){cb&&cb();},T*.44);

    // Sortie : bande part vers le bas (62%)
    setTimeout(function(){
      band.style.animation='utBandOut .36s cubic-bezier(.9,0,.1,1) both';
      center.style.animation='utCenterOut .22s ease-in both';
      if(l1)l1.style.animation='utBgFadeOut .2s ease-in both';
      if(l2)l2.style.animation='utBgFadeOut .2s ease-in .06s both';
      bar.style.animation='utBgFadeOut .18s ease-in both';
      bg.style.animation='utBgFadeOut .32s ease-out .12s both';
    },T*.62);

    // Révélation cascade (76%)
    setTimeout(function(){revealUIElements();},T*.76);

    // Cleanup
    setTimeout(function(){
      ov.style.display='none';
      [bg,band,scan,l1,l2,center,bar].forEach(function(el){
        if(el){el.style.animation='';el.style.opacity='0';}
      });
      band.style.transform='translateY(-112%) skewY(-6deg)';
    },T+350);
  });});
}

function revealUIElements(){
  var seq=[
    {s:'.hero',          d:0  },
    {s:'#mission-board', d:60 },
    {s:'.habit-section', d:115},
    {s:'#tab-bar',       d:165},
    {s:'#fab',           d:205},
  ];
  seq.forEach(function(item){
    document.querySelectorAll(item.s).forEach(function(el){
      el.style.animation='utElReveal .44s cubic-bezier(.16,1,.3,1) '+item.d+'ms both';
      setTimeout(function(){el.style.animation='';},item.d+500);
    });
  });
}

function pickU(u){
  if(u===getU())return;
  if(activeTimers.size>0){
    var sc=document.getElementById('usel');
    if(sc){
      var panel=sc.querySelector('.usp.'+u);
      if(panel){panel.style.animation='usShake .4s var(--bounce)';setTimeout(function(){panel.style.animation='';},420);}
      var msg=sc.querySelector('#usel-warn');
      if(!msg){msg=document.createElement('p');msg.id='usel-warn';msg.style.cssText='position:absolute;bottom:24px;left:50%;transform:translateX(-50%);font-family:Orbitron,monospace;font-size:8px;font-weight:700;letter-spacing:2px;color:#ff4444;background:rgba(255,30,30,.1);border:1px solid rgba(255,60,60,.25);padding:7px 16px;border-radius:99px;white-space:nowrap;animation:fadeIn .2s ease-out both;z-index:2';sc.appendChild(msg);}
      msg.textContent="CHRONO ACTIF — ARRÊTER LE TIMER D'ABORD";
      msg.style.display='block';clearTimeout(msg._t);
      msg._t=setTimeout(function(){msg.style.display='none';},2800);
    }
    return;
  }
  var sc=document.getElementById('usel');
  if(sc){sc.style.animation='usOut .32s cubic-bezier(.32,1,.6,1) both';}
  setU(u);
  setTimeout(function(){
    if(sc)sc.style.display='none';
    playUniverseTransition(u,function(){applyUniverse(u);});
  },300);
}
function tryShowU(){
  if(activeTimers.size>0){toast("Arrête le chrono avant de changer d'univers");return;}
  closeSettings();showU();
}
function showU(){
  var sc=document.getElementById('usel');if(!sc)return;
  sc.style.display='flex';sc.style.animation='fadeIn .3s ease-out both';
  document.querySelectorAll('.us-cur').forEach(function(b){b.remove();});
  var u=getU(),panel=sc.querySelector('.usp.'+u);
  if(panel){var b=document.createElement('div');b.className='us-cur';b.textContent='ACTIF';panel.appendChild(b);}
}
(function(){
  var u=getU();
  applyUniverse(u, true); // skipRender=true, on fait un seul renderAll après
  renderAll();            // render unique au boot
  renderBadges();
  renderStats();
  updateLevel();
  updateHeroSummary();
  if(!localStorage.getItem(UK)){
    var iv=setInterval(function(){
      if(sessionStorage.getItem('hr_done')){clearInterval(iv);setTimeout(showU,200);}
    },80);
    setTimeout(function(){clearInterval(iv);},8000);
  }
})();

applySettings();
// Render unique au boot — applyUniverse() dans le IIFE suivant gère le reste
lucide.createIcons();