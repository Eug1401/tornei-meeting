const fs = require('fs');
const vm = require('vm');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(projectRoot, 'assets/js/store.js'), 'utf8');

function loadStore(){
  const storage = new Map();
  const localStorage = {
    getItem:k=>storage.has(k)?storage.get(k):null,
    setItem:(k,v)=>storage.set(k,String(v)),
    removeItem:k=>storage.delete(k),
    key:i=>Array.from(storage.keys())[i]||null,
    get length(){return storage.size;}
  };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    structuredClone: global.structuredClone,
    localStorage,
    CustomEvent:function(type,init){this.type=type;this.detail=init&&init.detail;},
    window:{dispatchEvent(){},addEventListener(){}}
  };
  Object.assign(context.window, { console, localStorage, setTimeout, clearTimeout, structuredClone: global.structuredClone, CustomEvent: context.CustomEvent });
  vm.createContext(context);
  vm.runInContext(code, context, { filename:'store.js' });
  return context.window.NexoraStore;
}

const store = loadStore();
let pass = 0;
let fail = 0;
const failures = [];

function assert(cond, msg, detail){
  if(cond) pass++;
  else { fail++; failures.push({ msg, detail }); }
}

function teams(n){
  return Array.from({length:n}, (_,i)=>({
    id:`T${i+1}`,
    name:`Team ${i+1}`,
    players:[{id:`P${i+1}`,name:`Player ${i+1}`}],
    president:{id:`PR${i+1}`,name:`President ${i+1}`},
    coach:{name:`Coach ${i+1}`}
  }));
}

function baseState(n, rules){
  return store.normalizeState({ teams:teams(n), rules:{...store.blankRules(), ...rules}, matches:[] });
}

function scoreMatch(state, match, home, away){
  match.goals = [];
  const homeTeam = store.getTeam(state, match.homeTeamId);
  const awayTeam = store.getTeam(state, match.awayTeamId);
  if(!homeTeam || !awayTeam) return;
  for(let i=0;i<home;i++) match.goals.push({id:`${match.id}_h_${i}`,playerId:homeTeam.players[0].id,weight:1});
  for(let i=0;i<away;i++) match.goals.push({id:`${match.id}_a_${i}`,playerId:awayTeam.players[0].id,weight:1});
  match.status = 'played';
}

function standingsSignature(rows){
  return rows.map(r=>`${r.teamId}:${r.points}:${r.played}:${r.goalsFor}:${r.goalsAgainst}:${r.diff}`).join('|');
}

function playLeagueBySeed(state){
  state.matches.filter(m=>m.phase==='league').forEach(m=>{
    const homeSeed = Number(String(m.homeTeamId).replace('T','')) || 99;
    const awaySeed = Number(String(m.awayTeamId).replace('T','')) || 99;
    scoreMatch(state, m, homeSeed < awaySeed ? 3 : 0, homeSeed < awaySeed ? 0 : 1);
  });
  store.autoResolveKnockout(state);
}

function playKnockouts(state){
  const rounds = [...new Set(state.matches.filter(m=>store.isKnockoutPhase(m)).map(m=>m.bracketRoundIndex))].sort((a,b)=>a-b);
  rounds.forEach(round=>{
    store.autoResolveKnockout(state);
    state.matches.filter(m=>store.isKnockoutPhase(m)&&m.bracketRoundIndex===round).forEach(m=>{
      if(m.homeTeamId && m.awayTeamId) scoreMatch(state, m, 2, 0);
    });
  });
  store.autoResolveKnockout(state);
}

function rawRules(format, overrides){
  return { teams:teams(6), rules:{...store.blankRules(), format, ...overrides} };
}

assert(store.FORMAT_LABELS.league_knockout === 'Classifica unica + eliminazione diretta', 'stable league_knockout label is explicit');

let state = baseState(6, {
  format:'league_knockout',
  eliminationCompetitions:[{id:'oro',name:'Playoff Oro',startRank:1,teams:3}],
  fieldCount:1,
  oneDay:true,
  startDate:'2026-06-06',
  startTime:'08:00',
  matchDuration:10,
  breakMinutes:0
});
let result = store.generateCalendar(state, {preserveResults:false});
assert(result.ok, 'classifica unica + KO generates with 3 qualified', result);
assert(state.rules.playoffTeams === 3, 'playoffTeams mirrors the configured qualified count', state.rules);
assert(state.matches.filter(m=>m.phase==='league').length === 15, 'all teams play one league round robin');
assert(state.matches.filter(m=>m.phase==='playoff').length === 3, '3 qualified teams create a 4-slot bracket with 3 matches');
assert(state.matches.some(m=>m.phase==='playoff'&&(m.homeLabel==='BYE'||m.awayLabel==='BYE')), 'non power-of-two qualified count creates a deterministic BYE');
playLeagueBySeed(state);
const beforeKo = standingsSignature(store.selectors.calculateStandings(state));
playKnockouts(state);
const afterKo = standingsSignature(store.selectors.calculateStandings(state));
assert(beforeKo === afterKo, 'KO results do not alter the classifica unica');

[
  ['zero qualified', {eliminationCompetitions:[{id:'bad',name:'Bad',startRank:1,teams:'0'}]}],
  ['one qualified', {eliminationCompetitions:[{id:'bad',name:'Bad',startRank:1,teams:'1'}]}],
  ['negative qualified', {eliminationCompetitions:[{id:'bad',name:'Bad',startRank:1,teams:'-2'}]}],
  ['decimal qualified', {eliminationCompetitions:[{id:'bad',name:'Bad',startRank:1,teams:'2.5'}]}],
  ['too many qualified', {eliminationCompetitions:[{id:'bad',name:'Bad',startRank:1,teams:'7'}]}]
].forEach(([name, rules])=>{
  const check = store.validateGeneration(rawRules('league_knockout', rules));
  assert(!check.ok, `reject ${name}`, check);
});

const badGroupDecimal = store.validateGeneration(rawRules('groups_knockout', {
  groupConfigs:[{name:'A',size:'3',qualifiers:'1.5'},{name:'B',size:'3',qualifiers:'1'}]
}));
assert(!badGroupDecimal.ok, 'reject decimal group qualifiers', badGroupDecimal);

const legacyGroups = store.normalizeState({
  rules:{name:'Legacy groups'},
  teams:teams(4),
  matches:[{id:'m1',phase:'group',groupName:'Girone A',homeTeamId:'T1',awayTeamId:'T2'}]
});
assert(legacyGroups.rules.format === 'groups_knockout', 'legacy data without format infers groups_knockout from group matches', legacyGroups.rules);

const report = {
  summary:{pass, fail, total:pass+fail},
  failures,
  notes:[
    'league_knockout is the persisted project value for Classifica unica + eliminazione diretta.',
    'The final phase accepts non-power-of-two qualified counts through deterministic BYE placement.',
    'Default standings for league_knockout remain tied to the initial league/classifica unica phase.'
  ]
};

console.log(JSON.stringify(report, null, 2));
if(fail) process.exitCode = 1;
