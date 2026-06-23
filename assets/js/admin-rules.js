(function(){
  const store=NexoraStore, UI=NexoraUI, A=NexoraAdmin;
  let competitions=[], groupConfigs=[], criteriaOrder=[], regenerationBusy=false;
  const isTouchDevice=()=>window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;

  function selectedPlayingDays(){return UI.$$('#playingDaysBox input[name="playingDays"]:checked').map(x=>Number(x.value));}
  function setPlayingDays(days){const set=new Set((days&&days.length?days:[1,2,3,4,5,6,0]).map(Number));UI.$$('#playingDaysBox input[name="playingDays"]').forEach(x=>x.checked=set.has(Number(x.value)));}
  function clampFinalCompetition(){
    const current=competitions[0]||{id:'comp_oro',name:'Playoff Oro',startRank:1,teams:4};
    competitions=[{...current,id:current.id||'comp_oro',name:current.name||'Playoff Oro',startRank:1,teams:Math.max(2,Math.floor(Number(current.teams)||4))}];
    return competitions[0];
  }
  function currentTournamentName(){return String(UI.$('#ruleName')?.value||'').trim()||'New Generation';}
  function saveTournamentNameOnly(){const name=currentTournamentName();const saved=A.commit(s=>{s.rules.name=name;});try{UI.applySiteTheme(saved);}catch(_){ }return saved;}

  function criteriaMeta(id){return store.standingsCriterionMeta?store.standingsCriterionMeta(id):(store.STANDINGS_CRITERIA||[]).find(c=>c.id===id)||{id,label:id,short:id,direction:'desc'};}
  function normalizeCriteria(){criteriaOrder=store.normalizeStandingsCriteriaOrder?store.normalizeStandingsCriteriaOrder(criteriaOrder):criteriaOrder;}
  function moveCriterion(from,to){normalizeCriteria();if(from===to||from<0||to<0||from>=criteriaOrder.length||to>=criteriaOrder.length)return;const [item]=criteriaOrder.splice(from,1);criteriaOrder.splice(to,0,item);renderCriteriaEditor();toggle();render();}
  function renderCriteriaEditor(){
    normalizeCriteria();
    const box=UI.$('#standingsCriteriaEditor');
    if(!box)return;
    box.innerHTML=criteriaOrder.map((id,i)=>{const c=criteriaMeta(id);const dir=c.direction==='asc'?'minore è meglio':'maggiore è meglio';const touch=isTouchDevice();return `<div class="ranking-criterion-row ${touch?'touch-fallback':''}" data-criterion-index="${i}" data-criterion-id="${UI.esc(id)}" draggable="${touch?'false':'true'}"><span class="criterion-rank">${i+1}</span><button class="criterion-handle" type="button" data-pick-criterion="${i}" aria-label="Sposta criterio ${UI.esc(c.label)}">↕</button><div><strong>${UI.esc(c.label)}</strong><small>${UI.esc(dir)}</small></div><div class="criterion-actions"><button class="btn small" type="button" data-criterion-up="${i}" ${i===0?'disabled':''}>↑</button><button class="btn small" type="button" data-criterion-down="${i}" ${i===criteriaOrder.length-1?'disabled':''}>↓</button></div></div>`;}).join('');
    const summary=UI.$('#standingsCriteriaSummary');
    if(summary)summary.textContent='Ordine attivo: '+criteriaOrder.map((id,i)=>`${i+1}) ${criteriaMeta(id).label}`).join(' · ');
  }
  function ensureCriterionMoveModal(){
    let modal=UI.$('#criterionMoveModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.className='modal group-move-modal criterion-move-modal';
    modal.id='criterionMoveModal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML=`<div class="modal-content group-move-content"><div class="match-task-toolbar"><h2 id="criterionMoveTitle">Sposta criterio</h2><button class="btn danger" id="closeCriterionMoveModal" type="button">Chiudi</button></div><div id="criterionMoveBody" class="group-move-body"></div></div>`;
    document.body.appendChild(modal);
    return modal;
  }
  function openCriterionMoveModal(index){
    normalizeCriteria();
    const id=criteriaOrder[index];
    const c=criteriaMeta(id);
    if(!id)return;
    const modal=ensureCriterionMoveModal();
    UI.$('#criterionMoveTitle').textContent=`Sposta ${c.label}`;
    UI.$('#criterionMoveBody').innerHTML=`<div class="selected-team-summary"><span class="criterion-rank big">${index+1}</span><div><strong>${UI.esc(c.label)}</strong><small>Posizione attuale: ${index+1}</small></div></div><div class="group-move-actions">${criteriaOrder.map((targetId,i)=>`<button class="match-action-card compact ${i===index?'active':''}" type="button" data-mobile-criterion-from="${index}" data-mobile-criterion-to="${i}"><strong>Posizione ${i+1}</strong><small>${UI.esc(criteriaMeta(targetId).label)}</small></button>`).join('')}</div>`;
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }
  function closeCriterionMoveModal(){UI.$('#criterionMoveModal')?.classList.remove('open');document.body.classList.remove('modal-open');}

  function renderCompetitionEditor(){
    const box=UI.$('#competitionsEditor');if(!box)return;
    const c=clampFinalCompetition();
    box.innerHTML=`<div class="competition-row league-ko-qualified-row" data-comp-id="${c.id}">
      <input data-comp-field="name" type="hidden" value="${UI.esc(c.name||'Playoff Oro')}">
      <input data-comp-field="startRank" type="hidden" value="1">
      <div>
        <label>Squadre qualificate alla fase finale</label>
        <input data-comp-field="teams" type="number" min="2" step="1" value="${UI.esc(c.teams)}">
        <p class="muted">Le prime N della classifica unica accedono al tabellone. Se N non è 2, 4, 8, 16 o 32, l'app assegna BYE automatici in modo deterministico.</p>
      </div>
      <span class="pill">Fase finale</span>
    </div>`;
  }
  function renderGroupsEditor(){const box=UI.$('#groupsEditor');if(!box)return;groupConfigs=groupConfigs.length?groupConfigs:[{name:'Girone A',size:4,qualifiers:2},{name:'Girone B',size:4,qualifiers:2}];box.innerHTML=groupConfigs.map((g,i)=>`<div class="competition-row" data-group-index="${i}"><div><label>Nome girone</label><input data-group-field="name" value="${UI.esc(g.name)}"></div><div><label>Squadre nel girone</label><input data-group-field="size" type="number" min="2" value="${UI.esc(g.size)}"></div><div><label>Squadre qualificate</label><input data-group-field="qualifiers" type="number" min="0" value="${UI.esc(g.qualifiers)}"><p class="muted">Max pari al numero squadre del girone.</p></div>${groupConfigs.length>2?`<button class="btn danger small" data-delete-group="${i}" type="button">Elimina</button>`:'<span class="pill">Girone</span>'}</div>`).join('');}
  function readGroupsFromDom(){const rows=UI.$$('#groupsEditor [data-group-index]');groupConfigs=rows.map((row,i)=>({name:row.querySelector('[data-group-field="name"]').value.trim()||`Girone ${String.fromCharCode(65+i)}`,size:row.querySelector('[data-group-field="size"]').value,qualifiers:row.querySelector('[data-group-field="qualifiers"]').value}));}
  function readCompetitionsFromDom(){const rows=UI.$$('#competitionsEditor [data-comp-id]');competitions=rows.map(row=>({id:row.dataset.compId,name:row.querySelector('[data-comp-field="name"]').value.trim()||'Playoff',startRank:row.querySelector('[data-comp-field="startRank"]').value,teams:row.querySelector('[data-comp-field="teams"]').value}));}

  function fill(){const s=A.state(),r=s.rules;competitions=(r.eliminationCompetitions||[]).map(c=>({...c}));clampFinalCompetition();groupConfigs=(r.groupConfigs||store.defaultGroupConfigs()).map(g=>({...g}));criteriaOrder=store.normalizeStandingsCriteriaOrder?store.normalizeStandingsCriteriaOrder(r.standingsCriteriaOrder):[...(r.standingsCriteriaOrder||[])];UI.$('#ruleName').value=r.name;UI.$('#ruleFormat').value=store.FORMAT_LABELS[r.format]?r.format:'league_knockout';UI.$('#fieldCount').value=r.fieldCount;UI.$('#groupFieldPolicy').value=r.groupFieldPolicy||'auto';UI.$('#oneDay').checked=!!r.oneDay;UI.$('#startDate').value=r.startDate;UI.$('#endDate').value=r.endDate;UI.$('#startTime').value=r.startTime;UI.$('#matchDuration').value=r.matchDuration;UI.$('#breakMinutes').value=r.breakMinutes;UI.$('#oneDayPauseEnabled').checked=!!r.oneDayPauseEnabled;UI.$('#oneDayPauseStart').value=r.oneDayPauseStart||'13:00';UI.$('#oneDayPauseDuration').value=r.oneDayPauseDuration||60;setPlayingDays(r.playingDays);renderGroupsEditor();renderCompetitionEditor();renderCriteriaEditor();toggle();}
  function readInto(s){readCompetitionsFromDom();readGroupsFromDom();normalizeCriteria();const fd=new FormData(UI.$('#rulesForm'));const format=store.FORMAT_LABELS[fd.get('format')]?fd.get('format'):'league_knockout';const c=clampFinalCompetition();const totalQ=groupConfigs.reduce((sum,g)=>sum+(Number(g.qualifiers)||0),0);const leagueQualified=Number(c.teams)||Number(s.rules.playoffTeams)||4;s.rules={...s.rules,name:fd.get('name')?.trim()||'New Generation',format,groupCount:format==='groups_knockout'?groupConfigs.length:2,groupConfigs:format==='groups_knockout'?groupConfigs:s.rules.groupConfigs,playoffTeams:format==='groups_knockout'?totalQ:leagueQualified,eliminationCompetitions:[{...c,name:c.name||'Playoff Oro',startRank:1,teams:leagueQualified}],fieldCount:Number(fd.get('fieldCount'))||1,groupFieldPolicy:(()=>{const p=fd.get('groupFieldPolicy')||'auto';if(p==='fixed_by_group'&&format!=='groups_knockout')return 'auto';if(p==='rotate_per_team'&&(Number(fd.get('fieldCount'))||1)<2)return 'auto';return p;})(),oneDay:Boolean(fd.get('oneDay')),startDate:fd.get('startDate')||'',endDate:fd.get('endDate')||'',startTime:fd.get('startTime')||'09:00',endTime:'',matchDuration:Number(fd.get('matchDuration'))||40,breakMinutes:Number(fd.get('breakMinutes'))||0,oneDayPauseEnabled:Boolean(fd.get('oneDayPauseEnabled')),oneDayPauseStart:fd.get('oneDayPauseStart')||'13:00',oneDayPauseDuration:Number(fd.get('oneDayPauseDuration'))||0,playingDays:selectedPlayingDays(),standingsCriteriaOrder:[...criteriaOrder]};delete s.rules['super'+'Cup'];delete s.rules['is'+'K'+'ingsLeague'];}
  function currentDraftState(){const draft=JSON.parse(JSON.stringify(A.state()));readInto(draft);return store.normalizeState(draft);}
  function toggle(){const one=UI.$('#oneDay').checked,format=UI.$('#ruleFormat').value;UI.$$('.one-day-field').forEach(x=>x.style.display=one?'block':'none');const pauseControls=UI.$('#oneDayPauseControls');if(pauseControls)pauseControls.style.display=(one&&UI.$('#oneDayPauseEnabled')?.checked)?'grid':'none';UI.$$('.multi-day-field').forEach(x=>x.style.display=one?'none':'block');UI.$$('.groups-only').forEach(x=>x.style.display=format==='groups_knockout'?'block':'none');UI.$$('.league-ko-only').forEach(x=>x.style.display=format==='league_knockout'?'block':'none');const draft=currentDraftState();const fieldsNow=Number(draft.rules.fieldCount)||1;
    // Politica campi: visibile solo con almeno 2 campi (con 1 campo non c'è nulla da assegnare).
    UI.$$('.fields-policy').forEach(x=>x.style.display=fieldsNow>1?'block':'none');
    // L'opzione "un girone per campo" ha senso solo nei gironi.
    const min=store.minimumTeams(draft.rules),hint=store.FORMAT_HELP[format]||'';const groupHint=format==='groups_knockout'?`<br><span class="muted">Gironi configurati: ${draft.rules.groupConfigs.map(g=>`${UI.esc(g.name)} ${g.size} squadre / ${g.qualifiers} qualificate`).join(' · ')}</span>`:'';const leagueHint=format==='league_knockout'?`<br><span class="muted">Qualificate alla fase finale: ${UI.esc(String(draft.rules.playoffTeams||draft.rules.eliminationCompetitions?.[0]?.teams||0))}</span>`:'';const policyHint=UI.$('#groupFieldPolicyHint');if(policyHint){policyHint.textContent=fieldsNow>=2?'Rotazione automatica: ogni squadra gioca su entrambi i campi, con almeno una partita su Campo 1.':'';}UI.$('#formatHint').innerHTML=`<div class="help-box"><strong>${UI.esc(store.FORMAT_LABELS[format]||format)}</strong><br>${UI.esc(hint)}<br><span class="muted">Minimo squadre richieste: ${min}</span>${groupHint}${leagueHint}</div>`;}
  function render(){const s=A.state();UI.$('#tournamentSummary').innerHTML=UI.rulesSummary(s);UI.$('#generatedCalendar').innerHTML=UI.matchList(s);const draft=currentDraftState();const plan=store.generationPlan(draft);UI.$('#generationPreview').innerHTML=`<div class="message ${plan.ok?'ok':'error'}">${UI.esc(plan.message)}</div>`;const est=plan.estimate;UI.$('#suggestedEndHint').textContent=(!draft.rules.oneDay&&est?.ok)?`Fine consigliata: ${est.suggestedEndDate}`:'';UI.$('#calendarAdvisor').innerHTML=est?`<div class="advisor-card"><strong>Consiglio calendario</strong><span>${UI.esc(est.message)}</span><span class="muted">Il calcolo considera formato, gironi, qualificate, campi disponibili, giorni di gioco e vincoli anti-sovrapposizione.</span></div>`:'';}

  document.addEventListener('DOMContentLoaded',()=>{fill();render();});
  ['#oneDay','#ruleFormat','#fieldCount','#groupFieldPolicy','#startDate','#endDate','#startTime','#matchDuration','#breakMinutes','#oneDayPauseEnabled','#oneDayPauseStart','#oneDayPauseDuration'].forEach(sel=>UI.$(sel)?.addEventListener('change',()=>{toggle();render();}));
  UI.$('#ruleFormat')?.addEventListener('change',()=>{renderCompetitionEditor();renderGroupsEditor();toggle();render();});
  UI.$$('#playingDaysBox input[name="playingDays"]').forEach(x=>x.addEventListener('change',()=>{toggle();render();}));
  UI.$('#groupsEditor')?.addEventListener('input',()=>{readGroupsFromDom();toggle();render();});
  UI.$('#competitionsEditor')?.addEventListener('input',()=>{readCompetitionsFromDom();toggle();render();});
  UI.$('#addGroupBtn')?.addEventListener('click',()=>{readGroupsFromDom();groupConfigs.push({name:`Girone ${String.fromCharCode(65+groupConfigs.length)}`,size:4,qualifiers:2});renderGroupsEditor();toggle();render();});

  document.addEventListener('click',e=>{
    const gc=e.target.closest('[data-delete-group]');if(gc){readGroupsFromDom();groupConfigs.splice(Number(gc.dataset.deleteGroup),1);renderGroupsEditor();toggle();render();return;}
    const up=e.target.closest('[data-criterion-up]');if(up){moveCriterion(Number(up.dataset.criterionUp),Number(up.dataset.criterionUp)-1);return;}
    const down=e.target.closest('[data-criterion-down]');if(down){moveCriterion(Number(down.dataset.criterionDown),Number(down.dataset.criterionDown)+1);return;}
    const pick=e.target.closest('[data-pick-criterion]');if(pick){if(isTouchDevice())openCriterionMoveModal(Number(pick.dataset.pickCriterion));return;}
    const mobile=e.target.closest('[data-mobile-criterion-from]');if(mobile){moveCriterion(Number(mobile.dataset.mobileCriterionFrom),Number(mobile.dataset.mobileCriterionTo));closeCriterionMoveModal();return;}
    if(e.target.id==='closeCriterionMoveModal'||e.target.id==='criterionMoveModal')closeCriterionMoveModal();
  });

  document.addEventListener('dragstart',e=>{const row=e.target.closest('[data-criterion-index]');if(!row||isTouchDevice())return;e.dataTransfer.setData('text/plain',row.dataset.criterionIndex);row.classList.add('dragging');});
  document.addEventListener('dragend',e=>{e.target.closest('[data-criterion-index]')?.classList.remove('dragging');});
  document.addEventListener('dragover',e=>{const row=e.target.closest('[data-criterion-index]');if(!row||isTouchDevice())return;e.preventDefault();row.classList.add('drop-active');});
  document.addEventListener('dragleave',e=>{e.target.closest('[data-criterion-index]')?.classList.remove('drop-active');});
  document.addEventListener('drop',e=>{const row=e.target.closest('[data-criterion-index]');if(!row||isTouchDevice())return;e.preventDefault();row.classList.remove('drop-active');const from=Number(e.dataTransfer.getData('text/plain'));const to=Number(row.dataset.criterionIndex);moveCriterion(from,to);});

  UI.$('#rulesForm').addEventListener('submit',e=>{e.preventDefault();let draft=A.state();readInto(draft);const check=store.validateGeneration(draft);if(!check.ok){saveTournamentNameOnly();A.flash('#rulesMessage','Nome torneo salvato. Le altre regole non sono state applicate perché il calendario non è ancora valido: '+check.message,'error');fill();render();return;}let res;A.commit(s=>{readInto(s);res=store.generateCalendar(s,{preserveResults:true});});const type=res.ok?'ok':'error';const msg=res.ok?'Regole salvate, nome aggiornato, classifica aggiornata e calendario allineato. '+res.message:'Nome e regole salvate, ma il calendario non può essere aggiornato: '+res.message;A.flash('#rulesMessage',msg,type);fill();render();});
  UI.$('#generateCalendarBtn').addEventListener('click',()=>{const old=A.state();const hasReports=old.matches.some(m=>(m.goals&&m.goals.length)||(m.cards&&m.cards.length));if(hasReports&&!confirm('Rigenerare il calendario? I risultati/referti delle partite ancora compatibili verranno preservati, gli altri potrebbero essere rimossi.'))return;let res;A.commit(s=>{readInto(s);res=store.generateCalendar(s,{preserveResults:true});});A.flash('#rulesMessage',res.message,res.ok?'ok':'error');fill();render();});
  UI.$('#reshuffleCalendarBtn')?.addEventListener('click',function(){
    if(regenerationBusy)return;
    const old=A.state();
    const hasReports=old.matches.some(m=>(m.goals&&m.goals.length)||(m.cards&&m.cards.length));
    const warning=hasReports
      ? 'Rigenerare il calendario da zero? Verranno conservati squadre, gironi e regole, ma referti, risultati, campi, date e orari verranno sostituiti dal nuovo calendario.'
      : 'Rigenerare il calendario da zero mantenendo squadre, gironi e regole attuali?';
    if(!confirm(warning))return;
    regenerationBusy=true;
    this.disabled=true;
    try{
      const draft=JSON.parse(JSON.stringify(old));
      readInto(draft);
      draft.rules.calendarVariantSeed=store.nextCalendarVariantSeed?store.nextCalendarVariantSeed():store.uid('calendar_variant');
      const res=store.generateCalendar(draft,{preserveResults:false});
      if(!res.ok){A.flash('#rulesMessage','Calendario precedente mantenuto: '+res.message,'error');return;}
      A.save(draft);
      A.flash('#rulesMessage','Calendario rigenerato da zero. '+res.message,'ok');
      fill();render();
    }finally{
      regenerationBusy=false;
      this.disabled=false;
    }
  });

  window.NexoraAdminRefresh=function(){try{fill();render();}catch(_){}};
  window.addEventListener('ng:admin-state-loaded',()=>window.NexoraAdminRefresh());
})();
