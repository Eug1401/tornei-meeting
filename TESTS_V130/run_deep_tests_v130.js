const fs = require('fs');
const vm = require('vm');
const nodePath = require('path');
const projectRoot = nodePath.resolve(__dirname, '..');
const storePath = nodePath.join(projectRoot, 'assets/js/store.js');
const code = fs.readFileSync(storePath,'utf8');
function loadStore(){
  const storage = new Map();
  const localStorage = {getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),key:i=>Array.from(storage.keys())[i]||null,get length(){return storage.size;}};
  const context={console,setTimeout,clearTimeout,structuredClone:global.structuredClone,localStorage,CustomEvent:function(type,init){this.type=type;this.detail=init&&init.detail;},window:{dispatchEvent(){},addEventListener(){}}};
  context.window.console=console; context.window.localStorage=localStorage; context.window.setTimeout=setTimeout; context.window.clearTimeout=clearTimeout; context.window.structuredClone=global.structuredClone; context.window.CustomEvent=context.CustomEvent;
  vm.createContext(context); vm.runInContext(code, context, {filename:'store.js'}); return context.window.NexoraStore;
}
const store=loadStore();
let pass=0, fail=0; const failures=[], results=[];
function assert(cond,msg,detail){ if(!cond){fail++; failures.push({msg,detail});} else pass++; }
function test(name,fn){ const pf={pass,fail}; try{fn();}catch(e){fail++; failures.push({msg:`${name}: exception`,detail:e.stack||String(e)});} results.push({name,pass:pass-pf.pass,fail:fail-pf.fail}); }
function teams(n,prefix='T'){return Array.from({length:n},(_,i)=>({id:`${prefix}${i+1}`,name:`${prefix}${i+1}`,players:[{id:`${prefix}${i+1}P1`,name:`${prefix}${i+1} Player 1`},{id:`${prefix}${i+1}P2`,name:`${prefix}${i+1} Player 2`}],president:{id:`${prefix}${i+1}PR`,name:`${prefix}${i+1} Pres`},coach:{name:`${prefix}${i+1} Coach`}}));}
function baseState(n,rules){return store.normalizeState({teams:teams(n),rules:{...store.blankRules(),...rules},matches:[]});}
function scoreMatch(state,m,home,away){m.goals=[]; const ht=store.getTeam(state,m.homeTeamId), at=store.getTeam(state,m.awayTeamId); if(!ht||!at)return; for(let i=0;i<home;i++)m.goals.push({id:`g_${m.id}_h_${i}`,playerId:ht.players[0].id,weight:1}); for(let i=0;i<away;i++)m.goals.push({id:`g_${m.id}_a_${i}`,playerId:at.players[0].id,weight:1}); m.status='played';}
function scoreAllResolved(state,picker){for(const m of state.matches){store.autoResolveKnockout(state); if(m.homeTeamId&&m.awayTeamId){const sc=picker?picker(m,state):{home:1,away:0}; scoreMatch(state,m,sc.home,sc.away);}} store.autoResolveKnockout(state);}
function scorePhase(state,phase,picker){for(const m of state.matches.filter(x=>x.phase===phase)){if(m.homeTeamId&&m.awayTeamId){const sc=picker?picker(m,state):{home:1,away:0}; scoreMatch(state,m,sc.home,sc.away);}} store.autoResolveKnockout(state);}
function playAllKnockouts(state){const rounds=[...new Set(state.matches.filter(m=>store.isKnockoutPhase(m)).map(m=>m.bracketRoundIndex))].sort((a,b)=>a-b); for(const r of rounds){store.autoResolveKnockout(state); for(const m of state.matches.filter(m=>store.isKnockoutPhase(m)&&m.bracketRoundIndex===r).sort((a,b)=>a.bracketMatchIndex-b.bracketMatchIndex)){store.autoResolveKnockout(state); if(m.homeTeamId&&m.awayTeamId){ // vary scores to ensure KO would change all-phase standings if counted
        const invert = (m.bracketMatchIndex + r) % 2 === 0; scoreMatch(state,m,invert?0:3,invert?2:1);
      }} }
  store.autoResolveKnockout(state);
}
function standingSignature(rows){return rows.map(r=>`${r.teamId}:${r.points}:${r.played}:${r.goalsFor}:${r.goalsAgainst}:${r.diff}:${r.wins||0}:${r.draws||0}:${r.losses||0}`).join('|');}
function pairKey(a,b){return [a,b].sort().join('~');}
function fieldNo(m){const x=String(m.field||'').match(/(\d+)/); return x?Number(x[1]):0;}
function noOverlapChecks(state){const fieldSlots=new Set(), teamSlots=new Set(); for(const m of state.matches){assert(!!m.field,`field exists ${m.round}`,m); assert(!!m.date,`date exists ${m.round}`,m); const slot=`${m.date}|${state.rules.oneDay?m.time:'ALL_DAY'}`; const fk=`${slot}|${m.field}`; assert(!fieldSlots.has(fk),`no same field same slot ${fk}`,m); fieldSlots.add(fk); for(const tid of [m.homeTeamId,m.awayTeamId].filter(Boolean)){const tk=state.rules.oneDay?`${slot}|${tid}`:`${m.date}|${tid}`; assert(!teamSlots.has(tk),`team not duplicated slot/day ${tk}`,m); teamSlots.add(tk);}}}
function rrPairsOK(state,ids,phase,group=''){const ms=state.matches.filter(m=>m.phase===phase&&(!group||m.groupName===group)); const expected=new Set(); for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)expected.add(pairKey(ids[i],ids[j])); const actual=new Set(ms.map(m=>pairKey(m.homeTeamId,m.awayTeamId))); assert(actual.size===expected.size,`RR count ${phase} ${group}`,{expected:[...expected],actual:[...actual]}); for(const k of expected)assert(actual.has(k),`RR has pair ${k} ${group}`);}
function campo1Guarantee(state){if(state.rules.format!=='groups_knockout'||Number(state.rules.fieldCount)<=1)return; const all=new Set(), covered=new Set(); for(const m of state.matches.filter(m=>m.phase==='group')){[m.homeTeamId,m.awayTeamId].filter(Boolean).forEach(t=>all.add(t)); if(fieldNo(m)===1)[m.homeTeamId,m.awayTeamId].filter(Boolean).forEach(t=>covered.add(t));} const missing=[...all].filter(t=>!covered.has(t)); assert(missing.length===0,'every group team plays at least one match on Campo 1',{missing,fields:state.matches.filter(m=>m.phase==='group').map(m=>({r:m.round,f:m.field,h:m.homeTeamId,a:m.awayTeamId}))});}
function halfOfSource(state,source){const ms=state.matches.filter(m=>m.phase==='knockout'&&m.bracketRoundIndex===1).sort((a,b)=>a.bracketMatchIndex-b.bracketMatchIndex); const idx=ms.findIndex(m=>m.sourceHome===source||m.sourceAway===source); if(idx<0)return -1; return idx<ms.length/2?1:2;}
function firstRoundSourcePairs(state){return state.matches.filter(m=>m.phase==='knockout'&&m.bracketRoundIndex===1).map(m=>[m.sourceHome||m.homeLabel,m.sourceAway||m.awayLabel]);}
function hasSourcePair(state,a,b){return firstRoundSourcePairs(state).some(p=>p.includes(a)&&p.includes(b));}
function calendarSignatureLite(state){return state.matches.map(m=>[m.phase,m.groupName,m.round,m.bracketRoundIndex,m.bracketMatchIndex,m.homeTeamId||m.sourceHome||m.homeLabel,m.awayTeamId||m.sourceAway||m.awayLabel,m.date,m.time,m.field].join('/')).join('|');}

// Public API and syntax smoke
test('store API smoke + main standings phase helper',()=>{assert(!!store.generateCalendar,'generateCalendar');assert(!!store.mainStandingsPhase,'mainStandingsPhase exported');assert(store.mainStandingsPhase({rules:{format:'league_knockout'}})==='league','league+KO main phase is league');assert(store.mainStandingsPhase({rules:{format:'groups_knockout'}})==='group','groups+KO main phase is group');});

// League counts 2/4/8/16 and edge odd sizes
test('league calendars and standings for 2/4/8/16 + odd edge cases',()=>{for(const n of [2,3,4,5,8,16]){for(const fieldCount of [1,2,3]){const s=baseState(n,{format:'league',fieldCount,oneDay:true,startDate:'2026-06-06',startTime:'08:00',matchDuration:12,breakMinutes:0}); const res=store.generateCalendar(s,{preserveResults:false}); assert(res.ok,`league generate ${n}/${fieldCount}`,res); assert(s.matches.length===n*(n-1)/2,`league match count ${n}`,s.matches.length); noOverlapChecks(s); rrPairsOK(s,s.teams.map(t=>t.id),'league'); scorePhase(s,'league',(m)=>({home:m.homeTeamId.endsWith('1')?3:1,away:m.awayTeamId.endsWith('1')?3:0})); const rows=store.selectors.calculateStandings(s); assert(standingSignature(rows)===standingSignature(store.selectors.calculateStandings(s,'league')),'default league standings are league phase'); assert(rows.every(r=>r.played===n-1),'all league teams played n-1'); assert(rows.every(r=>r.played===r.wins+r.draws+r.losses),'V/N/P sum equals PG');}}});

// Knockout-only
test('knockout calendars and winner flow for 2/4/8/16 + BYE edge cases',()=>{for(const n of [2,3,4,5,8,9,16]){const s=baseState(n,{format:'knockout',fieldCount:2,oneDay:true,startDate:'2026-06-06',startTime:'09:00',matchDuration:12,breakMinutes:0}); const res=store.generateCalendar(s,{preserveResults:false}); assert(res.ok,`knockout generate ${n}`,res); const expected=Math.pow(2,Math.ceil(Math.log2(Math.max(2,n))))-1; assert(s.matches.length===expected,`knockout count ${n}`,{expected,actual:s.matches.length}); noOverlapChecks(s); playAllKnockouts(s); const final=s.matches.filter(m=>m.phase==='knockout').sort((a,b)=>b.bracketRoundIndex-a.bracketRoundIndex)[0]; assert(!!store.winnerId(s,final),`winner resolves ${n}`,final); assert(standingSignature(store.selectors.calculateStandings(s))===standingSignature(store.selectors.calculateStandings(s,'knockout')),'default knockout standings are KO phase');}});

// Groups + KO all major counts/configs
test('groups+KO logic: RR, Campo 1, firsts opposite, KO excluded from standings',()=>{const cases=[
  {sizes:[2,2],qs:[1,1]}, {sizes:[3,3],qs:[1,1]}, {sizes:[3,3],qs:[2,2]}, {sizes:[3,3],qs:[3,3]},
  {sizes:[4,4],qs:[2,2]}, {sizes:[4,4],qs:[3,3]}, {sizes:[4,4],qs:[4,4]}, {sizes:[8,8],qs:[4,4]},
  {sizes:[3,3,3],qs:[2,2,2]}, {sizes:[4,4,4,4],qs:[2,2,2,2]}
]; for(const c of cases){const cfg=c.sizes.map((size,i)=>({name:`Girone ${String.fromCharCode(65+i)}`,size,qualifiers:c.qs[i]})); const n=c.sizes.reduce((a,b)=>a+b,0); for(const oneDay of [true,false]){const s=baseState(n,{format:'groups_knockout',groupConfigs:cfg,fieldCount:2,oneDay,startDate:'2026-06-06',endDate:'2026-09-01',startTime:'08:00',matchDuration:12,breakMinutes:0,playingDays:[1,2,3,4,5,6,0],groupFieldPolicy:'rotate_per_team'}); const res=store.generateCalendar(s,{preserveResults:false}); assert(res.ok,`groups generate ${JSON.stringify(c)} ${oneDay}`,res); noOverlapChecks(s); campo1Guarantee(s); for(const g of cfg){const ids=[...new Set(s.matches.filter(m=>m.phase==='group'&&m.groupName===g.name).flatMap(m=>[m.homeTeamId,m.awayTeamId]).filter(Boolean))]; assert(ids.length===g.size,`group size ${g.name}`,{expected:g.size,ids}); rrPairsOK(s,ids,'group',g.name);} scorePhase(s,'group',(m)=>({home:m.homeTeamId<m.awayTeamId?2:0,away:m.homeTeamId<m.awayTeamId?0:1})); const beforeDefault=standingSignature(store.selectors.calculateStandings(s)); const beforeGroup=standingSignature(store.selectors.calculateStandings(s,'group')); assert(beforeDefault===beforeGroup,'default groups standings use only group phase before KO'); playAllKnockouts(s); const afterDefault=standingSignature(store.selectors.calculateStandings(s)); const afterGroup=standingSignature(store.selectors.calculateStandings(s,'group')); assert(afterDefault===beforeDefault && afterGroup===beforeGroup,'KO does not alter group/default standings'); if(cfg.length===2){const firstRound=s.matches.filter(m=>m.phase==='knockout'&&m.bracketRoundIndex===1);const a1=`group:${cfg[0].name}:1`, b1=`group:${cfg[1].name}:1`; assert(halfOfSource(s,a1)>0 && halfOfSource(s,b1)>0,`first seeds exist ${JSON.stringify(c)}`,firstRound.map(m=>[m.sourceHome,m.sourceAway])); if(firstRound.length>1){assert(halfOfSource(s,a1)!==halfOfSource(s,b1),`two firsts opposite halves ${JSON.stringify(c)}`,firstRound.map(m=>[m.sourceHome,m.sourceAway]));}else{assert(true,`two firsts q=1 meet directly in final ${JSON.stringify(c)}`);}}}}});

// League + playoff all counts and multiple competitions
test('league+KO: playoff results never change league table/default table',()=>{const cases=[
  {n:2, comps:[{id:'oro',name:'Oro',startRank:1,teams:2}], superCup:{enabled:false}},
  {n:4, comps:[{id:'oro',name:'Oro',startRank:1,teams:4}], superCup:{enabled:false}},
  {n:8, comps:[{id:'oro',name:'Oro',startRank:1,teams:4},{id:'arg',name:'Argento',startRank:5,teams:4}], superCup:{enabled:true,homeCompetitionId:'oro',awayCompetitionId:'arg'}},
  {n:16, comps:[{id:'oro',name:'Oro',startRank:1,teams:8},{id:'arg',name:'Argento',startRank:9,teams:8}], superCup:{enabled:true,homeCompetitionId:'oro',awayCompetitionId:'arg'}}
]; for(const c of cases){const s=baseState(c.n,{format:'league_knockout',eliminationCompetitions:c.comps,superCup:c.superCup,fieldCount:3,oneDay:true,startDate:'2026-06-06',startTime:'08:00',matchDuration:10,breakMinutes:0}); const res=store.generateCalendar(s,{preserveResults:false}); assert(res.ok,`league+KO generate ${c.n}`,res); noOverlapChecks(s); assert(s.matches.filter(m=>m.phase==='league').length===c.n*(c.n-1)/2,`league count ${c.n}`); scorePhase(s,'league',(m)=>({home:m.homeTeamId<m.awayTeamId?4:0,away:m.homeTeamId<m.awayTeamId?1:2})); const explicitBefore=standingSignature(store.selectors.calculateStandings(s,'league')); const defaultBefore=standingSignature(store.selectors.calculateStandings(s)); assert(explicitBefore===defaultBefore,`default before playoffs is league ${c.n}`); playAllKnockouts(s); const explicitAfter=standingSignature(store.selectors.calculateStandings(s,'league')); const defaultAfter=standingSignature(store.selectors.calculateStandings(s)); const allAfter=standingSignature(store.selectors.calculateStandings(s,'all')); assert(explicitAfter===explicitBefore,`explicit league unchanged after playoffs ${c.n}`); assert(defaultAfter===explicitBefore,`default standings unchanged after playoffs ${c.n}`); assert(allAfter!==explicitBefore || c.n===2,`all-phase standings can differ from league ${c.n}`,{explicitBefore,allAfter}); const rows=store.selectors.calculateStandings(s); assert(rows.every(r=>r.played===c.n-1),`default PG remains regular season only ${c.n}`,rows); }});


// Regenerate variant and cross-seeding constraints
// This covers the explicit requirement: with two groups of 6 and three qualifiers each,
// second place crosses with third place from the other group, while group winners remain opposite.
test('calendar variant button logic: different calendar, same rules, cross seeding for 2x6 q=3',()=>{
  const cfg=[{name:'Girone A',size:6,qualifiers:3},{name:'Girone B',size:6,qualifiers:3}];
  const s=baseState(12,{format:'groups_knockout',groupConfigs:cfg,fieldCount:2,oneDay:true,startDate:'2026-06-06',startTime:'08:00',matchDuration:10,breakMinutes:0,groupFieldPolicy:'rotate_per_team'});
  let res=store.generateCalendar(s,{preserveResults:false});
  assert(res.ok,'initial 2x6 q3 calendar',res);
  noOverlapChecks(s); campo1Guarantee(s);
  const before=calendarSignatureLite(s);
  assert(halfOfSource(s,'group:Girone A:1')!==halfOfSource(s,'group:Girone B:1'),'2x6 q3 firsts are in opposite halves',firstRoundSourcePairs(s));
  assert(hasSourcePair(s,'group:Girone A:2','group:Girone B:3'),'A2 plays B3 in first KO round',firstRoundSourcePairs(s));
  assert(hasSourcePair(s,'group:Girone B:2','group:Girone A:3'),'B2 plays A3 in first KO round',firstRoundSourcePairs(s));
  s.rules.calendarVariantSeed=store.nextCalendarVariantSeed();
  res=store.generateCalendar(s,{preserveResults:false});
  assert(res.ok,'variant 2x6 q3 calendar',res);
  noOverlapChecks(s); campo1Guarantee(s);
  const after=calendarSignatureLite(s);
  assert(before!==after,'variant seed produces a different calendar order/slots',{before:before.slice(0,500),after:after.slice(0,500)});
  assert(halfOfSource(s,'group:Girone A:1')!==halfOfSource(s,'group:Girone B:1'),'variant keeps firsts opposite halves',firstRoundSourcePairs(s));
  assert(hasSourcePair(s,'group:Girone A:2','group:Girone B:3'),'variant keeps A2 vs B3',firstRoundSourcePairs(s));
  assert(hasSourcePair(s,'group:Girone B:2','group:Girone A:3'),'variant keeps B2 vs A3',firstRoundSourcePairs(s));
});

// Own goals and scorers
test('own goal affects score/standings/referto label but not scorer table',()=>{const s=baseState(2,{format:'league',fieldCount:1,oneDay:true,startDate:'2026-06-06'}); const res=store.generateCalendar(s,{preserveResults:false}); assert(res.ok,'own goal calendar'); const m=s.matches[0]; m.goals=[{id:'og',playerId:store.ownGoalValue(m.homeTeamId),type:'ownGoal',teamId:m.homeTeamId,weight:1}]; m.status='played'; const sc=store.matchGoals(s,m); assert(sc.home===0&&sc.away===1,'own goal credits opponent',sc); assert(store.goalLabel(s,m,m.goals[0]).includes('Autogol'),'label includes Autogol',store.goalLabel(s,m,m.goals[0])); assert(store.selectors.scorers(s).length===0,'own goal not scorer',store.selectors.scorers(s)); const rows=store.selectors.calculateStandings(s); assert(rows.find(r=>r.teamId===m.awayTeamId).goalsFor===1,'away GF credited');});

// Live, penalties, preserve, invalid edge cases
test('live exclusion, penalties, preservation, validation edge cases',()=>{let s=baseState(2,{format:'knockout',fieldCount:1,oneDay:true,startDate:'2026-06-06'}); let res=store.generateCalendar(s,{preserveResults:false}); assert(res.ok,'KO live calendar'); const m=s.matches[0]; scoreMatch(s,m,0,0); m.penalties={home:2,away:4}; assert(store.winnerId(s,m)===m.awayTeamId,'penalty winner'); m.status='live'; m.goals=[{id:'live',playerId:store.getTeam(s,m.homeTeamId).players[0].id,weight:1}]; assert(store.selectors.calculateStandings(s).find(r=>r.teamId===m.homeTeamId).goalsFor===0,'live excluded default'); assert(store.selectors.calculateStandings(s,null,{includeLive:true}).find(r=>r.teamId===m.homeTeamId).goalsFor===1,'live included when requested'); s=baseState(4,{format:'league',fieldCount:1,oneDay:true,startDate:'2026-06-06'}); res=store.generateCalendar(s,{preserveResults:false}); s.matches[0].referee='Preserve'; scoreMatch(s,s.matches[0],1,0); res=store.generateCalendar(s,{preserveResults:true}); assert(!!s.matches.find(m=>m.referee==='Preserve'&&store.hasScore(s,m)),'preserve results on regenerate'); let inv=baseState(3,{format:'groups_knockout',groupConfigs:[{name:'A',size:2,qualifiers:1},{name:'B',size:2,qualifiers:1}]}); assert(!store.validateGeneration(inv).ok,'reject group size mismatch'); inv=baseState(6,{format:'league_knockout',eliminationCompetitions:[{id:'bad',name:'Bad',startRank:1,teams:3}]}); assert(!store.validateGeneration(inv).ok,'reject non power-of-two playoff');});

// Check files for known regression surfaces
test('code regression surface: public team PDF excludes all knockout phases',()=>{const publicCode=fs.readFileSync(nodePath.join(projectRoot,'assets/js/public.js'),'utf8'); assert(publicCode.includes('store.isKnockoutPhase?store.isKnockoutPhase(m)'), 'public team match list uses isKnockoutPhase guard'); const adminCommon=fs.readFileSync(nodePath.join(projectRoot,'assets/js/admin-common.js'),'utf8'); assert(adminCommon.includes('calculateStandings(s,mainPhase)'), 'admin dashboard explicitly uses the main standings phase');});

const report={summary:{pass,fail,total:pass+fail},results,failures,notes:[
  'calculateStandings(state) now defaults to the qualifying table for the current format: league for league/league+KO, group for groups+KO, knockout for KO-only.',
  'Use calculateStandings(state, "all") only for diagnostic all-phase aggregation.',
  'Rows now include wins/draws/losses to keep team phase cards coherent with PG and points.'
]};
console.log(JSON.stringify(report,null,2)); if(fail>0) process.exitCode=1;
