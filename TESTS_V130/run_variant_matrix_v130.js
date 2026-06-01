const fs=require('fs'), vm=require('vm');
const code=fs.readFileSync('/mnt/data/work_v130/tornei-clean/assets/js/store.js','utf8');
function load(){const storage=new Map();const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};const c={console,setTimeout,clearTimeout,structuredClone:global.structuredClone,localStorage,CustomEvent:function(){},window:{dispatchEvent(){},addEventListener(){}}};Object.assign(c.window,{console,localStorage,setTimeout,clearTimeout,structuredClone:global.structuredClone,CustomEvent:c.CustomEvent});vm.createContext(c);vm.runInContext(code,c);return c.window.NexoraStore;}const store=load();
let pass=0,fail=0;const failures=[];function assert(cond,msg,detail){cond?pass++:(fail++,failures.push({msg,detail}));}
function teams(n){return Array.from({length:n},(_,i)=>({id:'T'+(i+1),name:'T'+(i+1),players:[{id:'P'+(i+1),name:'P'+(i+1)}],president:{id:'PR'+(i+1),name:'PR'+(i+1)},coach:{name:'C'}}));}
function base(n,rules){return store.normalizeState({teams:teams(n),rules:{...store.blankRules(),...rules},matches:[]});}
function fieldNo(m){const x=String(m.field||'').match(/(\d+)/);return x?Number(x[1]):0;}
function noOverlap(s){const fs=new Set(), ts=new Set();for(const m of s.matches){assert(!!m.date,'date set');assert(!!m.field,'field set');const slot=`${m.date}|${s.rules.oneDay?m.time:'ALL_DAY'}`;const fk=`${slot}|${m.field}`;assert(!fs.has(fk),'no field overlap',fk);fs.add(fk);for(const t of [m.homeTeamId,m.awayTeamId].filter(Boolean)){const tk=`${slot}|${t}`;assert(!ts.has(tk),'no team overlap',tk);ts.add(tk);}}}
function campo1(s){if(s.rules.format!=='groups_knockout'||Number(s.rules.fieldCount)<=1)return;const all=new Set(), cov=new Set();for(const m of s.matches.filter(x=>x.phase==='group')){[m.homeTeamId,m.awayTeamId].filter(Boolean).forEach(t=>all.add(t));if(fieldNo(m)===1)[m.homeTeamId,m.awayTeamId].filter(Boolean).forEach(t=>cov.add(t));}const miss=[...all].filter(t=>!cov.has(t));assert(miss.length===0,'all group teams Campo 1',miss);}
function firstRoundPairs(s){return s.matches.filter(m=>m.phase==='knockout'&&m.bracketRoundIndex===1).map(m=>[m.sourceHome||m.homeLabel,m.sourceAway||m.awayLabel]);}
function hasPair(s,a,b){return firstRoundPairs(s).some(p=>p.includes(a)&&p.includes(b));}
function half(s,source){const ms=s.matches.filter(m=>m.phase==='knockout'&&m.bracketRoundIndex===1).sort((a,b)=>a.bracketMatchIndex-b.bracketMatchIndex);const idx=ms.findIndex(m=>m.sourceHome===source||m.sourceAway===source);return idx<0?-1:(idx<ms.length/2?1:2);}
function sig(s){return s.matches.map(m=>[m.phase,m.groupName,m.round,m.homeTeamId||m.sourceHome||m.homeLabel,m.awayTeamId||m.sourceAway||m.awayLabel,m.date,m.time,m.field].join('/')).join('|');}
// all basic formats, common powers of two, and variant calendars
for(const format of ['league','knockout']){
  for(const n of [2,4,8,16]){
    const s=base(n,{format,fieldCount:2,oneDay:true,startDate:'2026-06-06',startTime:'08:00',matchDuration:10,breakMinutes:0});
    const res=store.generateCalendar(s,{preserveResults:false});assert(res.ok,`${format} ${n} generated`,res);noOverlap(s);const before=sig(s);s.rules.calendarVariantSeed=store.nextCalendarVariantSeed();const res2=store.generateCalendar(s,{preserveResults:false});assert(res2.ok,`${format} ${n} variant generated`,res2);noOverlap(s);assert(sig(s)!==before,`${format} ${n} variant differs`);
  }
}
for(const size of [2,3,4,5,6,7,8]){
  for(let q=1;q<=size;q++){
    const cfg=[{name:'Girone A',size,qualifiers:q},{name:'Girone B',size,qualifiers:q}];
    const s=base(size*2,{format:'groups_knockout',groupConfigs:cfg,fieldCount:2,oneDay:true,startDate:'2026-06-06',startTime:'08:00',matchDuration:10,breakMinutes:0,groupFieldPolicy:'rotate_per_team'});
    const res=store.generateCalendar(s,{preserveResults:false});assert(res.ok,`2 groups size ${size} q ${q} generated`,res);noOverlap(s);campo1(s);
    if(q>=2){assert(half(s,'group:Girone A:1')!==half(s,'group:Girone B:1'),`firsts opposite size${size} q${q}`,firstRoundPairs(s));}
    if(q===2){assert(hasPair(s,'group:Girone A:1','group:Girone B:2'),`A1-B2 size${size}`);assert(hasPair(s,'group:Girone B:1','group:Girone A:2'),`B1-A2 size${size}`);}
    if(q===3||q===4){assert(hasPair(s,'group:Girone A:2','group:Girone B:3'),`A2-B3 size${size} q${q}`,firstRoundPairs(s));assert(hasPair(s,'group:Girone B:2','group:Girone A:3'),`B2-A3 size${size} q${q}`,firstRoundPairs(s));}
    const before=sig(s);s.rules.calendarVariantSeed=store.nextCalendarVariantSeed();const res2=store.generateCalendar(s,{preserveResults:false});assert(res2.ok,`2 groups size ${size} q ${q} variant generated`,res2);noOverlap(s);campo1(s);assert(sig(s)!==before,`variant differs size${size} q${q}`);if(q===3||q===4){assert(hasPair(s,'group:Girone A:2','group:Girone B:3'),`variant A2-B3 size${size} q${q}`);assert(hasPair(s,'group:Girone B:2','group:Girone A:3'),`variant B2-A3 size${size} q${q}`);}
  }
}
for(const n of [4,8,16]){
  const comps=n===4?[{id:'oro',name:'Oro',startRank:1,teams:4}]:[{id:'oro',name:'Oro',startRank:1,teams:n/2},{id:'arg',name:'Argento',startRank:n/2+1,teams:n/2}];
  const s=base(n,{format:'league_knockout',eliminationCompetitions:comps,superCup:{enabled:comps.length>1,homeCompetitionId:'oro',awayCompetitionId:'arg'},fieldCount:2,oneDay:true,startDate:'2026-06-06',startTime:'08:00',matchDuration:10,breakMinutes:0});
  const res=store.generateCalendar(s,{preserveResults:false});assert(res.ok,`league+ko ${n} generated`,res);noOverlap(s);const before=sig(s);s.rules.calendarVariantSeed=store.nextCalendarVariantSeed();const res2=store.generateCalendar(s,{preserveResults:false});assert(res2.ok,`league+ko ${n} variant generated`,res2);noOverlap(s);assert(sig(s)!==before,`league+ko ${n} variant differs`);
}
const report={summary:{pass,fail,total:pass+fail},failures};console.log(JSON.stringify(report,null,2));if(fail)process.exitCode=1;
