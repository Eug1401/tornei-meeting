const fs = require('fs');
const vm = require('vm');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const storeCode = fs.readFileSync(path.join(projectRoot, 'assets/js/store.js'), 'utf8');

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
  vm.runInContext(storeCode, context, { filename:'store.js' });
  return context.window.NexoraStore;
}

const store = loadStore();
let pass = 0;
let fail = 0;
const failures = [];

function assert(cond, msg, detail){
  if(cond) pass++;
  else { fail++; failures.push({msg, detail}); }
}

function teams(n){
  return Array.from({length:n}, (_,i)=>({
    id:`T${i+1}`,
    name:`Team ${i+1}`,
    players:[{id:`P${i+1}`,name:`Player ${i+1}`,number:i+1}],
    president:{id:`PR${i+1}`,name:`President ${i+1}`},
    coach:{name:`Coach ${i+1}`}
  }));
}

function stateFor(n, rules){
  return store.normalizeState({
    teams:teams(n),
    rules:{...store.blankRules(), startDate:'2026-06-23', endDate:'2026-09-30', playingDays:[1,2,3,4,5,6,0], fieldCount:2, ...rules},
    matches:[]
  });
}

function everyInitialTeamHasCampo1(state, phase){
  const ids = new Set(state.teams.map(t=>t.id));
  const covered = new Set();
  state.matches.filter(m=>m.phase===phase && m.field==='Campo 1').forEach(m=>{
    if(m.homeTeamId)covered.add(m.homeTeamId);
    if(m.awayTeamId)covered.add(m.awayTeamId);
  });
  return [...ids].every(id=>covered.has(id));
}

assert(!Object.prototype.hasOwnProperty.call(store.blankRules(),'isKingsLeague'), 'Rules no longer expose the removed Kings League flag.');
const legacy = store.normalizeState({rules:{...store.blankRules(), isKingsLeague:true}, teams:teams(2), matches:[]});
assert(!Object.prototype.hasOwnProperty.call(legacy.rules,'isKingsLeague'), 'Legacy Kings League flag is stripped during normalization.');

const league = stateFor(6, {format:'league_knockout', eliminationCompetitions:[{id:'comp_oro',name:'Playoff Oro',startRank:1,teams:4}]});
let res = store.generateCalendar(league, {preserveResults:false});
assert(res.ok, 'League-ko calendar generation succeeds with two fields.', res);
assert(everyInitialTeamHasCampo1(league, 'league'), 'Every league-ko team has at least one initial phase match on Campo 1.');

const groups = stateFor(8, {format:'groups_knockout', groupConfigs:[{name:'Girone A',size:4,qualifiers:2},{name:'Girone B',size:4,qualifiers:2}]});
res = store.generateCalendar(groups, {preserveResults:false});
assert(res.ok, 'Groups-ko calendar generation succeeds with two fields.', res);
assert(everyInitialTeamHasCampo1(groups, 'group'), 'Every groups-ko team has at least one group match on Campo 1.');

const sourceFiles = [
  'admin-rules.html',
  'assets/js/admin-rules.js',
  'assets/js/admin-matches.js',
  'assets/js/admin-reports.js',
  'assets/js/public.js',
  'assets/js/store.js',
  'assets/js/ui.js'
].map(f=>fs.readFileSync(path.join(projectRoot, f), 'utf8')).join('\n');
assert(!/Kings League|isKings|presidentScorers|presidentStatsTable|getParticipant|getPresident|isPresidentId|goalWeight|Peso gol|Vale 2|Gol doppio|scoreGoals|\bweight\b/i.test(sourceFiles), 'Removed mode APIs, labels, weighted goals, and president scorer views are absent from app sources.');

const publicJs = fs.readFileSync(path.join(projectRoot, 'assets/js/public.js'), 'utf8');
assert(/buildStandingsShareImage/.test(publicJs) && /shareGroupStandingsImage/.test(publicJs) && /shareBracketImage/.test(publicJs), 'Public page exposes generated image export for standings, group standings, and bracket.');
assert(/navigator\.canShare/.test(publicJs) && /canvasToBlob/.test(publicJs) && /data-share-match/.test(publicJs), 'Public image export uses canvas PNG blobs, Web Share API when available, and keeps match image sharing.');
assert(/shareImageBusy/.test(publicJs), 'Image sharing has an anti-double-click guard.');

const reportsJs = fs.readFileSync(path.join(projectRoot, 'assets/js/admin-reports.js'), 'utf8');
assert(/bracketOnePageLayout/.test(reportsJs) && /drawBracketOnePage/.test(reportsJs), 'Bracket PDF uses a dynamic one-page layout.');
assert(!/drawDenseBracketPages/.test(reportsJs), 'Old dense multipage bracket renderer is removed.');

const supabaseSql = fs.readFileSync(path.join(projectRoot, 'SUPABASE_SETUP.sql'), 'utf8');
assert(/app_state_supported_tournament_format/.test(supabaseSql) && /groups_knockout/.test(supabaseSql) && /league_knockout/.test(supabaseSql), 'Supabase setup constrains the persisted tournament format to the two supported modes.');

const summary = {pass, fail, total:pass+fail, failures};
console.log(JSON.stringify(summary, null, 2));
if(fail) process.exit(1);
