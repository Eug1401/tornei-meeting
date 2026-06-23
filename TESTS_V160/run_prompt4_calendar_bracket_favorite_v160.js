const fs = require('fs');
const vm = require('vm');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const storeCode = fs.readFileSync(path.join(projectRoot, 'assets/js/store.js'), 'utf8');
const publicJs = fs.readFileSync(path.join(projectRoot, 'assets/js/public.js'), 'utf8');
const uiJs = fs.readFileSync(path.join(projectRoot, 'assets/js/ui.js'), 'utf8');
const adminRulesJs = fs.readFileSync(path.join(projectRoot, 'assets/js/admin-rules.js'), 'utf8');
const css = fs.readFileSync(path.join(projectRoot, 'assets/css/styles.css'), 'utf8');

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
    rules:{
      ...store.blankRules(),
      format:'league_knockout',
      eliminationCompetitions:[{id:'comp_oro',name:'Playoff Oro',startRank:1,teams:2}],
      fieldCount:2,
      oneDay:false,
      startDate:'2026-06-23',
      endDate:'2026-06-26',
      playingDays:[1,2,3,4,5,6,0],
      matchDuration:40,
      breakMinutes:0,
      ...rules
    },
    matches:[]
  });
}

const constrained = stateFor(4);
const strict = store.generateCalendar(constrained, {preserveResults:false});
assert(!strict.ok, 'Strict Campo 1 generation can fail on a constrained three-day calendar.', strict);
assert(strict.requiresField1FallbackConfirmation, 'Strict failure returns an explicit Campo 1 fallback confirmation contract.', strict);
assert(strict.code === 'FIELD1_STRICT_UNSATISFIABLE', 'Strict failure exposes a stable error code.', strict);
assert(Array.isArray(strict.field1MissingTeamIds), 'Strict failure returns structured missing team ids.', strict);
assert(constrained.matches.length === 0, 'Strict failure does not save a partial match list on the state.', constrained.matches);

const relaxed = stateFor(4);
const relaxedResult = store.generateCalendar(relaxed, {preserveResults:false, allowField1Fallback:true});
assert(relaxedResult.ok, 'Relaxed Campo 1 generation can complete the same constrained calendar.', relaxedResult);
assert(relaxed.matches.length > 0, 'Relaxed generation saves matches only after success.', relaxed.matches.length);
const relaxedAudit = store.field1Audit(relaxed.matches, relaxed.rules);
assert((relaxedAudit.missing||[]).length <= 1, 'Relaxed Campo 1 generation leaves at most one missing team.', relaxedAudit);
assert(relaxedResult.field1Audit && Array.isArray(relaxedResult.field1MissingTeamIds), 'Relaxed result keeps structured audit metadata.', relaxedResult);

const ample = stateFor(6, {endDate:'2026-07-31'});
const ampleResult = store.generateCalendar(ample, {preserveResults:false});
assert(ampleResult.ok, 'Normal calendar generation still succeeds without fallback.', ampleResult);
assert(store.field1Audit(ample.matches, ample.rules).ok, 'Normal generation covers every initial-phase team on Campo 1.', store.field1Audit(ample.matches, ample.rules));

assert(/generateOnDraft/.test(adminRulesJs) && /allowField1Fallback:false/.test(adminRulesJs) && /allowField1Fallback:true/.test(adminRulesJs), 'Admin generation performs strict first pass and confirmed relaxed retry.');
assert(/confirm\(field1FallbackPrompt/.test(adminRulesJs), 'Admin UI asks for explicit fallback confirmation.');
assert(/A\.save\(draft\)/.test(adminRulesJs) && !/A\.commit\(s=>\{readInto\(s\);res=store\.generateCalendar/.test(adminRulesJs), 'Admin generation saves only the completed draft, not a partial commit.');
assert(/setGenerationBusy/.test(adminRulesJs) && /btn\.disabled=on/.test(adminRulesJs), 'Admin generation disables duplicate submissions while working.');

assert(/waitForShareRender/.test(publicJs) && /document\.fonts/.test(publicJs), 'Bracket image export waits for rendering and fonts.');
assert(/canvasExportScale/.test(publicJs) && /HD/.test(publicJs), 'Bracket image export uses high-quality scaled canvas with browser limits.');
assert(/logoMap/.test(publicJs) && /drawTeamRow/.test(publicJs), 'Bracket image export renders teams and logos from bracket data.');
assert(/lineTo\(mid,y1\).*lineTo\(mid,y2\).*lineTo\(x2,y2\)/s.test(publicJs), 'Bracket image export draws full connectors between rounds.');
assert(/blob\.size<2048/.test(publicJs), 'Bracket image export validates that the output image is not empty.');

assert(/function teamGrid\(state\)/.test(uiJs) && !/showFavorite/.test(uiJs), 'Shared team grid stays independent from the favorite-team feature.');
assert(/UI\.teamGrid\(state\)/.test(publicJs) && !/showFavorite:true/.test(publicJs), 'Public team view does not expose favorite controls.');
assert(!/showFavorite:true|data-favorite-team|favorite-team-btn/.test(adminRulesJs+uiJs), 'Admin and shared team components do not opt into favorite controls.');
assert(/#publicStandings tr\[data-team-id=/.test(publicJs) && /#publicMatches \.public-fixture-card\[data-match-detail\]/.test(publicJs), 'Favorite highlighting is scoped to standings and the Matches list.');
assert(!/public-score-team[^\n]+data-team-id/.test(publicJs), 'Public match detail remains independent from favorite highlighting.');
assert(!/favorite-inline-badge/.test(publicJs) && /favorite-standing-row/.test(css) && /favorite-match-card/.test(css), 'Favorite highlighting uses non-invasive scoped styles without inline badges.');
assert(/#publicStandings tr\.favorite-standing-row td/.test(css) && /box-shadow:inset 4px 0/.test(css), 'Favorite table marker preserves ranking cells and column alignment.');
assert(/FAVORITE_TEAM_KEY_PREFIX='meeting-tournament-public-favorite-team-v2'/.test(publicJs) && /favoriteTournamentIdentity/.test(publicJs), 'Favorite team persistence is scoped to the current tournament.');
assert(/LEGACY_FAVORITE_TEAM_KEY=\['new','generation','public','favorite','team','v1'\]\.join\('-'\)/.test(publicJs), 'Favorite team migration keeps legacy browser data without static legacy branding.');
assert(/meeting-tournament-logo-transparent\.png/.test(publicJs) && /MEETING TOURNAMENT/.test(publicJs), 'Public PDF and image exports use Meeting Tournament branding assets/text.');
const oldBrandWords = ['New','Generation'];
const oldBrandPatterns = [
  oldBrandWords.join(' '),
  oldBrandWords.join(' ').toUpperCase(),
  oldBrandWords.map(w=>w.toLowerCase()).join('-'),
  oldBrandWords.map(w=>w.toLowerCase()).join('_'),
  oldBrandWords.join('')
];
assert(!new RegExp(oldBrandPatterns.join('|')).test(publicJs + uiJs + css), 'Prompt 4 touched files do not contain old branding variants.');

const summary = {pass, fail, total:pass+fail, failures};
console.log(JSON.stringify(summary, null, 2));
if(fail) process.exit(1);
