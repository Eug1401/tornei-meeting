(function(){
  const ADMIN_KEY='new-generation-admin-state-v23';
  const PUBLIC_KEY='new-generation-public-state-v23';
  const PENDING_REMOTE_SAVE_KEY='new-generation-pending-remote-save-v1';

  const FORMAT_LABELS={
    league:"Campionato all'italiana",
    knockout:'Eliminazione diretta',
    groups_knockout:'Gironi + eliminazione diretta',
    league_knockout:"Campionato all'italiana + eliminazione diretta"
  };
  const PHASE_LABELS={league:'Campionato',group:'Gironi',knockout:'Eliminazione diretta',playoff:'Playoff',secondary_playoff:'Playoff secondario',supercup:'Supercoppa'};
  const FORMAT_HELP={
    league:'Solo campionato: un unico girone, tutti contro tutti. Nessun tabellone.',
    knockout:'Solo tabellone a eliminazione diretta. Nessun girone, tabellone creato subito.',
    groups_knockout:'Fase a gironi bilanciati, poi tabellone con placeholder tipo 1ª Girone A vs 2ª Girone B finché i gironi non sono completati.',
    league_knockout:'Campionato unico, poi una o più competizioni a eliminazione diretta configurabili per fasce consecutive di classifica: Oro, Argento, Bronzo, ecc. Il seeding usa sempre prima contro ultima, seconda contro penultima: 1ª-8ª, 2ª-7ª, 3ª-6ª, 4ª-5ª.'
  };

  const uid=p=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const compId=()=>uid('comp');
  function normalizeBirthYear(value){const n=Number(value);return Number.isInteger(n)&&n>=1900&&n<=2100?n:'';}
  function normalizeJerseyNumber(value){
    if(value===''||value==null)return '';
    const n=Number(value);
    return Number.isInteger(n)&&n>=0&&n<=999?n:'';
  }
  function normalizePenalties(value){
    if(!value||typeof value!=='object')return null;
    const h=Number(value.home), a=Number(value.away);
    // Entrambi devono essere interi >= 0; se uno è invalido, scartiamo tutto
    if(!Number.isInteger(h)||h<0||!Number.isInteger(a)||a<0)return null;
    if(h>99||a>99)return null;
    return {home:h, away:a};
  }
  const KNOCKOUT_PHASES=new Set(['knockout','playoff','secondary_playoff','supercup']);
  function isKnockoutPhase(m){return Boolean(m && (KNOCKOUT_PHASES.has(m.phase) || m.bracketName));}
  function normalizeMatchStatus(value){
    const v=String(value||'').toLowerCase();
    if(v==='played')return 'played';
    if(v==='live')return 'live';
    return 'scheduled';
  }
  function isPresidentId(state,id){return Boolean(id&&state?.teams?.some(t=>t.president?.id===id));}
  function ownGoalValue(teamId){return `own_goal:${teamId||''}`;}
  function isOwnGoalValue(value){return String(value||'').startsWith('own_goal:');}
  function isOwnGoalEvent(g){return Boolean(g&&(g.type==='ownGoal'||g.ownGoal===true||isOwnGoalValue(g.playerId)));}
  function ownGoalTeamId(state,m,g){
    if(!isOwnGoalEvent(g))return '';
    const raw=String(g.teamId||g.ownGoalTeamId||'').trim() || String(g.playerId||'').replace(/^own_goal:/,'').trim();
    if(raw&&(raw===m?.homeTeamId||raw===m?.awayTeamId))return raw;
    return '';
  }
  function goalScoringTeamId(state,m,g){
    const own=ownGoalTeamId(state,m,g);
    if(own)return own===m.homeTeamId?m.awayTeamId:(own===m.awayTeamId?m.homeTeamId:'');
    return playerTeamId(state,g?.playerId);
  }
  function goalEventTeamId(state,m,g){return ownGoalTeamId(state,m,g)||playerTeamId(state,g?.playerId);}
  function goalLabel(state,m,g){
    const own=ownGoalTeamId(state,m,g);
    if(own)return `Autogol (${teamName(state,own)})`;
    return playerName(state,g?.playerId);
  }
  function normalizeGoalEvent(g){
    const isOwn=isOwnGoalEvent(g);
    const teamId=isOwn?String(g.teamId||g.ownGoalTeamId||String(g.playerId||'').replace(/^own_goal:/,'')).trim():'';
    return {id:g.id||uid('goal'),playerId:isOwn?ownGoalValue(teamId):(g.playerId||''),type:isOwn?'ownGoal':'goal',teamId:isOwn?teamId:'',weight:isOwn?1:(Number(g.weight)===2?2:1)};
  }
  const defaultCompetitions=()=>[
    {id:'comp_oro',name:'Playoff Oro',startRank:1,teams:4}
  ];
  function defaultGroupConfigs(){return [{name:'Girone A',size:4,qualifiers:2},{name:'Girone B',size:4,qualifiers:2}];}
  function defaultSite(){return {title:'Coppa del Mondo',subtitle:'Risultati, squadre, giocatori e dettagli della Coppa del Mondo.',logo:'assets/brand/meeting-calcio-logo.png',primary:'#ff7a18',accent:'#1f63ff',surface:'#08245a',radius:'24'};}
  const STANDINGS_CRITERIA=[
    {id:'points',label:'Punti',short:'Pt',direction:'desc'},
    {id:'headToHead',label:'Scontri diretti',short:'SD',direction:'desc'},
    {id:'diff',label:'Differenza reti',short:'DR',direction:'desc'},
    {id:'goalsFor',label:'Gol fatti',short:'GF',direction:'desc'},
    {id:'goalsAgainst',label:'Gol subiti',short:'GS',direction:'asc'},
    {id:'cards',label:'Cartellini gialli + rossi',short:'CR',direction:'asc'}
  ];
  const defaultStandingsCriteriaOrder=()=>STANDINGS_CRITERIA.map(c=>c.id);
  function normalizeStandingsCriteriaOrder(value){
    const allowed=new Set(STANDINGS_CRITERIA.map(c=>c.id));
    const out=[];
    (Array.isArray(value)?value:[]).forEach(id=>{if(allowed.has(id)&&!out.includes(id))out.push(id);});
    STANDINGS_CRITERIA.forEach(c=>{if(!out.includes(c.id))out.push(c.id);});
    return out;
  }
  function standingsCriterionMeta(id){return STANDINGS_CRITERIA.find(c=>c.id===id)||STANDINGS_CRITERIA[0];}
  function normalizeHex(value, fallback){const v=String(value||'').trim();return /^#[0-9a-fA-F]{6}$/.test(v)?v:fallback;}
  function normalizeSite(site){const base=defaultSite();const out={...base,...(site||{})};out.title=String(out.title||base.title).trim().slice(0,80)||base.title;out.subtitle=String(out.subtitle||base.subtitle).trim().slice(0,160);out.logo=String(out.logo||'');out.primary=normalizeHex(out.primary,base.primary);out.accent=normalizeHex(out.accent,base.accent);out.surface=normalizeHex(out.surface,base.surface);out.radius=String(Math.max(8,Math.min(36,Number(out.radius)||24)));return out;}
  function blankRules(){return {name:'Coppa del Mondo',format:'league',groupCount:2,groupConfigs:defaultGroupConfigs(),groupAssignments:{},playoffTeams:4,eliminationCompetitions:defaultCompetitions(),superCup:{enabled:false,homeCompetitionId:'comp_oro',awayCompetitionId:''},isKingsLeague:false,oneDay:false,fieldCount:1,startDate:'',endDate:'',startTime:'09:00',endTime:'18:00',matchDuration:40,breakMinutes:10,oneDayPauseEnabled:false,oneDayPauseStart:'13:00',oneDayPauseDuration:60,playingDays:[1,2,3,4,5,6,0],groupFieldPolicy:'auto',calendarVariantSeed:'',standingsCriteriaOrder:defaultStandingsCriteriaOrder()};}
  function emptyState(){return {rules:blankRules(),site:defaultSite(),teams:[],matches:[],articles:[],calendarSignature:''};}
  function normalizeRules(r){
    const base=blankRules();
    const out={...base,...(r||{})};
    if(!Array.isArray(out.eliminationCompetitions)||!out.eliminationCompetitions.length){
      if(r?.splitPlayoffs){out.eliminationCompetitions=[{id:'comp_oro',name:'Playoff Oro',startRank:1,teams:Number(r.playoffTeams)||4},{id:'comp_argento',name:'Playoff Argento',startRank:(Number(r.playoffTeams)||4)+1,teams:Number(r.secondaryPlayoffTeams)||4}];}
      else {out.eliminationCompetitions=[{id:'comp_oro',name:'Playoff Oro',startRank:1,teams:Number(r?.playoffTeams)||4}];}
    }
    out.eliminationCompetitions=out.eliminationCompetitions.map((c,i)=>({id:c.id||compId(),name:c.name||`Playoff ${i+1}`,startRank:Math.max(1,Number(c.startRank)||1),teams:Math.max(2,Number(c.teams)||4)}));
    out.superCup={...base.superCup,...(out.superCup||{})};
    if(out.eliminationCompetitions.length<2){out.superCup.enabled=false;out.superCup.awayCompetitionId='';}
    out.isKingsLeague=Boolean(out.isKingsLeague);
    out.groupCount=Math.max(2,Number(out.groupCount)||2);
    out.groupAssignments=out.groupAssignments&&typeof out.groupAssignments==='object'&&!Array.isArray(out.groupAssignments)?out.groupAssignments:{};
    if(!Array.isArray(out.groupConfigs)||!out.groupConfigs.length){out.groupConfigs=Array.from({length:out.groupCount},(_,i)=>({name:`Girone ${String.fromCharCode(65+i)}`,size:4,qualifiers:Math.min(2,4)}));}
    out.groupConfigs=out.groupConfigs.map((g,i)=>({name:g.name||`Girone ${String.fromCharCode(65+i)}`,size:Math.max(2,Number(g.size)||4),qualifiers:Math.max(0,Number(g.qualifiers)||0)}));
    out.groupCount=out.groupConfigs.length||out.groupCount;
    out.playoffTeams=out.groupConfigs.reduce((sum,g)=>sum+(Number(g.qualifiers)||0),0)||Math.max(2,Number(out.playoffTeams)||4);
    out.fieldCount=Math.min(2,Math.max(1,Number(out.fieldCount)||1));out.matchDuration=Math.max(5,Number(out.matchDuration)||40);out.breakMinutes=Math.max(0,Number(out.breakMinutes)||0);out.oneDayPauseEnabled=Boolean(out.oneDayPauseEnabled);out.oneDayPauseStart=out.oneDayPauseStart||'13:00';out.oneDayPauseDuration=Math.max(0,Number(out.oneDayPauseDuration)||60);
    out.playingDays=Array.isArray(out.playingDays)?out.playingDays.map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=6):[1,2,3,4,5,6,0];
    out.groupFieldPolicy=['fixed_by_group','rotate_per_team'].includes(out.groupFieldPolicy)?out.groupFieldPolicy:'auto';
    out.calendarVariantSeed=String(out.calendarVariantSeed||'').trim().slice(0,120);
    out.standingsCriteriaOrder=normalizeStandingsCriteriaOrder(out.standingsCriteriaOrder);
    return out;
  }
  function normalizeState(data){const s={...emptyState(),...(data||{})};s.rules=normalizeRules(s.rules);s.site=normalizeSite(s.site);s.calendarSignature=typeof s.calendarSignature==='string'?s.calendarSignature:'';s.teams=Array.isArray(s.teams)?s.teams:[];s.matches=Array.isArray(s.matches)?s.matches:[];s.teams.forEach(t=>{t.id=t.id||uid('team');t.name=t.name||'Squadra';t.logo=t.logo||'';t.players=Array.isArray(t.players)?t.players:[];t.president=(t.president&&typeof t.president==='object')?t.president:{name:t.presidentName||''};t.president.id=t.president.id||uid('president');t.president.name=String(t.president.name||'').trim();t.coach=(t.coach&&typeof t.coach==='object')?t.coach:{name:t.coachName||''};t.coach.name=String(t.coach.name||'').trim();t.players.forEach(p=>{p.id=p.id||uid('player');p.name=p.name||'Calciatore';p.birthYear=normalizeBirthYear(p.birthYear||p.year||p.annoNascita);p.number=normalizeJerseyNumber(p.number);delete p.role;});});s.matches.forEach((m,i)=>{m.id=m.id||uid('match');m.phase=m.phase||'league';m.round=m.round||`Giornata ${i+1}`;m.roundIndex=Number(m.roundIndex)||0;m.groupName=m.groupName||'';m.bracketRound=m.bracketRound||'';m.bracketName=m.bracketName||'';m.bracketRoundIndex=Number(m.bracketRoundIndex)||0;m.bracketMatchIndex=Number(m.bracketMatchIndex)||0;m.sourceHome=m.sourceHome||'';m.sourceAway=m.sourceAway||'';m.homeTeamId=m.homeTeamId||'';m.awayTeamId=m.awayTeamId||'';m.homeLabel=m.homeLabel||'';m.awayLabel=m.awayLabel||'';m.date=m.date||'';m.time=m.time||'';m.datetime=m.datetime||'';m.field=m.field||'';m.referee=m.referee||'';m.status=normalizeMatchStatus(m.status);m.penalties=normalizePenalties(m.penalties);m.goals=Array.isArray(m.goals)?m.goals.map(g=>normalizeGoalEvent(g)):[];m.cards=Array.isArray(m.cards)?m.cards.map(c=>({id:c.id||uid('card'),playerId:c.playerId||'',type:c.type==='red'?'red':'yellow'})):[];});s.articles=Array.isArray(s.articles)?s.articles:[];s.articles=s.articles.map(a=>{const img=a.image||a.imageUrl||a.coverImage||a.photo||a.thumbnail||'';return {id:a.id||uid('article'),title:a.title||'Articolo senza titolo',body:a.body||'',image:img,createdAt:a.createdAt||new Date().toISOString(),updatedAt:a.updatedAt||a.createdAt||new Date().toISOString()};}).sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));return alignState(s,{silent:true});}
  function legacyStorageKeys(){
    try{return Object.keys(localStorage).filter(k=>/^new-generation-(admin|public)-state-v\d+$/.test(k)||/^nexora-(admin|public)-state/.test(k));}
    catch(e){return [];}
  }
  function cleanupLegacyStorage(keep=[]){
    const keepSet=new Set(keep);
    legacyStorageKeys().forEach(k=>{if(!keepSet.has(k))try{localStorage.removeItem(k);}catch(e){}});
  }
  function isDataUrl(value){return typeof value==='string'&&value.startsWith('data:');}
  function compactDataUrl(value,maxChars=350000){
    if(!isDataUrl(value))return value||'';
    return value.length<=maxChars?value:'';
  }
  function readStoredStateRaw(key){
    try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch(_){return null;}
  }
  function readPendingRemoteState(){
    try{
      const raw=localStorage.getItem(PENDING_REMOTE_SAVE_KEY);
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      if(!parsed||!parsed.state)return null;
      return {state:normalizeState(parsed.state),hash:parsed.hash||'',updatedAt:parsed.updatedAt||''};
    }catch(_){return null;}
  }
  function stateTimeValue(value){return Date.parse(value||0)||0;}
  function newestAdminLocalState(){
    const base=readStoredStateRaw(ADMIN_KEY);
    const pending=readPendingRemoteState();
    if(pending&&pending.state){
      const baseTime=stateTimeValue(base&&base._localUpdatedAt);
      const pendingTime=Math.max(stateTimeValue(pending.state._localUpdatedAt),stateTimeValue(pending.updatedAt));
      if(!base||pendingTime>=baseTime)return pending.state;
    }
    return base;
  }
  function mergeMissingMedia(next, previous){
    if(!next||!previous)return next;
    const oldTeams=Object.fromEntries((previous.teams||[]).map(t=>[t.id,t]));
    (next.teams||[]).forEach(t=>{
      const old=oldTeams[t.id];
      if(old&&(!t.logo||String(t.logo).length<80)&&old.logo)t.logo=old.logo;
    });
    const oldArticles=Object.fromEntries((previous.articles||[]).map(a=>[a.id,a]));
    (next.articles||[]).forEach(a=>{
      const old=oldArticles[a.id];
      if(!old||!old.image)return;
      const nextTime=Date.parse(a.updatedAt||a.createdAt||0)||0;
      const oldTime=Date.parse(old.updatedAt||old.createdAt||0)||0;
      const looksLikePartialUpdate=nextTime<=oldTime || String(a.image||'').length<80;
      if((!a.image||String(a.image).length<80)&&looksLikePartialUpdate)a.image=old.image;
    });
    return next;
  }
  function publicCacheState(state){
    const s=normalizeState(state);
    const previous=readStoredStateRaw(PUBLIC_KEY);
    const copy=mergeMissingMedia(JSON.parse(JSON.stringify(s)), previous);
    copy.teams=(copy.teams||[]).map(t=>({...t,logo:compactDataUrl(t.logo,350000)}));
    copy.articles=(copy.articles||[]).slice(0,20).map(a=>({...a,image:compactDataUrl(a.image,3000000)}));
    return copy;
  }
  function withoutHeavyMedia(state){
    const copy=JSON.parse(JSON.stringify(normalizeState(state)));
    copy.teams=(copy.teams||[]).map(t=>({...t,logo:isDataUrl(t.logo)?'':(t.logo||'')}));
    // Non rimuovere le immagini degli articoli: sono salvate come Data URL nello stato condiviso.
    // Se vengono svuotate qui, la pagina pubblica riceve articoli senza foto e mostra il placeholder.
    copy.articles=(copy.articles||[]).map(a=>({...a,image:compactDataUrl(a.image||'',3000000)}));
    return copy;
  }
  function trySetLocalStorage(key,value){
    try{localStorage.setItem(key,value);return true;}
    catch(err){
      const name=err&&err.name?err.name:'';
      const msg=err&&err.message?err.message:String(err||'');
      const quota=name==='QuotaExceededError'||name==='NS_ERROR_DOM_QUOTA_REACHED'||msg.toLowerCase().includes('quota');
      if(!quota)throw err;
      return false;
    }
  }
  const lastLocalWriteByKey={};
  let publicCacheWriteTimer=null;
  let pendingPublicCacheState=null;
  function writeLocalState(key,value){
    if(lastLocalWriteByKey[key]===value)return true;
    if(trySetLocalStorage(key,value)){lastLocalWriteByKey[key]=value;return true;}
    return false;
  }
  function safeWriteState(key,state,{publicCache=false}={}){
    cleanupLegacyStorage([ADMIN_KEY,PUBLIC_KEY]);
    const first=publicCache?publicCacheState(state):normalizeState(state);
    if(writeLocalState(key,JSON.stringify(first)))return {ok:true,compact:false};
    // Rimuove la cache pubblica prima di ritentare: evita doppio salvataggio admin+public con immagini pesanti.
    try{if(key!==PUBLIC_KEY)localStorage.removeItem(PUBLIC_KEY);}catch(e){}
    cleanupLegacyStorage([key]);
    if(writeLocalState(key,JSON.stringify(first)))return {ok:true,compact:false};
    const compact=withoutHeavyMedia(state);
    if(writeLocalState(key,JSON.stringify(compact)))return {ok:true,compact:true};
    console.warn('Spazio browser esaurito: stato non salvato in localStorage. I dati online restano la fonte principale.');
    return {ok:false,compact:true};
  }
  function load(mode){
    try{
      cleanupLegacyStorage([ADMIN_KEY,PUBLIC_KEY]);
      if(mode==='admin'){
        const adminState=newestAdminLocalState();
        return adminState?normalizeState(adminState):emptyState();
      }
      const raw=localStorage.getItem(PUBLIC_KEY);
      return raw?normalizeState(JSON.parse(raw)):emptyState();
    }catch(e){return emptyState();}
  }
  function schedulePublicCacheWrite(clean){
    pendingPublicCacheState=clean;
    clearTimeout(publicCacheWriteTimer);
    publicCacheWriteTimer=setTimeout(()=>{
      if(!pendingPublicCacheState)return;
      safeWriteState(PUBLIC_KEY,pendingPublicCacheState,{publicCache:true});
      pendingPublicCacheState=null;
    },350);
  }
  function save(mode,state){
    const clean=normalizeState(state);
    if(mode==='public'){
      safeWriteState(PUBLIC_KEY,clean,{publicCache:true});
      return clean;
    }
    const skipLocalTimestamp=Boolean(clean._skipLocalTimestamp);
    delete clean._skipLocalTimestamp;
    if(!skipLocalTimestamp){
      clean._localUpdatedAt=new Date().toISOString();
      clean._localRevision=Date.now();
    }
    safeWriteState(ADMIN_KEY,clean,{publicCache:false});
    // La copia pubblica locale è solo cache: la aggiorniamo in debounce per non bloccare i commit admin.
    schedulePublicCacheWrite(clean);
    try{
      window.dispatchEvent(new CustomEvent('ng:admin-local-state-saved',{detail:{state:clean}}));
    }catch(_){ }
    return clean;
  }
  function getTeam(state,id){return state.teams.find(t=>t.id===id);} 
  function getPlayer(state,id){for(const t of state.teams){const p=t.players.find(x=>x.id===id);if(p)return {...p,team:t,type:'player'};}return null;}
  function getPresident(state,id){for(const t of state.teams){if(t.president?.id===id&&t.president?.name)return {...t.president,team:t,type:'president'};}return null;}
  function getParticipant(state,id){return getPlayer(state,id)||getPresident(state,id);}
  function playerTeamId(state,playerId){const x=getParticipant(state,playerId);return x?.team.id||'';}
  function teamName(state,id,fallback='Da definire'){return getTeam(state,id)?.name||fallback;}
  function playerName(state,id){const p=getParticipant(state,id);return p?(p.type==='president'?`Pres. ${p.name}`:p.name):'Persona rimossa';}
  function isDoubleGoalEvent(g){return Number(g?.weight)===2;}
  function actualGoalCount(state,m,teamId){return (m.goals||[]).filter(g=>goalScoringTeamId(state,m,g)===teamId).length;}
  function eventScoreWeight(state,g){return isOwnGoalEvent(g)?1:(isPresidentId(state,g?.playerId)?1:((state?.rules?.isKingsLeague&&isDoubleGoalEvent(g))?2:1));}
  function matchGoals(state,m){let home=0,away=0;(m.goals||[]).forEach(g=>{const tid=goalScoringTeamId(state,m,g);const w=eventScoreWeight(state,g);if(tid===m.homeTeamId)home+=w;if(tid===m.awayTeamId)away+=w;});return {home,away};}
  function isLive(state,m){return m?.status==='live';}
  function hasGoals(state,m){const sc=matchGoals(state,m);return sc.home+sc.away>0;}
  function hasScore(state,m){
    if(!m)return false;
    if(m.status==='played')return true;
    if(m.status==='live')return false;
    const sc=matchGoals(state,m);
    if(sc.home+sc.away>0)return true;
    // KO 0-0 ma con rigori inseriti → consideralo con risultato
    if(isKnockoutPhase(m)&&m.penalties){
      const p=normalizePenalties(m.penalties);
      if(p&&(p.home+p.away)>0)return true;
    }
    return false;
  }
  function isPlayed(state,m){return hasScore(state,m) || (m.cards||[]).length>0 || Boolean(m.referee||m.field||m.date||m.time||m.datetime);}
  function matchStatusInfo(state,m){
    if(!m)return {key:'pending',label:'Da giocare',cls:'is-pending'};
    if(m.status==='live')return {key:'live',label:'Live',cls:'is-live'};
    const played=m.status==='played'||(matchGoals(state,m).home+matchGoals(state,m).away)>0;
    return played?{key:'played',label:'Giocata',cls:'is-played'}:{key:'pending',label:'Da giocare',cls:'is-pending'};
  }
  function scoreText(state,m){
    const s=matchGoals(state,m);
    const base=`${s.home} - ${s.away}`;
    if(s.home===s.away && isKnockoutPhase(m) && m.penalties){
      const p=normalizePenalties(m.penalties);
      if(p)return `${base} (${p.home}-${p.away} d.c.r.)`;
    }
    return base;
  }
  function penaltyWinnerId(state,m){
    if(!m||!m.penalties)return '';
    const p=normalizePenalties(m.penalties);
    if(!p)return '';
    if(p.home>p.away)return m.homeTeamId||'';
    if(p.away>p.home)return m.awayTeamId||'';
    return '';
  }
  function winnerId(state,m){
    if(!m)return '';
    if(m.homeTeamId&&!m.awayTeamId&&(m.awayLabel==='BYE'||!m.awayLabel))return m.homeTeamId;
    if(m.awayTeamId&&!m.homeTeamId&&(m.homeLabel==='BYE'||!m.homeLabel))return m.awayTeamId;
    const sc=matchGoals(state,m);
    if(sc.home>sc.away)return m.homeTeamId;
    if(sc.away>sc.home)return m.awayTeamId;
    // Pareggio nei tempi regolamentari: nelle fasi KO i rigori decidono
    if(isKnockoutPhase(m)){
      const pw=penaltyWinnerId(state,m);
      if(pw)return pw;
    }
    return '';
  }

  function isPowerOfTwo(n){return Number.isInteger(n)&&n>=2&&(n&(n-1))===0;}
  function nextPow2(n){let p=1;while(p<n)p*=2;return p;}
  function daysBetween(start,end){const a=new Date(start+'T00:00'),b=new Date(end+'T00:00');return Math.floor((b-a)/864e5)+1;}
  function addDays(date,days){const d=new Date(date+'T00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);}
  function weekdayOf(date){return new Date(date+'T00:00').getDay();}
  function weekdayLabels(days){const names=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];return (days||[]).map(d=>names[Number(d)]).join(', ');}
  function allowedDateList(start,end,playingDays){
    if(!start||!end)return [];
    const total=daysBetween(start,end);
    if(total<1)return [];
    const allowed=new Set((playingDays&&playingDays.length?playingDays:[0,1,2,3,4,5,6]).map(Number));
    const out=[];
    for(let i=0;i<total;i++){const d=addDays(start,i);if(allowed.has(weekdayOf(d)))out.push(d);}
    return out;
  }
  function requiredSlotsForRound(roundMatches,rules){
    const fields=Math.max(1,Number(rules.fieldCount)||1);
    const base=Math.ceil(roundMatches.length/fields);
    // Stima prudente: con garanzia Campo 1, le partite di girone che devono
    // assegnare il Campo 1 possono occupare slot/giorni separati anche se ci sono
    // altri campi liberi. Meglio stimare largo che promettere un calendario troppo corto.
    if(groupField1GuaranteeActive(rules)){
      const groupCount=roundMatches.filter(m=>m.phase==='group').length;
      if(groupCount)return Math.max(base,groupCount);
    }
    return base;
  }
  function requiredPlayingDaysForMatches(matches,rules){
    return matchesByRoundIndex(matches).reduce((sum,[,roundMatches])=>sum+requiredSlotsForRound(roundMatches,rules),0);
  }
  function suggestEndDateForMatches(matches,rules){
    rules=normalizeRules(rules);
    if(rules.oneDay){
      if(!rules.startDate||!rules.startTime)return {ok:false,message:'Inserisci data e ora inizio per stimare la fine del torneo giornaliero.'};
      const fields=Math.max(1,Number(rules.fieldCount)||1);
      const duration=Math.max(5,Number(rules.matchDuration)||40);
      const breakMinutes=Math.max(0,Number(rules.breakMinutes)||0);
      const step=duration+breakMinutes;
      const requiredSlots=matchesByRoundIndex(matches).reduce((sum,[,roundMatches])=>sum+requiredSlotsForRound(roundMatches,rules),0);
      const start=new Date(`${rules.startDate}T${rules.startTime}`);
      const pause=oneDayPauseWindow(rules);
      let scheduledSlots=0, slot=0, lastSlot=0;
      const guard=Math.max(200,requiredSlots+100);
      while(scheduledSlots<requiredSlots&&slot<guard){
        const dt=oneDaySlotDate(rules.startDate,rules.startTime,slot,step);
        const dayMinutes=dt.getHours()*60+dt.getMinutes();
        if(!slotOverlapsPause(dayMinutes,dayMinutes+duration,pause)){scheduledSlots++;lastSlot=slot;}
        slot++;
      }
      if(scheduledSlots<requiredSlots)return {ok:false,oneDay:true,message:'Impossibile stimare la fine del torneo giornaliero: controlla pausa programmata, durata partite e ora inizio.'};
      const end=new Date(start.getTime()+Math.max(0,lastSlot)*step*60000+duration*60000);
      const endTime=end.toTimeString().slice(0,5);
      const pauseText=pause?` Pausa programmata alle ${pause.startTime} per ${pause.duration} min.`:'';
      return {ok:true,oneDay:true,requiredSlots,calculatedEndTime:endTime,suggestedEndDate:rules.startDate,message:`Fine stimata torneo: ${endTime}. Calcolo su ${requiredSlots} slot, ${fields} campi, durata ${duration} min e pausa tra slot ${breakMinutes} min.${pauseText}`};
    }
    if(!rules.startDate)return {ok:false,message:'Inserisci la data inizio per stimare la data fine.'};
    const needed=requiredPlayingDaysForMatches(matches,rules);
    const days=rules.playingDays&&rules.playingDays.length?rules.playingDays:[0,1,2,3,4,5,6];
    let found=0,offset=0,last=rules.startDate;
    const guard=3660;
    while(found<needed&&offset<guard){const d=addDays(rules.startDate,offset);if(days.includes(weekdayOf(d))){found++;last=d;}offset++;}
    if(found<needed)return {ok:false,message:'Impossibile stimare la data fine entro un intervallo ragionevole. Controlla i giorni di gioco.'};
    return {ok:true,requiredDays:needed,suggestedEndDate:last,playingDaysLabel:weekdayLabels(days),message:`Con ${rules.fieldCount} campi e giorni di gioco ${weekdayLabels(days)}, servono circa ${needed} giorni di gioco. Data fine consigliata: ${last}.`};
  }

  function hashStringSeed(value){
    let h=2166136261>>>0;
    const str=String(value||'');
    for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
    return h||1;
  }
  function seededRandomFactory(seed){
    let t=hashStringSeed(seed);
    return function(){
      t+=0x6D2B79F5;
      let r=Math.imul(t^(t>>>15),1|t);
      r^=r+Math.imul(r^(r>>>7),61|r);
      return ((r^(r>>>14))>>>0)/4294967296;
    };
  }
  function seededShuffle(list,seed){
    const src=[...(list||[])];
    const out=[...src];
    if(!seed||out.length<2)return out;
    const rand=seededRandomFactory(seed);
    for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));const tmp=out[i];out[i]=out[j];out[j]=tmp;}
    // Una rigenerazione richiesta dall'admin deve produrre davvero un ordine diverso
    // quando esiste almeno un'alternativa sensata. Con liste molto corte può capitare
    // che il Fisher-Yates ritorni lo stesso ordine: in quel caso forziamo il reverse.
    if(out.every((x,i)=>x===src[i]))out.reverse();
    return out;
  }
  function orderRoundRobinRounds(rounds,seed){
    if(!seed)return rounds;
    return seededShuffle(rounds,seed).map(round=>seededShuffle(round,seed+'|pairs|'+round.map(p=>p.map(x=>x?.id||x?.label||'').join('-')).join('|')));
  }

  function minimumTeams(r){r=normalizeRules(r);if(r.format==='league')return 2;if(r.format==='knockout')return 2;if(r.format==='groups_knockout')return Math.max(4,r.groupConfigs.reduce((sum,g)=>sum+g.size,0));if(r.format==='league_knockout'){const maxEnd=Math.max(...r.eliminationCompetitions.map(c=>c.startRank+c.teams-1),0);return Math.max(2,maxEnd);}return 2;}
  function groupConfigsTotal(r){return normalizeRules(r).groupConfigs.reduce((sum,g)=>sum+g.size,0);}
  function groupQualifiersTotal(r){return normalizeRules(r).groupConfigs.reduce((sum,g)=>sum+g.qualifiers,0);}
  function roundRobinPairs(teams){const arr=[...teams];if(arr.length%2)arr.push(null);const rounds=[];const n=arr.length;for(let r=0;r<n-1;r++){const pairs=[];for(let i=0;i<n/2;i++){const a=arr[i],b=arr[n-1-i];if(a&&b)pairs.push(r%2?[b,a]:[a,b]);}rounds.push(pairs);arr.splice(1,0,arr.pop());}return rounds;}
  function splitGroupsBalanced(teams,n){const groups=Array.from({length:n},(_,i)=>({name:`Girone ${String.fromCharCode(65+i)}`,teams:[]}));teams.forEach((t,i)=>groups[i%n].teams.push(t));return groups;}
  function splitGroupsByConfig(teams,configs,assignments={}){
    // Distribuzione serpentina stile seeding: evita gironi creati solo a blocchi consecutivi
    // e mantiene più bilanciata la forza se l'ordine squadre rappresenta il ranking/seed.
    // Se esistono assegnazioni manuali valide, vengono rispettate e i posti vuoti sono riempiti.
    const groups=configs.map((g,i)=>({name:g.name||`Girone ${String.fromCharCode(65+i)}`,size:Math.max(2,Number(g.size)||2),qualifiers:Math.max(0,Number(g.qualifiers)||0),teams:[]}));
    if(!groups.length)return [];
    const byName=Object.fromEntries(groups.map(g=>[g.name,g]));
    const used=new Set();
    teams.forEach(t=>{const name=assignments&&assignments[t.id];const g=byName[name];if(g&&g.teams.length<g.size){g.teams.push(t);used.add(t.id);}});
    const remaining=teams.filter(t=>!used.has(t.id));
    let direction=1,idx=0;
    remaining.forEach(t=>{
      let guard=0;
      while(groups[idx]&&groups[idx].teams.length>=groups[idx].size&&guard<groups.length*3){idx+=direction;if(idx>=groups.length){idx=groups.length-1;direction=-1;}if(idx<0){idx=0;direction=1;}guard++;}
      if(groups[idx]&&groups[idx].teams.length<groups[idx].size)groups[idx].teams.push(t);
      idx+=direction;
      if(idx>=groups.length){idx=groups.length-1;direction=-1;}
      if(idx<0){idx=0;direction=1;}
    });
    return groups;
  }
  function plannedGroups(state){const r=normalizeRules(state.rules);return splitGroupsByConfig([...(state.teams||[])],r.groupConfigs,r.groupAssignments||{});}
  function groupAssignmentsFromMatches(state){const map={};(state.matches||[]).filter(m=>m.phase==='group'&&m.groupName).forEach(m=>{if(m.homeTeamId)map[m.homeTeamId]=m.groupName;if(m.awayTeamId)map[m.awayTeamId]=m.groupName;});return map;}
  function validateGroupAssignments(state,assignments){const r=normalizeRules(state.rules);if(r.format!=='groups_knockout')return {ok:false,message:'Le assegnazioni manuali sono disponibili solo per Gironi + eliminazione diretta.'};const names=r.groupConfigs.map(g=>g.name);const counts=Object.fromEntries(names.map(n=>[n,0]));for(const t of state.teams){const g=assignments[t.id];if(!g)return {ok:false,message:`Assegna anche ${t.name}.`};if(!names.includes(g))return {ok:false,message:`${t.name} è assegnata a un girone non valido.`};counts[g]++;}
    for(const cfg of r.groupConfigs){if(counts[cfg.name]!==cfg.size)return {ok:false,message:`${cfg.name}: ${counts[cfg.name]} squadre assegnate, ma la dimensione configurata è ${cfg.size}.`};}
    return {ok:true,message:'Assegnazioni valide.'};}
  function serpentineAssignments(state){const r=normalizeRules(state.rules);const groups=splitGroupsByConfig([...(state.teams||[])],r.groupConfigs,{});const out={};groups.forEach(g=>g.teams.forEach(t=>out[t.id]=g.name));return out;}
  function randomAssignments(state){const r=normalizeRules(state.rules);const teams=[...(state.teams||[])].sort(()=>Math.random()-.5);const groups=splitGroupsByConfig(teams,r.groupConfigs,{});const out={};groups.forEach(g=>g.teams.forEach(t=>out[t.id]=g.name));return out;}
  function createMatch(home,away,phase,round,roundIndex,extra={}){return {id:uid('match'),homeTeamId:home?.id||'',awayTeamId:away?.id||'',homeLabel:home?.label||home?.name||'',awayLabel:away?.label||away?.name||'',phase,round,roundIndex,groupName:extra.groupName||'',bracketRound:extra.bracketRound||'',bracketName:extra.bracketName||'',bracketRoundIndex:Number(extra.bracketRoundIndex)||0,bracketMatchIndex:Number(extra.bracketMatchIndex)||0,sourceHome:extra.sourceHome||'',sourceAway:extra.sourceAway||'',date:'',time:'',datetime:'',field:'',referee:'',status:'scheduled',goals:[],cards:[]};}
  function bracketRoundName(roundNo,totalRounds){if(roundNo===totalRounds)return 'Finale';if(roundNo===totalRounds-1)return 'Semifinali';if(roundNo===totalRounds-2)return 'Quarti di finale';if(roundNo===totalRounds-3)return 'Ottavi di finale';return `Turno ${roundNo}`;}
  // Accoppiamento KO classico richiesto: seed alta contro seed bassa.
  // Esempi: 4 squadre => 1-4, 2-3. 8 squadre => 1-8, 2-7, 3-6, 4-5.
  function seedEntrantsHighLow(entrants){const out=[];for(let i=0,j=entrants.length-1;i<j;i++,j--){out.push(entrants[i],entrants[j]);}if(entrants.length%2)out.push(entrants[Math.floor(entrants.length/2)]);return out;}
  function entrantLabelFromSeed(seed){return seed?`${seed}ª classificata`:'BYE';}
  function buildFirstRoundSlots(entrants,{prePaired=false}={}){
    const size=nextPow2(Math.max(2,entrants.length));
    if(prePaired){const slots=[...entrants];while(slots.length<size)slots.push({label:'BYE'});return slots;}
    const seeded=Array.from({length:size},(_,i)=>entrants[i]||{label:'BYE',seed:i+1});
    return seedEntrantsHighLow(seeded);
  }
  function genKO(entrants,phase,startIndex,prefix='',bracketName='Tabellone',options={}){
    const size=nextPow2(Math.max(2,entrants.length));
    let slots=buildFirstRoundSlots(entrants,options);
    const total=Math.log2(size);
    const out=[];let current=slots;
    for(let r=1;r<=total;r++){
      const roundName=bracketRoundName(r,total);
      const roundLabel=prefix?`${prefix} · ${roundName}`:roundName;
      const next=[];
      for(let i=0;i<current.length;i+=2){
        const a=current[i],b=current[i+1];
        const matchNo=Math.floor(i/2)+1;
        out.push(createMatch(a,b,phase,roundLabel,startIndex+r-1,{bracketRound:roundName,bracketName,bracketRoundIndex:r,bracketMatchIndex:matchNo,sourceHome:a?.source||'',sourceAway:b?.source||''}));
        next.push({label:`Vincente ${roundName} ${matchNo}`,source:`winner:${bracketName}:${r}:${matchNo}`});
      }
      current=next;
    }
    return out;
  }
  function leagueEntrants(count,startRank=0,label='Classificata'){return Array.from({length:count},(_,i)=>({label:`${startRank+i+1}ª ${label}`,source:`league:${startRank+i+1}`,seed:i+1}));}
  function groupSlot(group,pos){return {label:`${pos}ª ${group}`,source:`group:${group}:${pos}`};}
  function twoGroupOppositeFirstSlots(a,b,qa,qb){
    // Regola sportiva richiesta: con due gironi, le due prime classificate devono
    // stare in metà opposte del tabellone. Questo vale anche in casi non standard
    // come 3 qualificate per girone, dove il tabellone da 8 contiene BYE.
    if(qa!==qb||qa<1)return null;
    if(qa===1)return [groupSlot(a.name,1),groupSlot(b.name,1)];
    const q=qa;
    const size=nextPow2(Math.max(2,q*2));
    const pairCount=size/2;
    const oppositePair=Math.floor(pairCount/2);
    const pairs=Array.from({length:pairCount},()=>null);
    let byes=size-(q*2);
    const bye=()=>({label:'BYE'});
    const usedA=new Set([1]), usedB=new Set([1]);
    function takeBye(){if(byes>0){byes--;return bye();}return null;}
    function lowestUnused(prefix){
      const used=prefix==='A'?usedA:usedB;
      for(let i=2;i<=q;i++){if(!used.has(i)){used.add(i);return prefix==='A'?groupSlot(a.name,i):groupSlot(b.name,i);}}
      return takeBye()||bye();
    }
    function highestUnused(prefix){
      const used=prefix==='A'?usedA:usedB;
      for(let i=q;i>=2;i--){if(!used.has(i)){used.add(i);return prefix==='A'?groupSlot(a.name,i):groupSlot(b.name,i);}}
      return takeBye()||bye();
    }
    pairs[0]=[groupSlot(a.name,1),takeBye()||highestUnused('B')];
    pairs[oppositePair]=[groupSlot(b.name,1),takeBye()||highestUnused('A')];
    const firstHalf=[], secondHalf=[];
    for(let i=1;i<pairCount;i++){
      if(i===oppositePair)continue;
      (i<oppositePair?firstHalf:secondHalf).push(i);
    }
    const ordered=[];
    const max=Math.max(firstHalf.length,secondHalf.length);
    for(let i=0;i<max;i++){if(firstHalf[i]!=null)ordered.push(firstHalf[i]);if(secondHalf[i]!=null)ordered.push(secondHalf[i]);}
    let flip=false;
    for(const idx of ordered){
      if(byes>0){
        const left=flip?lowestUnused('B'):lowestUnused('A');
        pairs[idx]=[left,takeBye()||bye()];
      }else{
        pairs[idx]=flip?[lowestUnused('B'),highestUnused('A')]:[lowestUnused('A'),highestUnused('B')];
      }
      flip=!flip;
    }
    return pairs.flat();
  }
  function groupQualifierSlotsFromConfigs(groupConfigs){
    const groups=normalizeRules({groupConfigs}).groupConfigs;
    if(groups.length===2){
      const a=groups[0], b=groups[1];
      const qa=Number(a.qualifiers)||0, qb=Number(b.qualifiers)||0;
      const opposite=twoGroupOppositeFirstSlots(a,b,qa,qb);
      if(opposite)return opposite;
    }
    const all=[];
    const maxQ=Math.max(0,...groups.map(g=>Number(g.qualifiers)||0));
    for(let pos=1;pos<=maxQ;pos++){
      groups.forEach((g,idx)=>{if(pos<=g.qualifiers)all.push({label:`${pos}ª ${g.name}`,source:`group:${g.name}:${pos}`,groupName:g.name,pos,seed:all.length+1});});
    }
    const paired=[];
    const list=[...all];
    while(list.length>1){
      const a=list.shift();
      let idx=list.length-1;
      while(idx>0&&list[idx].groupName===a.groupName)idx--;
      const b=list.splice(idx,1)[0];
      paired.push(a,b);
    }
    if(list.length)paired.push(list[0]);
    return paired;
  }
  function sortedCompetitions(r){return normalizeRules(r).eliminationCompetitions.slice().sort((a,b)=>a.startRank-b.startRank||a.name.localeCompare(b.name));}

  function buildMatches(state){
    const r=normalizeRules(state.rules);
    const seed=String(r.calendarVariantSeed||'');
    const baseTeams=[...(state.teams||[])];
    const tournamentTeams=seed?seededShuffle(baseTeams,seed+'|teams|'+r.format):baseTeams;
    const matches=[];

    function addRoundRobin(teamList,phase,roundPrefix,startIndex=0,extraFactory=null,seedPart=''){
      const teamsForRR=teamList;
      const rounds=orderRoundRobinRounds(roundRobinPairs(teamsForRR),seed?seed+'|rr-rounds|'+seedPart:'');
      rounds.forEach((round,i)=>round.forEach(([h,a])=>{
        const extra=extraFactory?extraFactory(i,h,a):{};
        matches.push(createMatch(h,a,phase,`${roundPrefix}${i+1}`,startIndex+i,extra));
      }));
      return rounds.length;
    }

    if(r.format==='league'){
      addRoundRobin(tournamentTeams,'league','Giornata ',0,null,'league');
      return matches;
    }
    if(r.format==='knockout'){
      return genKO(tournamentTeams,'knockout',0,'Tabellone','Tabellone principale');
    }
    if(r.format==='groups_knockout'){
      // Se l'admin ha assegnato manualmente i gironi, le assegnazioni restano intoccate.
      // Se non ci sono assegnazioni complete, la seed del calendario permette un sorteggio
      // alternativo, ma sempre bilanciato sui posti configurati dei gironi.
      const groups=splitGroupsByConfig(tournamentTeams,r.groupConfigs,r.groupAssignments||{});
      let maxGroupRounds=0;
      groups.forEach(g=>{
        const rounds=addRoundRobin(g.teams,'group',`${g.name} · Giornata `,0,(ri)=>({groupName:g.name}),`group|${g.name}`);
        maxGroupRounds=Math.max(maxGroupRounds,rounds);
      });
      matches.push(...genKO(groupQualifierSlotsFromConfigs(r.groupConfigs),'knockout',maxGroupRounds,'Fase finale','Fase finale',{prePaired:true}));
      return matches;
    }
    if(r.format==='league_knockout'){
      const rounds=orderRoundRobinRounds(roundRobinPairs(tournamentTeams),seed?seed+'|league-ko-rr':'');
      rounds.forEach((round,i)=>round.forEach(([h,a])=>matches.push(createMatch(h,a,'league',`Giornata ${i+1}`,i))));
      let maxKO=0;
      sortedCompetitions(r).forEach((c,idx)=>{
        const phase=idx===0?'playoff':'secondary_playoff';
        const entrants=leagueEntrants(c.teams,c.startRank-1,'classificata');
        matches.push(...genKO(entrants,phase,rounds.length,c.name,c.name));
        maxKO=Math.max(maxKO,Math.log2(nextPow2(c.teams)));
      });
      if(r.superCup?.enabled){
        const comps=sortedCompetitions(r);
        const h=comps.find(c=>c.id===r.superCup.homeCompetitionId)||comps[0];
        const a=comps.find(c=>c.id===r.superCup.awayCompetitionId)||comps[1];
        if(h&&a&&h.id!==a.id){
          matches.push(createMatch({label:`Vincente ${h.name}`,source:`bracketwinner:${h.name}`},{label:`Vincente ${a.name}`,source:`bracketwinner:${a.name}`},'supercup','Supercoppa',rounds.length+maxKO,{bracketRound:'Supercoppa',bracketName:'Supercoppa',bracketRoundIndex:1,bracketMatchIndex:1,sourceHome:`bracketwinner:${h.name}`,sourceAway:`bracketwinner:${a.name}`}));
        }
      }
      return matches;
    }
    return matches;
  }

  function matchesByRoundIndex(matches){const map=new Map();matches.forEach(m=>{const k=m.roundIndex||0;if(!map.has(k))map.set(k,[]);map.get(k).push(m);});return [...map.entries()].sort((a,b)=>a[0]-b[0]);}

  function matchTeamIds(m){return [m.homeTeamId,m.awayTeamId].filter(Boolean);}
  function timeLabel(d){return d.toTimeString().slice(0,5);}
  function dateTimeKey(date,time,field){return `${date}|${time||'NO_TIME'}|${field}`;}
  function minutesFromTime(value){const [h,m]=String(value||'00:00').split(':').map(Number);return (Number(h)||0)*60+(Number(m)||0);}
  function oneDayPauseWindow(rules){rules=normalizeRules(rules);if(!rules.oneDay||!rules.oneDayPauseEnabled||!rules.oneDayPauseStart||!rules.oneDayPauseDuration)return null;const start=minutesFromTime(rules.oneDayPauseStart);const end=start+Math.max(0,Number(rules.oneDayPauseDuration)||0);return end>start?{start,end,startTime:rules.oneDayPauseStart,duration:Math.max(0,Number(rules.oneDayPauseDuration)||0)}:null;}
  function slotOverlapsPause(slotStart,slotEnd,pause){return Boolean(pause&&slotStart<pause.end&&slotEnd>pause.start);}
  function oneDaySlotDate(startDate,startTime,slot,step){return new Date(new Date(`${startDate}T${startTime}`).getTime()+slot*step*60000);}
  function oneDayCalendarPauseEvent(rules){const pause=oneDayPauseWindow(rules);if(!pause||!rules.startDate)return null;return {type:'pause',id:'pause_one_day',date:rules.startDate,time:pause.startTime,duration:pause.duration,label:'Pausa programmata'};}

  function groupFieldMap(rules){
    rules=normalizeRules(rules);
    const groups=rules.groupConfigs||[];
    if(rules.format!=='groups_knockout'||rules.groupFieldPolicy!=='fixed_by_group'||groups.length!==rules.fieldCount)return null;
    return Object.fromEntries(groups.map((g,i)=>[g.name,i+1]));
  }
  function allowedFieldsForMatch(match,rules){
    // Requisito fondamentale: nella fase a gironi ogni squadra deve giocare
    // almeno una volta sul Campo 1. Per questo, se il torneo è a gironi e ci
    // sono più campi, le partite del girone possono usare tutti i campi anche
    // quando l'admin aveva scelto la mappatura girone → campo.
    if(groupField1GuaranteeActive(rules)&&match.phase==='group')return fieldNumbers(rules);
    const fixed=groupFieldMap(rules);
    if(fixed&&match.phase==='group'&&match.groupName&&fixed[match.groupName])return [fixed[match.groupName]];
    return fieldNumbers(rules);
  }
  function groupField1GuaranteeActive(rules){
    rules=normalizeRules(rules);
    return rules.format==='groups_knockout'&&Number(rules.fieldCount)>1;
  }
  function fieldNumbers(rules){
    const count=Math.max(1,Number(rules.fieldCount)||1);
    return Array.from({length:count},(_,i)=>i+1);
  }
  function groupFieldPolicyMessage(rules){
    const fixed=groupFieldMap(rules);
    if(groupField1GuaranteeActive(rules)){
      const extra=fixed?' La priorità Campo 1 supera la mappatura girone → campo quando serve.':'';
      return ' Garanzia Campo 1 attiva: ogni squadra della fase a gironi viene programmata almeno una volta sul Campo 1.'+extra;
    }
    if(fixed)return ' Mappatura campi attiva: '+Object.entries(fixed).map(([g,f])=>`${g} → Campo ${f}`).join(' · ')+'.';
    if(rules&&rules.groupFieldPolicy==='rotate_per_team'&&Number(rules.fieldCount)>1)
      return ' Rotazione campi attiva: le partite di ogni squadra vengono distribuite tra i campi disponibili, così nessuna squadra gioca sempre sullo stesso campo.';
    return '';
  }
  // Rotazione campi per squadra: tra i campi candidati (già liberi nello slot/giorno)
  // sceglie quello che mantiene più bilanciato l'uso dei campi delle squadre coinvolte.
  // Best practice round-robin multi-campo: si minimizza il riuso dello stesso campo da
  // parte della stessa squadra, evitando che una squadra giochi sempre sullo stesso campo.
  function pickRotatedField(candidateFields,teams,teamFieldUse){
    if(!candidateFields.length)return 1;
    if(candidateFields.length===1)return candidateFields[0];
    let best=candidateFields[0],bestScore=Infinity;
    for(const field of candidateFields){
      let worstRatio=0;
      for(const t of teams){
        const use=teamFieldUse[t]||{};
        const afterThis=(use[field]||0)+1;
        const total=Object.values(use).reduce((a,b)=>a+b,0)+1;
        const ratio=afterThis/total;
        if(ratio>worstRatio)worstRatio=ratio;
      }
      const score=worstRatio+(field-1)*0.15;
      if(score<bestScore){bestScore=score;best=field;}
    }
    return best;
  }
  function noteFieldUse(teamFieldUse,teams,field){
    for(const t of teams){
      if(!teamFieldUse[t])teamFieldUse[t]={};
      teamFieldUse[t][field]=(teamFieldUse[t][field]||0)+1;
    }
  }
  // Quando la rotazione è attiva conviene piazzare per prime, dentro un turno, le
  // partite le cui squadre sono più "concentrate" su un singolo campo: così possono
  // scegliere il campo che le riequilibra prima che gli slot si riempiano.
  function orderRoundForRotation(roundMatches,teamFieldUse){
    const concentration=m=>{
      let worst=0;
      for(const t of matchTeamIds(m)){
        const f=teamFieldUse[t]||{};
        const counts=Object.values(f);
        const sum=counts.reduce((a,b)=>a+b,0);
        const max=counts.length?Math.max(...counts):0;
        const distinct=counts.length;
        // più alta se la squadra usa pochi campi e ne ha uno dominante
        worst=Math.max(worst,(sum?max/sum:0)+(distinct?1/distinct:1));
      }
      return worst;
    };
    return [...roundMatches].sort((a,b)=>concentration(b)-concentration(a));
  }

  // Scheduler vincolato:
  // - mai due partite sullo stesso campo nello stesso slot;
  // - mai la stessa squadra in contemporanea;
  // - nei tornei multi-giorno una squadra non gioca più di una partita nello stesso giorno;
  // - nei tornei in un giorno la stessa squadra può giocare anche slot consecutivi, ma mai nello stesso slot.
  // Le fasi/roundIndex vengono pianificate in ordine, così un turno KO non viene calendarizzato prima del turno precedente.

  function needsGroupField1(match,teamFieldUse,rules){
    if(!groupField1GuaranteeActive(rules)||match.phase!=='group')return false;
    return matchTeamIds(match).some(t=>!((teamFieldUse[t]||{})[1]));
  }
  function groupField1Audit(matches,rules){
    if(!groupField1GuaranteeActive(rules))return {ok:true,total:0,missing:[]};
    const all=new Set(), covered=new Set();
    (matches||[]).forEach(m=>{
      if(m.phase!=='group')return;
      const ids=matchTeamIds(m);
      ids.forEach(t=>all.add(t));
      if(fieldNoFromLabel(m.field)===1)ids.forEach(t=>covered.add(t));
    });
    const missing=[...all].filter(t=>!covered.has(t));
    return {ok:missing.length===0,total:all.size,covered:covered.size,missing};
  }
  function groupSlotKey(match,rules){
    return rules.oneDay?`${match.date||''}|${match.time||''}`:`${match.date||''}|GIORNO`;
  }
  function swapFields(a,b){const tmp=a.field;a.field=b.field;b.field=tmp;}
  function enforceField1Fallback(matches,rules){
    // Backup post-scheduler: se dopo la generazione una squadra del girone non
    // ha ancora Campo 1, prova a scambiare il campo con una partita dello stesso
    // slot senza creare sovrapposizioni. La scelta primaria avviene già durante
    // lo scheduling; questa funzione serve a correggere casi limite e vecchi dati.
    if(!groupField1GuaranteeActive(rules))return {ok:true,total:0,missing:[]};
    let audit=groupField1Audit(matches,rules);
    if(audit.ok)return audit;
    const bySlot=new Map();
    (matches||[]).forEach(m=>{const k=groupSlotKey(m,rules);if(!bySlot.has(k))bySlot.set(k,[]);bySlot.get(k).push(m);});
    function counts(){
      const c={};
      (matches||[]).forEach(m=>{if(m.phase==='group'&&fieldNoFromLabel(m.field)===1)matchTeamIds(m).forEach(t=>c[t]=(c[t]||0)+1);});
      return c;
    }
    let guard=0;
    while(!audit.ok&&guard++<50){
      let changed=false;
      const c=counts();
      for(const tid of audit.missing){
        const candidates=(matches||[]).filter(m=>m.phase==='group'&&matchTeamIds(m).includes(tid)&&fieldNoFromLabel(m.field)!==1);
        for(const m of candidates){
          const slot=bySlot.get(groupSlotKey(m,rules))||[];
          const onOne=slot.find(x=>x!==m&&fieldNoFromLabel(x.field)===1);
          if(!onOne){m.field='Campo 1';changed=true;break;}
          const losing=matchTeamIds(onOne);
          if(losing.every(t=>(c[t]||0)>1)){
            swapFields(m,onOne);changed=true;break;
          }
        }
        if(changed)break;
      }
      audit=groupField1Audit(matches,rules);
      if(!changed)break;
    }
    return audit;
  }

  function scheduleMatches(matches,rules){
    const fields=Math.max(1,Number(rules.fieldCount)||1);
    const duration=Math.max(5,Number(rules.matchDuration)||40);
    const breakMinutes=Math.max(0,Number(rules.breakMinutes)||0);
    const step=duration+breakMinutes;
    const groups=matchesByRoundIndex(matches);

    const rotateFields=fields>1&&!groupFieldMap(rules);
    const teamFieldUse={};

    if(rules.oneDay){
      if(!rules.startDate||!rules.startTime)return {ok:false,message:'Per torneo in un giorno indica data e ora inizio. L’ora fine viene calcolata automaticamente.'};
      const start=new Date(`${rules.startDate}T${rules.startTime}`);
      const pause=oneDayPauseWindow(rules);
      const estimatedSlots=groups.reduce((sum,[,roundMatches])=>sum+Math.ceil(roundMatches.length/fields),0)+matches.length+80;
      const slotTeams=Array.from({length:estimatedSlots},()=>new Set());
      const slotFieldBusy=new Set();
      let earliestSlot=0;
      let maxSlotUsed=-1;

      for(const [,roundMatchesRaw] of groups){
        const roundMatches=rotateFields?orderRoundForRotation(roundMatchesRaw,teamFieldUse):roundMatchesRaw;
        let maxSlotUsedInRound=earliestSlot-1;
        for(const match of roundMatches){
          const teams=matchTeamIds(match);
          let placed=false;
          for(let slot=earliestSlot;slot<estimatedSlots&&!placed;slot++){
            const dt=new Date(start.getTime()+slot*step*60000);
            const dayMinutes=dt.getHours()*60+dt.getMinutes();
            if(slotOverlapsPause(dayMinutes,dayMinutes+duration,pause))continue;
            if(teams.some(t=>slotTeams[slot].has(t)))continue;
            const time=timeLabel(dt);
            // Campi candidati: tutti quelli ammessi e liberi in questo slot.
            let freeFields=allowedFieldsForMatch(match,rules).filter(field=>!slotFieldBusy.has(dateTimeKey(rules.startDate,time,field)));
            if(needsGroupField1(match,teamFieldUse,rules)){
              // Se una delle due squadre non ha ancora giocato sul Campo 1, questa
              // partita aspetta il primo slot in cui il Campo 1 è libero. Così il
              // requisito non dipende da correzioni successive o da fortuna.
              if(!freeFields.includes(1))continue;
              freeFields=[1];
            }
            if(!freeFields.length)continue;
            // Con rotazione attiva scegliamo il campo che bilancia l'uso per squadra,
            // altrimenti il primo libero (comportamento storico).
            const field=freeFields.length===1?freeFields[0]:(rotateFields?pickRotatedField(freeFields,teams,teamFieldUse):freeFields[0]);
            match.date=rules.startDate;
            match.time=time;
            match.datetime=`${match.date}T${match.time}`;
            match.field=`Campo ${field}`;
            slotFieldBusy.add(dateTimeKey(rules.startDate,time,field));
            teams.forEach(t=>slotTeams[slot].add(t));
            if(rotateFields||groupField1GuaranteeActive(rules))noteFieldUse(teamFieldUse,teams,field);
            maxSlotUsedInRound=Math.max(maxSlotUsedInRound,slot);
            maxSlotUsed=Math.max(maxSlotUsed,slot);
            placed=true;
          }
          if(!placed)return {ok:false,message:'Calendario impossibile: non riesco a collocare tutte le partite senza sovrapposizioni di campo/squadra. Aumenta campi o riduci durata/pausa.'};
        }
        earliestSlot=maxSlotUsedInRound+1;
      }
      const end=new Date(start.getTime()+Math.max(0,maxSlotUsed)*step*60000+duration*60000);
      const pauseText=pause?` Pausa programmata alle ${pause.startTime} per ${pause.duration} min inserita nel calendario.`:'';
      const f1=fields>1?enforceField1Fallback(matches,rules):{ok:true,total:0,missing:[]};
      if(!f1.ok)return {ok:false,message:`Calendario impossibile: non riesco a garantire almeno una partita sul Campo 1 per tutte le squadre dei gironi. Mancanti: ${f1.missing.length}. Aumenta la durata del torneo o consenti più slot di gioco.`};
      const f1Text=f1.total?` Garanzia Campo 1 verificata per ${f1.covered}/${f1.total} squadre dei gironi.`:'';
      return {ok:true,calculatedEndTime:end.toTimeString().slice(0,5),message:`Calendario generato: ${matches.length} partite in un giorno su ${fields} campi. Fine stimata: ${end.toTimeString().slice(0,5)}.${pauseText} Nessuna squadra gioca in contemporanea e nessun campo è sovrapposto.${groupFieldPolicyMessage(rules)}${f1Text}`};
    }

    if(!rules.startDate||!rules.endDate)return {ok:false,message:'Per tornei su più giorni indica data inizio e data fine.'};
    if(daysBetween(rules.startDate,rules.endDate)<1)return {ok:false,message:'La data fine deve essere uguale o successiva alla data inizio.'};
    const allowedDates=allowedDateList(rules.startDate,rules.endDate,rules.playingDays);
    if(!allowedDates.length)return {ok:false,message:'Nel periodo indicato non esistono date che rispettano i giorni della settimana selezionati.'};

    const dayTeams=Array.from({length:allowedDates.length},()=>new Set());
    const dayFieldBusy=Array.from({length:allowedDates.length},()=>new Set());
    let earliestDay=0;

    for(const [,roundMatches] of groups){
      const orderedMatches=rotateFields?orderRoundForRotation(roundMatches,teamFieldUse):roundMatches;
      let maxDayUsed=earliestDay-1;
      for(const match of orderedMatches){
        const teams=matchTeamIds(match);
        let placed=false;
        for(let day=earliestDay;day<allowedDates.length&&!placed;day++){
          // Nei tornei lunghi una squadra non deve disputare due partite nello stesso giorno.
          if(teams.some(t=>dayTeams[day].has(t)))continue;
          // Campi candidati: ammessi e liberi in questa data.
          let freeFields=allowedFieldsForMatch(match,rules).filter(field=>!dayFieldBusy[day].has(field));
          if(needsGroupField1(match,teamFieldUse,rules)){
            if(!freeFields.includes(1))continue;
            freeFields=[1];
          }
          if(!freeFields.length)continue;
          const field=freeFields.length===1?freeFields[0]:(rotateFields?pickRotatedField(freeFields,teams,teamFieldUse):freeFields[0]);
          match.date=allowedDates[day];
          match.time='';
          match.datetime='';
          match.field=`Campo ${field}`;
          dayFieldBusy[day].add(field);
          teams.forEach(t=>dayTeams[day].add(t));
          if(rotateFields||groupField1GuaranteeActive(rules))noteFieldUse(teamFieldUse,teams,field);
          maxDayUsed=Math.max(maxDayUsed,day);
          placed=true;
        }
        if(!placed){
          const estimate=suggestEndDateForMatches(matches,rules);
          const extra=estimate.ok?` Data fine consigliata: ${estimate.suggestedEndDate}.`:'';
          return {ok:false,message:`Calendario impossibile tra ${rules.startDate} e ${rules.endDate} nei giorni selezionati (${weekdayLabels(rules.playingDays)}): non ci sono abbastanza giorni/campi per evitare sovrapposizioni e doppie partite della stessa squadra nello stesso giorno.${extra}`};
        }
      }
      // La fase/giornata seguente parte dalla prossima data di gioco successiva all’ultima partita del turno corrente.
      earliestDay=maxDayUsed+1;
      if(earliestDay>allowedDates.length&&groups[groups.length-1][1]!==roundMatches){
        return {ok:false,message:'Calendario impossibile: non restano date di gioco disponibili per completare tutte le fasi nel periodo indicato.'};
      }
    }

    const f1=fields>1?enforceField1Fallback(matches,rules):{ok:true,total:0,missing:[]};
    if(!f1.ok)return {ok:false,message:`Calendario impossibile: non riesco a garantire almeno una partita sul Campo 1 per tutte le squadre dei gironi. Mancanti: ${f1.missing.length}. Estendi il periodo o aggiungi date giocabili.`};
    const usedDays=[...new Set(matches.map(m=>m.date).filter(Boolean))].length;
    const f1Text=f1.total?` Garanzia Campo 1 verificata per ${f1.covered}/${f1.total} squadre dei gironi.`:'';
    return {ok:true,message:`Calendario generato su ${usedDays} date di gioco tra ${rules.startDate} e ${rules.endDate} (${weekdayLabels(rules.playingDays)}). Nessuna squadra gioca due volte nello stesso giorno e nessun campo è sovrapposto.${groupFieldPolicyMessage(rules)}${f1Text}`};
  }

  function validateCompetitionConfig(r, teamCount=null){
    r=normalizeRules(r);
    if(r.format!=='league_knockout')return {ok:true,message:'Configurazione competizioni non richiesta per questo formato.'};
    const comps=sortedCompetitions(r);
    if(!comps.length)return {ok:false,message:'Deve esistere almeno una competizione: di default Playoff Oro.'};
    let expectedStart=1;
    for(const c of comps){
      if(c.startRank!==expectedStart)return {ok:false,message:`${c.name}: posizione non valida. Le fasce devono essere consecutive e partire dalla 1ª posizione. Posizione attesa: ${expectedStart}ª.`};
      if(!isPowerOfTwo(c.teams))return {ok:false,message:`${c.name}: il numero squadre deve essere 2, 4, 8, 16, ecc.`};
      const end=c.startRank+c.teams-1;
      if(teamCount!==null&&end>teamCount)return {ok:false,message:`${c.name}: richiede le classificate dalla ${c.startRank}ª alla ${end}ª, ma ci sono solo ${teamCount} squadre.`};
      expectedStart=end+1;
    }
    if(r.superCup?.enabled){
      if(comps.length<2)return {ok:false,message:'La Supercoppa si può abilitare solo se esistono almeno due competizioni a eliminazione diretta.'};
      const ids=comps.map(c=>c.id);
      if(!r.superCup.homeCompetitionId||!r.superCup.awayCompetitionId||r.superCup.homeCompetitionId===r.superCup.awayCompetitionId)return {ok:false,message:'Per la Supercoppa scegli due competizioni diverse.'};
      if(!ids.includes(r.superCup.homeCompetitionId)||!ids.includes(r.superCup.awayCompetitionId))return {ok:false,message:'Le competizioni scelte per la Supercoppa non esistono.'};
    }
    return {ok:true,message:'Competizioni a eliminazione diretta valide.'};
  }

  function validateGeneration(state){const r=normalizeRules(state.rules);const teams=state.teams.length;const min=minimumTeams(r);if(teams<min)return {ok:false,message:`Servono almeno ${min} squadre per ${FORMAT_LABELS[r.format]}. Inserite: ${teams}.`};if(Number(r.fieldCount||0)<1)return {ok:false,message:'Inserisci almeno 1 campo disponibile.'};if(!r.oneDay&&(!Array.isArray(r.playingDays)||!r.playingDays.length))return {ok:false,message:'Seleziona almeno un giorno della settimana in cui si può giocare.'};if(r.format==='league')return {ok:true,message:'Formato valido: campionato unico senza fasi successive.'};if(r.format==='knockout')return {ok:true,message:'Formato valido: solo tabellone a eliminazione diretta.'};if(r.format==='groups_knockout'){const cfgs=r.groupConfigs||[];if(cfgs.length<2)return {ok:false,message:'Per gironi + eliminazione diretta servono almeno 2 gironi.'};if(r.groupFieldPolicy==='fixed_by_group'&&cfgs.length!==r.fieldCount)return {ok:false,message:`La modalità girone → campo richiede che il numero di gironi (${cfgs.length}) sia uguale al numero di campi (${r.fieldCount}).`};const totalSizes=cfgs.reduce((sum,g)=>sum+g.size,0);if(totalSizes!==teams)return {ok:false,message:`La somma delle squadre nei gironi deve essere uguale alle squadre iscritte. Configurate: ${totalSizes}, iscritte: ${teams}.`};for(const g of cfgs){if(g.size<2)return {ok:false,message:`${g.name}: servono almeno 2 squadre.`};if(g.qualifiers<0)return {ok:false,message:`${g.name}: qualificate non valide.`};if(g.qualifiers>g.size)return {ok:false,message:`${g.name}: non puoi qualificare ${g.qualifiers} squadre su ${g.size}.`};}const totalQ=cfgs.reduce((sum,g)=>sum+g.qualifiers,0);if(totalQ<2)return {ok:false,message:'Devono qualificarsi almeno 2 squadre complessive alla fase finale.'};if(totalQ>teams)return {ok:false,message:'Le qualificate alla fase finale non possono superare le squadre iscritte.'};return {ok:true,message:'Formato valido: gironi personalizzati + fase finale a eliminazione con eventuali BYE.'};}if(r.format==='league_knockout'){const cfg=validateCompetitionConfig(r,teams);if(!cfg.ok)return cfg;return {ok:true,message:'Formato valido: campionato unico + competizioni a eliminazione diretta configurabili.'};}return {ok:false,message:'Formato torneo non riconosciuto.'};}
  function scheduleSignature(state){
    const r=normalizeRules(state.rules);
    const rulesForSchedule={schema:'v130-calendar-variant-cross-seeding',format:r.format,groupConfigs:r.groupConfigs,groupAssignments:r.groupAssignments,playoffTeams:r.playoffTeams,eliminationCompetitions:r.eliminationCompetitions,superCup:r.superCup,isKingsLeague:r.isKingsLeague,oneDay:r.oneDay,fieldCount:r.fieldCount,startDate:r.startDate,endDate:r.endDate,startTime:r.startTime,matchDuration:r.matchDuration,breakMinutes:r.breakMinutes,oneDayPauseEnabled:r.oneDayPauseEnabled,oneDayPauseStart:r.oneDayPauseStart,oneDayPauseDuration:r.oneDayPauseDuration,playingDays:r.playingDays,groupFieldPolicy:r.groupFieldPolicy,calendarVariantSeed:r.calendarVariantSeed};
    const teams=(state.teams||[]).map(t=>({id:t.id}));
    return JSON.stringify({rules:rulesForSchedule,teams});
  }
  function matchPreserveKey(m){
    const h=m.homeTeamId||m.sourceHome||m.homeLabel||'';
    const a=m.awayTeamId||m.sourceAway||m.awayLabel||'';
    return [m.phase||'',m.groupName||'',m.bracketName||'',m.bracketRoundIndex||0,m.bracketMatchIndex||0,m.round||'',h,a].join('|');
  }
  function matchLooseKey(m){
    const pair=[m.homeTeamId||m.sourceHome||m.homeLabel||'',m.awayTeamId||m.sourceAway||m.awayLabel||''].sort().join('~');
    return [m.phase||'',m.groupName||'',m.bracketName||'',m.round||'',pair].join('|');
  }
  function preserveMatchData(newMatches,oldMatches){
    const exact=new Map(), loose=new Map();
    (oldMatches||[]).forEach(m=>{exact.set(matchPreserveKey(m),m);loose.set(matchLooseKey(m),m);});
    let kept=0;
    newMatches.forEach(m=>{
      const old=exact.get(matchPreserveKey(m))||loose.get(matchLooseKey(m));
      if(!old)return;
      m.referee=old.referee||m.referee||'';
      m.status=(old.status==='played'?'played':(old.status==='live'?'live':((old.goals&&old.goals.length)?'played':'scheduled')));
      m.goals=Array.isArray(old.goals)?old.goals.map(g=>({...g})):[];
      m.cards=Array.isArray(old.cards)?old.cards.map(c=>({...c})):[];
      const oldP=normalizePenalties(old.penalties);
      if(oldP)m.penalties=oldP;
      kept++;
    });
    return kept;
  }
  function isCalendarFresh(state){return Boolean(state.matches&&state.matches.length&&state.calendarSignature&&state.calendarSignature===scheduleSignature(state));}
  function generateCalendar(state,options={}){state.rules=normalizeRules(state.rules);const v=validateGeneration(state);if(!v.ok){state.calendarSignature='';return v;}const oldMatches=Array.isArray(state.matches)?state.matches:[];const matches=buildMatches(state);const s=scheduleMatches(matches,state.rules);if(!s.ok){state.calendarSignature='';return s;}const kept=options.preserveResults!==false?preserveMatchData(matches,oldMatches):0;state.matches=matches;autoResolveKnockout(state);state.calendarSignature=scheduleSignature(state);return {...s,preservedMatches:kept,message:s.message+(kept?` Risultati/referti preservati su ${kept} partite rimaste compatibili.`:'')};}
  function ensureFreshCalendar(state){if(isCalendarFresh(state))return {ok:true,message:'Calendario già aggiornato.',changed:false};const before=(state.matches||[]).length;const res=generateCalendar(state,{preserveResults:true});return {...res,changed:res.ok,previousMatches:before};}

  function playerBelongsToMatch(state,m,playerId){const tid=playerTeamId(state,playerId);return Boolean(tid&&(tid===m.homeTeamId||tid===m.awayTeamId));}
  function matchLabel(m){return `${m.round||'Partita'} · ${m.homeLabel||m.homeTeamId||'Casa'} vs ${m.awayLabel||m.awayTeamId||'Ospite'}`;}
  function normalizeEventIds(list,prefix){return (list||[]).map(e=>({...e,id:e.id||uid(prefix)}));}
  function fieldNoFromLabel(field){const m=String(field||'').match(/(\d+)/);return m?Number(m[1]):0;}
  function scheduleSlotKey(m,rules,withTeam=false){
    const date=m.date||'NO_DATE';
    const time=rules.oneDay?(m.time||'NO_TIME'):'ALL_DAY';
    const field=m.field||'NO_FIELD';
    return withTeam?`${date}|${time}`:`${date}|${time}|${field}`;
  }
  function derivedSnapshot(state){
    autoResolveKnockout(state);
    return {
      standings:calculateStandings(state).map(r=>({teamId:r.teamId,points:r.points,played:r.played,gf:r.goalsFor,ga:r.goalsAgainst,diff:r.diff})),
      groups:groupedStandings(state).map(g=>({name:g.name,completed:g.completed,rows:g.rows.map(r=>({teamId:r.teamId,points:r.points,played:r.played,gf:r.goalsFor,ga:r.goalsAgainst,diff:r.diff}))})),
      scorers:scorers(state).map(p=>({playerId:p.playerId,teamId:p.teamId,goals:p.goals,yellow:p.yellow,red:p.red,played:p.played})),
      presidentScorers:presidentScorers(state).map(p=>({presidentId:p.presidentId,teamId:p.teamId,goals:p.goals})),
      stats:stats(state),
      bracket:bracketData(state)
    };
  }
  function alignState(state,options={}){
    state=state||emptyState();
    state.rules=normalizeRules(state.rules);
    const teamIds=new Set((state.teams||[]).map(t=>t.id));
    const playerIds=new Set();
    const goalParticipantIds=new Set();
    const presidentIds=new Set();
    let removedEvents=0, fixedMatches=0, fixedAssignments=0, fixedStatuses=0, fixedEvents=0;
    (state.teams||[]).forEach(t=>{
      t.players=Array.isArray(t.players)?t.players:[];
      t.president=(t.president&&typeof t.president==='object')?t.president:{name:t.presidentName||''};
      t.president.id=t.president.id||uid('president');
      t.president.name=String(t.president.name||'').trim();
      t.coach=(t.coach&&typeof t.coach==='object')?t.coach:{name:t.coachName||''};
      t.coach.name=String(t.coach.name||'').trim();
      t.players.forEach(p=>{playerIds.add(p.id);goalParticipantIds.add(p.id);});
      if(t.president.name){presidentIds.add(t.president.id);if(state.rules.isKingsLeague)goalParticipantIds.add(t.president.id);}
    });
    const nextAssignments={};
    Object.entries(state.rules.groupAssignments||{}).forEach(([teamId,groupName])=>{
      const exists=teamIds.has(teamId);
      const groupExists=(state.rules.groupConfigs||[]).some(g=>g.name===groupName);
      if(exists&&groupExists)nextAssignments[teamId]=groupName; else fixedAssignments++;
    });
    state.rules.groupAssignments=nextAssignments;
    (state.matches||[]).forEach(m=>{
      m.goals=normalizeEventIds(m.goals,'goal');
      m.cards=normalizeEventIds(m.cards,'card');
      if(m.homeTeamId&&!teamIds.has(m.homeTeamId)){m.homeTeamId='';fixedMatches++;}
      if(m.awayTeamId&&!teamIds.has(m.awayTeamId)){m.awayTeamId='';fixedMatches++;}
      const beforeG=m.goals.length;
      const beforeC=m.cards.length;
      m.goals=m.goals.map(g=>normalizeGoalEvent(g)).filter(g=>{
        if(isOwnGoalEvent(g)){
          const tid=ownGoalTeamId(state,m,g);
          if(!tid)return false;
          g.teamId=tid;g.playerId=ownGoalValue(tid);g.weight=1;return true;
        }
        return g.playerId&&goalParticipantIds.has(g.playerId)&&playerBelongsToMatch(state,m,g.playerId);
      }).map(g=>(isOwnGoalEvent(g)||presidentIds.has(g.playerId)||!state.rules.isKingsLeague)?{...g,weight:1}:g);
      m.cards=m.cards.filter(c=>c.playerId&&playerIds.has(c.playerId)&&!presidentIds.has(c.playerId)&&playerBelongsToMatch(state,m,c.playerId)&&(c.type==='yellow'||c.type==='red'));
      removedEvents+=beforeG-m.goals.length+beforeC-m.cards.length;
      fixedEvents+=beforeG-m.goals.length+beforeC-m.cards.length;
      if((m.goals.length||m.cards.length)&&m.status!=='played'&&m.status!=='live'){m.status='played';fixedStatuses++;}
      if(!m.status)m.status='scheduled';
      // Rigori validi solo nelle KO con entrambe le squadre reali; altrimenti puliamo.
      if(m.penalties){
        if(!isKnockoutPhase(m)||!m.homeTeamId||!m.awayTeamId){
          m.penalties=null;
        } else {
          const np=normalizePenalties(m.penalties);
          m.penalties=np||null;
        }
      }
    });
    autoResolveKnockout(state);
    state._integrity={removedEvents,fixedMatches,fixedAssignments,fixedStatuses,fixedEvents,checkedAt:new Date().toISOString()};
    return state;
  }
  function auditSchedule(state,issues){
    const r=normalizeRules(state.rules);
    const fieldSlots=new Map();
    const teamSlots=new Map();
    const teamDays=new Map();
    const fixed=groupFieldMap(r);
    (state.matches||[]).forEach(m=>{
      if(!m.homeTeamId||!m.awayTeamId)return;
      if(fixed&&!groupField1GuaranteeActive(r)&&m.phase==='group'&&m.groupName){
        const expected=fixed[m.groupName];
        if(expected&&fieldNoFromLabel(m.field)!==expected)issues.push({severity:'error',area:'Calendario',message:`${m.round}: ${m.groupName} dovrebbe giocare su Campo ${expected}, ma è su ${m.field||'campo non assegnato'}.`});
      }
      const fKey=scheduleSlotKey(m,r,false);
      if(m.date&&m.field){
        if(fieldSlots.has(fKey))issues.push({severity:'error',area:'Calendario',message:`Sovrapposizione campo: ${m.field} occupato nello stesso slot da più partite.`});
        fieldSlots.set(fKey,m.id);
      }
      const slot=scheduleSlotKey(m,r,true);
      [m.homeTeamId,m.awayTeamId].forEach(tid=>{
        if(!tid)return;
        const key=`${tid}|${slot}`;
        if(teamSlots.has(key))issues.push({severity:'error',area:'Calendario',message:`${teamName(state,tid)} ha due partite nello stesso slot.`});
        teamSlots.set(key,m.id);
        if(!r.oneDay&&m.date){
          const dayKey=`${tid}|${m.date}`;
          if(teamDays.has(dayKey))issues.push({severity:'warn',area:'Calendario',message:`${teamName(state,tid)} ha più di una partita nello stesso giorno (${m.date}).`});
          teamDays.set(dayKey,m.id);
        }
      });
    });
  }
  function auditDataState(state){
    state=normalizeState(state);
    const issues=[];
    const teamIds=new Set((state.teams||[]).map(t=>t.id));
    const playerIds=new Set();
    const presidentIds=new Set();
    const participantIds=new Set();
    const playerTeam=new Map();
    const teamNames=new Map();
    (state.teams||[]).forEach(t=>{
      const nameKey=String(t.name||'').trim().toLowerCase();
      if(teamNames.has(nameKey))issues.push({severity:'warn',area:'Squadre',message:`Nome squadra duplicato: ${t.name}.`});
      teamNames.set(nameKey,t.id);
      if(t.president?.id&&t.president?.name){presidentIds.add(t.president.id);if(state.rules.isKingsLeague)participantIds.add(t.president.id);}
      (t.players||[]).forEach(p=>{
        if(playerIds.has(p.id))issues.push({severity:'error',area:'Giocatori',message:`ID calciatore duplicato: ${p.name}.`});
        playerIds.add(p.id); participantIds.add(p.id); playerTeam.set(p.id,t.id);
      });
    });
    const generation=validateGeneration(state);
    if(!generation.ok)issues.push({severity:'error',area:'Regole',message:generation.message});
    const fx=state._integrity||{};
    const fixedTotal=(fx.removedEvents||0)+(fx.fixedMatches||0)+(fx.fixedAssignments||0)+(fx.fixedStatuses||0);
    if(fixedTotal>0){
      issues.push({severity:'warn',area:'Auto-riparazione',message:`Ho corretto automaticamente ${fixedTotal} elemento/i non allineati in fase di lettura: eventi rimossi ${fx.removedEvents||0}, partite ${fx.fixedMatches||0}, assegnazioni gironi ${fx.fixedAssignments||0}, stati referto ${fx.fixedStatuses||0}.`});
    }
    if((state.matches||[]).length&& !isCalendarFresh(state))issues.push({severity:'warn',area:'Calendario',message:'Calendario non allineato alle regole/squadre/gironi attuali: rigenera o apri un PDF per riallinearlo.'});
    (state.matches||[]).forEach(m=>{
      if(m.homeTeamId&&!teamIds.has(m.homeTeamId))issues.push({severity:'error',area:'Partite',message:`${matchLabel(m)}: squadra casa non esistente.`});
      if(m.awayTeamId&&!teamIds.has(m.awayTeamId))issues.push({severity:'error',area:'Partite',message:`${matchLabel(m)}: squadra ospite non esistente.`});
      if(m.homeTeamId&&m.awayTeamId&&m.homeTeamId===m.awayTeamId)issues.push({severity:'error',area:'Partite',message:`${m.round}: una squadra risulta contro sé stessa.`});
      if((m.status==='played'||m.status==='live'||m.goals.length||m.cards.length)&&(!m.homeTeamId||!m.awayTeamId))issues.push({severity:'error',area:'Referti',message:`${matchLabel(m)}: referto presente ma mancano una o entrambe le squadre reali.`});
      if((m.goals.length||m.cards.length)&&m.status!=='played'&&m.status!=='live')issues.push({severity:'warn',area:'Referti',message:`${m.round}: eventi presenti ma partita non marcata come giocata.`});
      (m.goals||[]).forEach(g=>{
        if(isOwnGoalEvent(g)){
          if(!ownGoalTeamId(state,m,g))issues.push({severity:'error',area:'Marcatori',message:`${m.round}: autogol non collegato a una squadra in campo.`});
          return;
        }
        if(!participantIds.has(g.playerId))issues.push({severity:'error',area:'Marcatori',message:`${m.round}: gol assegnato a una persona inesistente.`});
        else if(!playerBelongsToMatch(state,m,g.playerId))issues.push({severity:'error',area:'Marcatori',message:`${m.round}: ${playerName(state,g.playerId)} non appartiene alle squadre in campo.`});
      });
      (m.cards||[]).forEach(c=>{
        if(!playerIds.has(c.playerId))issues.push({severity:'error',area:'Cartellini',message:`${m.round}: cartellino assegnato a un calciatore inesistente o a un presidente.`});
        else if(presidentIds.has(c.playerId))issues.push({severity:'error',area:'Cartellini',message:`${m.round}: ${playerName(state,c.playerId)} è presidente e non può ricevere gialli o rossi.`});
        else if(!playerBelongsToMatch(state,m,c.playerId))issues.push({severity:'error',area:'Cartellini',message:`${m.round}: ${playerName(state,c.playerId)} non appartiene alle squadre in campo.`});
      });
      ['Home','Away'].forEach(side=>{
        const source=m[`source${side}`];
        if(source){
          const resolved=resolveSource(state,source,'');
          const current=m[side==='Home'?'homeTeamId':'awayTeamId'];
          if(resolved&&current&&current!==resolved.id)issues.push({severity:'warn',area:'Tabellone',message:`${m.round}: placeholder ${sourceLabel(source)} risolto con una squadra diversa da quella mostrata.`});
        }
      });
    });
    if(state.rules.format==='groups_knockout'){
      const assignments=state.rules.groupAssignments||{};
      const names=(state.rules.groupConfigs||[]).map(g=>g.name);
      const counts=Object.fromEntries(names.map(n=>[n,0]));
      (state.teams||[]).forEach(t=>{if(assignments[t.id]&&counts[assignments[t.id]]!==undefined)counts[assignments[t.id]]++;});
      (state.rules.groupConfigs||[]).forEach(g=>{if(counts[g.name]&&counts[g.name]!==g.size)issues.push({severity:'warn',area:'Gironi',message:`${g.name}: assegnazioni manuali ${counts[g.name]}/${g.size}.`});});
    }

    if(state.rules.isKingsLeague){
      const playerGoalIds=new Set(); state.teams.forEach(t=>(t.players||[]).forEach(p=>playerGoalIds.add(p.id)));
      const realPlayerGoals=(state.matches||[]).reduce((sum,m)=>sum+(m.goals||[]).filter(g=>playerGoalIds.has(g.playerId)).length,0);
      const scorerGoals=scorers(state).reduce((sum,p)=>sum+p.goals,0);
      const realPresidentGoals=(state.matches||[]).reduce((sum,m)=>sum+(m.goals||[]).filter(g=>isPresidentId(state,g.playerId)).length,0);
      const presidentGoals=presidentScorers(state).reduce((sum,p)=>sum+p.goals,0);
      if(realPlayerGoals!==scorerGoals)issues.push({severity:'error',area:'Kings League',message:'La classifica marcatori calciatori non coincide con i gol reali dei calciatori: i gol doppi valgono 1 per i marcatori.'});
      if(realPresidentGoals!==presidentGoals)issues.push({severity:'error',area:'Kings League',message:'La classifica marcatori presidenti non coincide con i gol reali dei presidenti.'});
    }else{
      const nonKingsPresidentGoals=(state.matches||[]).reduce((sum,m)=>sum+(m.goals||[]).filter(g=>isPresidentId(state,g.playerId)).length,0);
      const doubleGoalsOutsideKings=(state.matches||[]).reduce((sum,m)=>sum+(m.goals||[]).filter(g=>Number(g.weight)===2).length,0);
      if(nonKingsPresidentGoals)issues.push({severity:'error',area:'Formato torneo',message:'I gol dei presidenti sono consentiti solo con Kings League attiva.'});
      if(doubleGoalsOutsideKings)issues.push({severity:'warn',area:'Formato torneo',message:'Gol doppi rilevati fuori dalla Kings League: verranno conteggiati come gol normali.'});
    }
    auditSchedule(state,issues);
    const snapshot=derivedSnapshot(state);
    return {ok:issues.filter(i=>i.severity==='error').length===0,issues,checkedAt:new Date().toISOString(),snapshot,message:issues.length?`${issues.length} controllo/i da verificare: ${issues.filter(i=>i.severity==='error').length} errori, ${issues.filter(i=>i.severity!=='error').length} avvisi.`:'Dati coerenti: tutte le viste derivano da regole, squadre, giocatori e referti aggiornati.'};
  }
  function repairState(state){
    const before=JSON.stringify(state||{});
    alignState(state);
    if((state.matches||[]).length&&!isCalendarFresh(state)){
      const res=ensureFreshCalendar(state);
      if(!res.ok)state._repairMessage=res.message;
    }
    alignState(state);
    const changed=before!==JSON.stringify(state||{});
    return {ok:true,changed,message:state._repairMessage|| (changed?'Dati riallineati e proiezioni ricalcolate.':'Nessuna correzione necessaria.')};
  }
  function integrityReport(state){const report=auditDataState(state);return {ok:report.ok&&report.issues.length===0,issues:report.issues.map(i=>`${i.area}: ${i.message}`),details:report.issues,checkedAt:report.checkedAt,message:report.message,snapshot:report.snapshot};}

  function buildStandingsRows(state,matches,teamsSubset,opts){
    const includeLive = Boolean(opts && opts.includeLive);
    const teams=(teamsSubset||state.teams);
    const rows=teams.map(t=>({teamId:t.id,name:t.name,played:0,wins:0,draws:0,losses:0,points:0,goalsFor:0,goalsAgainst:0,diff:0,headToHeadPoints:0,cards:0,yellow:0,red:0,hasLive:false}));
    const map=Object.fromEntries(rows.map(r=>[r.teamId,r]));
    const participantTeam={};
    (state.teams||[]).forEach(t=>{(t.players||[]).forEach(p=>{participantTeam[p.id]=t.id;});if(t.president?.id)participantTeam[t.president.id]=t.id;});
    (matches||[]).forEach(m=>{
      if(!m.homeTeamId||!m.awayTeamId)return;
      const h=map[m.homeTeamId],a=map[m.awayTeamId];
      if(!h||!a)return;
      (m.cards||[]).forEach(c=>{
        const tid=participantTeam[c.playerId];
        const row=map[tid];
        if(!row)return;
        if(c.type==='red')row.red++; else row.yellow++;
        row.cards++;
      });
      const isLiveM = m.status==='live';
      // Marca le squadre coinvolte in una live se richiesto (per evidenziazione UI)
      if(isLiveM && includeLive){ h.hasLive=true; a.hasLive=true; }
      // Le partite "Giocate" entrano sempre; le "Live" entrano SOLO se includeLive
      const counts = hasScore(state,m) || (includeLive && isLiveM);
      if(!counts) return;
      const sc=matchGoals(state,m);
      h.played++;a.played++;
      h.goalsFor+=sc.home;h.goalsAgainst+=sc.away;
      a.goalsFor+=sc.away;a.goalsAgainst+=sc.home;
      if(sc.home>sc.away){h.points+=3;h.wins++;a.losses++;}
      else if(sc.away>sc.home){a.points+=3;a.wins++;h.losses++;}
      else{h.points++;a.points++;h.draws++;a.draws++;}
    });
    rows.forEach(r=>r.diff=r.goalsFor-r.goalsAgainst);
    return rows;
  }
  function headToHeadPointsForTeam(state,matches,teamId,tiedIds,opts){
    const includeLive = Boolean(opts && opts.includeLive);
    let pts=0;
    (matches||[]).forEach(m=>{
      const counts = hasScore(state,m) || (includeLive && m.status==='live');
      if(!counts||!m.homeTeamId||!m.awayTeamId)return;
      if(!tiedIds.has(m.homeTeamId)||!tiedIds.has(m.awayTeamId))return;
      if(m.homeTeamId!==teamId&&m.awayTeamId!==teamId)return;
      const sc=matchGoals(state,m);
      const isHome=m.homeTeamId===teamId;
      const gf=isHome?sc.home:sc.away, ga=isHome?sc.away:sc.home;
      if(gf>ga)pts+=3; else if(gf===ga)pts+=1;
    });
    return pts;
  }
  function headToHeadPointsBetween(state,matches,teamId,otherId,opts){
    return headToHeadPointsForTeam(state,matches,teamId,new Set([teamId,otherId]),opts);
  }
  function compareStandingsRows(state,matches,a,b,opts){
    const order=normalizeStandingsCriteriaOrder(state.rules?.standingsCriteriaOrder);
    for(const id of order){
      let delta=0;
      if(id==='points')delta=b.points-a.points;
      else if(id==='headToHead')delta=headToHeadPointsBetween(state,matches,b.teamId,a.teamId,opts)-headToHeadPointsBetween(state,matches,a.teamId,b.teamId,opts);
      else if(id==='diff')delta=b.diff-a.diff;
      else if(id==='goalsFor')delta=b.goalsFor-a.goalsFor;
      else if(id==='goalsAgainst')delta=a.goalsAgainst-b.goalsAgainst;
      else if(id==='cards')delta=a.cards-b.cards;
      if(delta)return delta;
    }
    return a.name.localeCompare(b.name);
  }
  function calculateStandingsForMatches(state,matches,teamsSubset,opts){
    const rows=buildStandingsRows(state,matches,teamsSubset,opts);
    const byPoints=new Map();
    rows.forEach(r=>{if(!byPoints.has(r.points))byPoints.set(r.points,[]);byPoints.get(r.points).push(r);});
    byPoints.forEach(group=>{
      if(group.length>1){
        const tiedIds=new Set(group.map(r=>r.teamId));
        group.forEach(r=>r.headToHeadPoints=headToHeadPointsForTeam(state,matches,r.teamId,tiedIds,opts));
      }
    });
    return rows.sort((a,b)=>compareStandingsRows(state,matches,a,b,opts));
  }
  function mainStandingsPhase(state){
    const format=state?.rules?.format||'';
    if(format==='league'||format==='league_knockout')return 'league';
    if(format==='groups_knockout')return 'group';
    if(format==='knockout')return 'knockout';
    return '';
  }
  function standingsMatchesForPhase(state,phaseFilter){
    // Pattern anti-regressione: ogni classifica pubblica/admin senza filtro
    // usa SOLO la fase qualificante del format. Le partite di playoff/KO
    // restano in referti, schede e tabelloni, ma non alterano mai la
    // classifica di campionato/gironi.
    let phase=phaseFilter;
    if(phase===undefined||phase===null||phase==='')phase=mainStandingsPhase(state);
    if(phase==='all')return state.matches||[];
    return (state.matches||[]).filter(m=>!phase||m.phase===phase);
  }
  function calculateStandings(state,phaseFilter,opts){return calculateStandingsForMatches(state,standingsMatchesForPhase(state,phaseFilter),undefined,opts);}
  function allPhaseMatchesCompleted(state,phase){const ms=state.matches.filter(m=>m.phase===phase);return ms.length>0&&ms.every(m=>hasScore(state,m));}
  function groupNames(state){const fromMatches=state.matches.filter(m=>m.phase==='group'&&m.groupName).map(m=>m.groupName);const fromRules=(state.rules?.groupConfigs||[]).map(g=>g.name).filter(Boolean);return [...new Set([...fromRules,...fromMatches])];}
  function hasGroupStage(state){return state.rules?.format==='groups_knockout'||state.matches.some(m=>m.phase==='group');}
  function groupMatchesCompleted(state,groupName){const ms=state.matches.filter(m=>m.phase==='group'&&m.groupName===groupName);return ms.length>0&&ms.every(m=>hasScore(state,m));}
  function groupStandings(state,groupName,opts){const groupMatches=state.matches.filter(m=>m.phase==='group'&&m.groupName===groupName);const ids=[...new Set(groupMatches.flatMap(m=>[m.homeTeamId,m.awayTeamId]).filter(Boolean))];const teams=ids.map(id=>getTeam(state,id)).filter(Boolean);return calculateStandingsForMatches(state,groupMatches,teams,opts);}
  function groupedStandings(state,opts){return groupNames(state).map(name=>({name,rows:groupStandings(state,name,opts),completed:groupMatchesCompleted(state,name)}));}
  function resolveSource(state,source,fallback){if(!source)return null;if(source.startsWith('group:')){const parts=source.split(':');const posRaw=parts.pop();const group=parts.slice(1).join(':');if(!groupMatchesCompleted(state,group))return null;const row=groupStandings(state,group)[Number(posRaw)-1];return row?getTeam(state,row.teamId):null;}if(source.startsWith('league:')){if(!allPhaseMatchesCompleted(state,'league'))return null;const row=calculateStandings(state,'league')[Number(source.split(':')[1])-1];return row?getTeam(state,row.teamId):null;}if(source.startsWith('winner:')){const [,bracketName,rRaw,mRaw]=source.split(':');const match=state.matches.find(m=>m.bracketName===bracketName&&m.bracketRoundIndex===Number(rRaw)&&m.bracketMatchIndex===Number(mRaw));const wid=winnerId(state,match);return wid?getTeam(state,wid):null;}if(source.startsWith('bracketwinner:')){const bracketName=source.split(':')[1];const ms=state.matches.filter(m=>m.bracketName===bracketName);const max=Math.max(0,...ms.map(m=>m.bracketRoundIndex));const final=ms.find(m=>m.bracketRoundIndex===max);const wid=winnerId(state,final);return wid?getTeam(state,wid):null;}return null;}
  function sourceLabel(source,previous='Da definire'){if(!source)return previous||'Da definire';if(source.startsWith('group:')){const parts=source.split(':');const pos=parts.pop();const group=parts.slice(1).join(':');return `${pos}ª ${group}`;}if(source.startsWith('league:'))return `${source.split(':')[1]}ª classificata`;if(source.startsWith('winner:')){const [,bracketName,r,m]=source.split(':');return `Vincente ${bracketName} ${r}.${m}`;}if(source.startsWith('bracketwinner:'))return `Vincente ${source.split(':').slice(1).join(':')}`;return previous||'Da definire';}
  function autoResolveKnockout(state){(state.matches||[]).forEach(m=>{if(m.sourceHome){const t=resolveSource(state,m.sourceHome,m.homeLabel);if(t){m.homeTeamId=t.id;m.homeLabel=t.name;}else{m.homeTeamId='';m.homeLabel=sourceLabel(m.sourceHome,m.homeLabel);}}if(m.sourceAway){const t=resolveSource(state,m.sourceAway,m.awayLabel);if(t){m.awayTeamId=t.id;m.awayLabel=t.name;}else{m.awayTeamId='';m.awayLabel=sourceLabel(m.sourceAway,m.awayLabel);}}});}
  function bracketData(state){autoResolveKnockout(state);const ko=state.matches.filter(m=>['knockout','playoff','secondary_playoff','supercup'].includes(m.phase)||m.bracketName);if(!ko.length)return {available:false,message:'Questo formato non prevede una fase a eliminazione diretta.',brackets:[]};const byName=new Map();ko.forEach(m=>{const name=m.bracketName||'Tabellone';if(!byName.has(name))byName.set(name,[]);byName.get(name).push(m);});const brackets=[...byName.entries()].map(([name,matches])=>{const rounds=new Map();matches.sort((a,b)=>a.bracketRoundIndex-b.bracketRoundIndex||a.bracketMatchIndex-b.bracketMatchIndex).forEach(m=>{const key=m.bracketRound||m.round;if(!rounds.has(key))rounds.set(key,[]);rounds.get(key).push(m);});return {name,rounds:[...rounds.entries()].map(([name,matches])=>({name,matches}))};});return {available:true,message:'Tabellone calcolato automaticamente. I placeholder diventano squadre reali appena la fase precedente è completata.',brackets};}
  function playerStats(state){
    const rows=[];
    state.teams.forEach(t=>t.players.forEach(p=>rows.push({playerId:p.id,name:p.name,birthYear:p.birthYear||'',teamId:t.id,teamName:t.name,played:0,goals:0,scoreGoals:0,yellow:0,red:0,type:'player'})));
    const map=Object.fromEntries(rows.map(r=>[r.playerId,r]));
    state.matches.forEach(m=>{
      // Le partite LIVE non contribuiscono alle statistiche giocatori: gol, cartellini e PG
      // entrano nelle stats solo quando la partita è chiusa (status==='played' o equivalente
      // tramite hasScore, che per design esclude 'live').
      if(m.status==='live')return;
      if(hasScore(state,m)){[m.homeTeamId,m.awayTeamId].forEach(tid=>{const team=getTeam(state,tid);team?.players.forEach(p=>{if(map[p.id])map[p.id].played++;});});}
      (m.goals||[]).forEach(g=>{
        if(map[g.playerId]){
          map[g.playerId].goals+=1; // classifica marcatori calciatori: un gol reale vale sempre 1, anche se nel punteggio Kings League vale doppio
          map[g.playerId].scoreGoals+=eventScoreWeight(state,g);
        }
      });
      (m.cards||[]).forEach(c=>{if(map[c.playerId])map[c.playerId][c.type==='red'?'red':'yellow']++;});
    });
    return rows.sort((a,b)=>b.goals-a.goals||a.teamName.localeCompare(b.teamName)||a.name.localeCompare(b.name));
  }
  function presidentStats(state){
    const rows=[];
    state.teams.forEach(t=>{if(t.president?.name)rows.push({presidentId:t.president.id,name:t.president.name,teamId:t.id,teamName:t.name,goals:0,scoreGoals:0,played:0,type:'president'});});
    const map=Object.fromEntries(rows.map(r=>[r.presidentId,r]));
    state.matches.forEach(m=>{
      if(m.status==='live')return;
      if(hasScore(state,m)){[m.homeTeamId,m.awayTeamId].forEach(tid=>{const team=getTeam(state,tid);if(team?.president?.id&&map[team.president.id])map[team.president.id].played++;});}
      (m.goals||[]).forEach(g=>{if(map[g.playerId]){map[g.playerId].goals+=1;map[g.playerId].scoreGoals+=eventScoreWeight(state,g);}});
    });
    return rows.sort((a,b)=>b.goals-a.goals||a.teamName.localeCompare(b.teamName)||a.name.localeCompare(b.name));
  }
  function scorers(state){return playerStats(state).filter(p=>p.goals>0).sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name));}
  function presidentScorers(state){return presidentStats(state).filter(p=>p.goals>0).sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name));}
  function stats(state){
    // Le partite LIVE non vengono ancora contate nei totali globali (gol, cartellini):
    // sono pre-classifica. Solo quando passano a 'played' diventano definitive.
    const consolidated = state.matches.filter(m=>m.status!=='live');
    const actualGoals=consolidated.reduce((s,m)=>s+(m.goals||[]).length,0);
    const scoreGoals=consolidated.reduce((s,m)=>s+(m.goals||[]).reduce((a,g)=>a+eventScoreWeight(state,g),0),0);
    return {
      teams:state.teams.length,
      players:state.teams.reduce((s,t)=>s+t.players.length,0),
      presidents:state.teams.filter(t=>t.president?.name).length,
      matches:state.matches.length,
      goals:actualGoals,
      scoreGoals,
      yellow:consolidated.reduce((s,m)=>s+(m.cards||[]).filter(c=>c.type==='yellow').length,0),
      red:consolidated.reduce((s,m)=>s+(m.cards||[]).filter(c=>c.type==='red').length,0),
      articles:(state.articles||[]).length
    };
  }
  function phases(state){return [...new Set(state.matches.map(m=>m.phase))];}
  function rounds(state){return [...new Set(state.matches.map(m=>m.round).filter(Boolean))];}
  function articles(state){return [...(state.articles||[])].sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));}
  function generationPlan(state){const v=validateGeneration(state);if(!v.ok)return v;const r=normalizeRules(state.rules);const matches=buildMatches(state);const grouped=matchesByRoundIndex(matches);const b=matches.some(m=>m.bracketName);const estimate=suggestEndDateForMatches(matches,r);const estimateText=estimate.ok?` ${estimate.message}`:` ${estimate.message}`;return {ok:estimate.ok,message:`${FORMAT_HELP[r.format]} Partite previste: ${matches.length}. Giornate/fasi calendario: ${grouped.length}.${b?' Tabellone previsto e visualizzabile nei report.':''}${estimateText}`,matches,rounds:grouped.length,estimate};}

  // ---------------------------------------------------------------
  // Memoization layer: cache i selettori derivati finché lo state rilevante non cambia.
  // Una "fingerprint" leggera (numero match, somma goals/cards, status, regole serializzate)
  // identifica se serve davvero ricomputare. Su tornei grandi ~10-50x più veloce.
  // ---------------------------------------------------------------
  const _derivedCache = new WeakMap();
  function deriveFingerprint(state){
    const r=state.rules||{};
    let ng=0, nc=0, st='';
    (state.matches||[]).forEach(m=>{
      ng += (m.goals||[]).length;
      nc += (m.cards||[]).length;
      const gSig=(m.goals||[]).map(g=>`${g.playerId||''}:${g.teamId||''}:${g.type||''}:${g.weight||1}`).join(';');
      st += (m.status||'')+(m.homeTeamId||'')+(m.awayTeamId||'')+gSig+(m.penalties?`${m.penalties.home}-${m.penalties.away}`:'');
    });
    // Solo i campi delle regole che influenzano standings/bracket
    const rf=`${r.format}|${r.isKingsLeague}|${r.playoffTeams}|${(r.standingsCriteriaOrder||[]).join(',')}|${(r.groupConfigs||[]).map(g=>`${g.name}:${g.size}:${g.qualifiers}`).join('|')}`;
    return `${(state.teams||[]).length}|${(state.matches||[]).length}|${ng}|${nc}|${st}|${rf}`;
  }
  function memo(fn,key){
    return function(state, ...args){
      const argsKey = key + (args.length ? '|' + JSON.stringify(args) : '');
      let bucket = _derivedCache.get(state);
      if(!bucket){
        bucket = {fp: deriveFingerprint(state), data: new Map()};
        _derivedCache.set(state, bucket);
      } else {
        // Verifica se la fingerprint è ancora valida (state mutato in-place)
        const fp = deriveFingerprint(state);
        if(fp !== bucket.fp){
          bucket.fp = fp;
          bucket.data.clear();
        }
      }
      if(bucket.data.has(argsKey)) return bucket.data.get(argsKey);
      const result = fn(state, ...args);
      bucket.data.set(argsKey, result);
      return result;
    };
  }
  // Wrapper memoizzati: il payload di calculateStandings/playerStats/bracketData è pesante,
  // quindi memoizzare anche solo per la stessa render-pass è già un gain enorme.
  const memoCalculateStandings = memo(calculateStandings,'standings');
  const memoPlayerStats = memo(playerStats,'playerStats');
  const memoPresidentStats = memo(presidentStats,'presidentStats');
  const memoScorers = memo(scorers,'scorers');
  const memoPresidentScorers = memo(presidentScorers,'presidentScorers');
  const memoBracketData = memo(bracketData,'bracketData');
  const memoGroupStandings = memo(groupStandings,'groupStandings');
  const memoGroupedStandings = memo(groupedStandings,'groupedStandings');
  const memoStats = memo(stats,'stats');

  function nextCalendarVariantSeed(){return uid('calendar_variant');}
  window.NexoraStore={ADMIN_KEY,PUBLIC_KEY,FORMAT_LABELS,PHASE_LABELS,FORMAT_HELP,STANDINGS_CRITERIA,nextCalendarVariantSeed,defaultStandingsCriteriaOrder,normalizeStandingsCriteriaOrder,standingsCriterionMeta,uid,blankRules,defaultGroupConfigs,defaultSite,normalizeSite,emptyState,normalizeState,readPendingRemoteState,newestAdminLocalState,publicCacheState,withoutHeavyMedia,mergeMissingMedia,eventScoreWeight,load,save,alignState,repairState,auditDataState,derivedSnapshot,integrityReport,getTeam,getPlayer,getPresident,getParticipant,isPresidentId,ownGoalValue,isOwnGoalValue,isOwnGoalEvent,ownGoalTeamId,goalScoringTeamId,goalEventTeamId,goalLabel,teamName,playerName,scoreText,matchGoals,actualGoalCount,hasScore,hasGoals,isPlayed,isLive,matchStatusInfo,normalizeJerseyNumber,normalizePenalties,isKnockoutPhase,penaltyWinnerId,winnerId,minimumTeams,plannedGroups,groupAssignmentsFromMatches,validateGroupAssignments,serpentineAssignments,randomAssignments,generateCalendar,ensureFreshCalendar,isCalendarFresh,scheduleSignature,validateGeneration,validateCompetitionConfig,generationPlan,mainStandingsPhase,autoResolveKnockout,bracketData:memoBracketData,sortedCompetitions,seedEntrantsHighLow,allowedDateList,weekdayLabels,suggestEndDateForMatches,oneDayCalendarPauseEvent,groupFieldMap,allowedFieldsForMatch,groupFieldPolicyMessage,deriveFingerprint,selectors:{calculateStandings:memoCalculateStandings,groupStandings:memoGroupStandings,groupNames,groupedStandings:memoGroupedStandings,hasGroupStage,playerStats:memoPlayerStats,presidentStats:memoPresidentStats,scorers:memoScorers,presidentScorers:memoPresidentScorers,stats:memoStats,phases,rounds,bracketData:memoBracketData,articles}};
})();
