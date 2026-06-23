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
  else { fail++; failures.push({msg, detail}); }
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

function stateFor(n, rules){
  return store.normalizeState({teams:teams(n), rules:{...store.blankRules(), startDate:'2026-06-23', endDate:'2026-08-31', playingDays:[1,2,3,4,5,6,0], ...rules}, matches:[]});
}

const supported = Object.keys(store.FORMAT_LABELS);
assert(JSON.stringify(supported.sort()) === JSON.stringify(['groups_knockout','league_knockout'].sort()), 'Only the two final tournament formats are exposed.', supported);
assert(store.blankRules().format === 'league_knockout', 'Default rules use Classifica unica + eliminazione diretta.', store.blankRules().format);

for(const format of ['league','knockout','manual','']){
  const rawState = {teams:teams(4), rules:{...store.blankRules(), format}, matches:[]};
  const res = store.validateGeneration(rawState);
  if(format){
    assert(!res.ok, `Unsupported format ${format} is rejected before generation.`, res);
  }else{
    assert(res.ok, 'Missing format falls back to the supported default.', res);
  }
}

const leagueKo = stateFor(6, {format:'league_knockout', eliminationCompetitions:[{id:'comp_oro',name:'Playoff Oro',startRank:1,teams:5}]});
let res = store.generateCalendar(leagueKo, {preserveResults:false});
assert(res.ok, 'Classifica unica + eliminazione generates successfully with non-power-of-two qualifiers.', res);
assert(leagueKo.matches.some(m=>m.phase==='league'), 'League-ko schedule includes the classifica unica phase.');
assert(leagueKo.matches.some(m=>m.phase==='playoff' && m.bracketName), 'League-ko schedule includes a playoff bracket.');
assert(!leagueKo.matches.some(m=>m.phase==='secondary_playoff' || m.phase==='supercup'), 'League-ko no longer generates secondary playoff or supercup phases.');

const groupsKo = stateFor(8, {format:'groups_knockout', groupConfigs:[{name:'Girone A',size:4,qualifiers:2},{name:'Girone B',size:4,qualifiers:2}]});
res = store.generateCalendar(groupsKo, {preserveResults:false});
assert(res.ok, 'Gironi + eliminazione generates successfully.', res);
assert(groupsKo.matches.some(m=>m.phase==='group'), 'Groups-ko schedule includes group matches.');
assert(groupsKo.matches.some(m=>m.phase==='knockout' && m.bracketName), 'Groups-ko schedule includes the final bracket.');

const rulesHtml = fs.readFileSync(path.join(projectRoot, 'admin-rules.html'), 'utf8');
assert(!/value="league"|value="knockout"|Campionato all'italiana/.test(rulesHtml), 'Rules UI does not expose removed standalone modes.');
assert(!/addCompetitionBtn|superCupBox|Supercoppa/.test(rulesHtml), 'Rules UI does not expose secondary KO or supercup controls.');

const adminCommon = fs.readFileSync(path.join(projectRoot, 'assets/js/admin-common.js'), 'utf8');
const supabaseSync = fs.readFileSync(path.join(projectRoot, 'assets/js/supabase-sync.js'), 'utf8');
const allUi = fs.readdirSync(projectRoot).filter(f=>/^admin.*\.html$/.test(f)).map(f=>fs.readFileSync(path.join(projectRoot,f),'utf8')).join('\n');
assert(!/simulation|simulate|openSimulation|runTournamentSimulation|_simulation|Simula/.test(adminCommon + supabaseSync + allUi), 'Tournament simulation UI and logic are fully removed.');
assert(/tournamentNameValidation/.test(adminCommon) && /installTournamentNameEditor/.test(adminCommon), 'Inline tournament name editor is installed in admin-common.');
assert(/tournament-state-snapshot/.test(adminCommon) && /checksum/.test(adminCommon), 'Reset flow creates a versioned snapshot with checksum.');

const summary = {pass, fail, total:pass+fail, failures};
console.log(JSON.stringify(summary, null, 2));
if(fail) process.exit(1);
