(function(){
  const store=window.NexoraStore, UI=window.NexoraUI, $=UI.$;
  let state=store.load('public'); let phaseFilter='', roundFilter='', teamFilter='', statusFilter='', playerTeamFilter='', standingsGroup='all';
  const FAVORITE_TEAM_KEY='new-generation-public-favorite-team-v1';
  let favoriteTeamId=loadFavoriteTeamId();
  const BRAND_LOGO='assets/brand/new-generation-logo-transparent.png';
  const PDF_COLORS={bg:[6,19,45],ink:[6,19,45],muted:[90,108,140],gold:[255,122,24],gold2:[255,255,255],paper:[247,251,255],line:[255,122,24]};
  const PUBLIC_ACTIVE_TAB_KEY='new-generation-public-active-tab-v1';
  const PUBLIC_FILTERS_KEY='new-generation-public-filter-state-v1';
  const PUBLIC_TABS=new Set(['home','teams','players','matches','bracket','articles','search']);
  const shareImageBusy=new Set();
  function safeSessionGet(key){try{return sessionStorage.getItem(key)||'';}catch(_){return '';}}
  function safeSessionSet(key,value){try{sessionStorage.setItem(key,value);}catch(_){}}
  function persistPublicFilters(){
    try{sessionStorage.setItem(PUBLIC_FILTERS_KEY,JSON.stringify({phaseFilter,roundFilter,teamFilter,statusFilter,playerTeamFilter,standingsGroup,search:$('#globalSearch')?.value||''}));}catch(_){}
  }
  function restorePublicFilters(){
    try{
      const raw=sessionStorage.getItem(PUBLIC_FILTERS_KEY);
      if(!raw)return;
      const data=JSON.parse(raw)||{};
      phaseFilter=String(data.phaseFilter||'');
      roundFilter=String(data.roundFilter||'');
      teamFilter=String(data.teamFilter||'');
      statusFilter=String(data.statusFilter||'');
      playerTeamFilter=String(data.playerTeamFilter||'');
      standingsGroup=String(data.standingsGroup||'all')||'all';
      const search=$('#globalSearch'); if(search&&data.search)search.value=String(data.search).slice(0,100);
    }catch(_){}
  }
  function activePublicTab(){
    const current=document.querySelector('.tab-panel.active')?.id||'';
    return PUBLIC_TABS.has(current)?current:'home';
  }
  function setPublicTab(tab,{persist=true,scroll=false}={}){
    const target=PUBLIC_TABS.has(tab)?tab:'home';
    try{document.body.classList.add('ng-interaction-lock');requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>document.body.classList.remove('ng-interaction-lock'),60)));}catch(_){ }
    UI.$$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===target));
    UI.$$('.tab-panel').forEach(x=>x.classList.toggle('active',x.id===target));
    if(persist) safeSessionSet(PUBLIC_ACTIVE_TAB_KEY,target);
    document.dispatchEvent(new CustomEvent('ng:tab-changed',{detail:{tab:target,restored:!persist}}));
    if(scroll) window.scrollTo({top:0,behavior:'auto'});
  }
  function restorePublicTab(){
    const saved=safeSessionGet(PUBLIC_ACTIVE_TAB_KEY);
    if(saved&&PUBLIC_TABS.has(saved)) setPublicTab(saved,{persist:false,scroll:false});
    else safeSessionSet(PUBLIC_ACTIVE_TAB_KEY,activePublicTab());
  }
  function save(){store.save('public',state);} 
  function loadFavoriteTeamId(){try{return localStorage.getItem(FAVORITE_TEAM_KEY)||'';}catch(_){return '';}}
  function persistFavoriteTeamId(){try{favoriteTeamId?localStorage.setItem(FAVORITE_TEAM_KEY,favoriteTeamId):localStorage.removeItem(FAVORITE_TEAM_KEY);}catch(_){}}
  function invalidateFavoriteDependentViews(){
    // La squadra preferita è stato locale, non fa parte dello stato torneo.
    // Per questo bisogna invalidare esplicitamente le cache di rendering,
    // altrimenti il pulsante "×" svuota il localStorage ma la dashboard resta uguale.
    _lastRenderFP='';
    _lastHomeFP='';
    _lastTeamsFingerprint='';
    if(statusFilter==='favorite'&&!favoriteTeamId) statusFilter='';
  }
  function sanitizeFavoriteTeam(){
    if(favoriteTeamId&&!store.getTeam(state,favoriteTeamId)){
      favoriteTeamId='';
      persistFavoriteTeamId();
      invalidateFavoriteDependentViews();
    }
  }
  function setFavoriteTeam(teamId){
    favoriteTeamId=teamId||'';
    persistFavoriteTeamId();
    invalidateFavoriteDependentViews();
    render({force:true});
  }
  function clearFavoriteTeam(){
    favoriteTeamId='';
    persistFavoriteTeamId();
    invalidateFavoriteDependentViews();
    render({force:true});
  }
  function isFavoriteTeam(teamId){return !!favoriteTeamId&&teamId===favoriteTeamId;}
  function favoriteButton(teamId,label='Segui squadra'){
    const fav=isFavoriteTeam(teamId);
    return `<button class="btn small favorite-team-btn ${fav?'active':''}" type="button" data-favorite-team="${UI.esc(teamId)}" aria-pressed="${fav?'true':'false'}">${fav?'★ Preferita':'☆ '+UI.esc(label)}</button>`;
  }
  function teamFilterOptions(selected){return '<option value="">Tutte le squadre</option>'+state.teams.map(t=>`<option value="${t.id}" ${t.id===selected?'selected':''}>${UI.esc(t.name)}</option>`).join('');}
  function localTodayIso(){const d=new Date();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${d.getFullYear()}-${m}-${day}`;}
  function isMatchPlayed(m){return store.hasScore(state,m)||m.status==='played';}
  function isTodayMatch(m){return !!m.date&&String(m.date)===localTodayIso();}
  function filteredMatches(){return state.matches.filter(m=>(!phaseFilter||m.phase===phaseFilter)&&(!roundFilter||m.round===roundFilter)&&(!teamFilter||m.homeTeamId===teamFilter||m.awayTeamId===teamFilter)&&(!statusFilter||statusFilter==='all'||(statusFilter==='played'&&isMatchPlayed(m))||(statusFilter==='pending'&&!isMatchPlayed(m))||(statusFilter==='today'&&isTodayMatch(m))||(statusFilter==='favorite'&&favoriteTeamId&&(m.homeTeamId===favoriteTeamId||m.awayTeamId===favoriteTeamId))));}
  function filteredPlayerStats(){let rows=store.selectors.playerStats(state);if(playerTeamFilter)return rows.filter(p=>p.teamId===playerTeamFilter);return rows.filter(p=>p.goals>0).slice(0,10);}
  function renderFilters(){const phases=store.selectors.phases(state);$('#publicPhaseFilter').innerHTML='<option value="">Tutte le fasi</option>'+phases.map(p=>`<option value="${p}" ${p===phaseFilter?'selected':''}>${UI.esc(store.PHASE_LABELS[p]||p)}</option>`).join('');const rounds=store.selectors.rounds(state);$('#publicRoundFilter').innerHTML='<option value="">Tutte le giornate/turni</option>'+rounds.map(r=>`<option value="${UI.esc(r)}" ${r===roundFilter?'selected':''}>${UI.esc(r)}</option>`).join('');$('#publicTeamFilter').innerHTML=teamFilterOptions(teamFilter);renderMatchFilterToolbar();}
  function activeFilterLabel(type){
    if(type==='phase')return phaseFilter?(store.PHASE_LABELS[phaseFilter]||phaseFilter):'Tutte le fasi';
    if(type==='round')return roundFilter||'Tutte le giornate';
    if(type==='team'){const t=teamFilter?store.getTeam(state,teamFilter):null;return t?t.name:'Tutte le squadre';}
    return '';
  }
  function renderMatchFilterToolbar(){
    const bar=$('#publicMatchFilterBar'); if(!bar)return;
    const count=filteredMatches().length;
    bar.innerHTML=`<div class="match-filter-buttons">
      <button class="filter-chip-btn ${phaseFilter?'active':''}" type="button" data-open-match-filter="phase"><span>Fase</span><strong>${UI.esc(activeFilterLabel('phase'))}</strong></button>
      <button class="filter-chip-btn ${roundFilter?'active':''}" type="button" data-open-match-filter="round"><span>Giornata</span><strong>${UI.esc(activeFilterLabel('round'))}</strong></button>
      <button class="filter-chip-btn ${teamFilter?'active':''}" type="button" data-open-match-filter="team"><span>Squadra</span><strong>${UI.esc(activeFilterLabel('team'))}</strong></button>
    </div><div class="match-filter-resultbar"><span>${count} ${count===1?'partita':'partite'}</span>${phaseFilter||roundFilter||teamFilter||statusFilter?'<button class="btn small" type="button" data-clear-match-filters>Reset filtri</button>':''}</div>`;
  }
  function ensureMatchFilterSheet(){
    let modal=$('#matchFilterSheet');
    if(modal)return modal;
    modal=document.createElement('div');modal.id='matchFilterSheet';modal.className='filter-sheet-modal';modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="filter-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="matchFilterTitle"><div class="filter-sheet-head"><div><span class="article-kicker">Filtra partite</span><h2 id="matchFilterTitle">Scegli filtro</h2></div><button class="btn danger small" type="button" data-close-match-filter>Chiudi</button></div><div id="matchFilterOptions" class="filter-sheet-options"></div></div>';
    document.body.appendChild(modal);return modal;
  }
  function openMatchFilterSheet(type){
    const modal=ensureMatchFilterSheet();const title=$('#matchFilterTitle');const box=$('#matchFilterOptions');
    const make=(value,label,active=false,icon='')=>`<button class="filter-option ${active?'active':''}" type="button" data-filter-type="${UI.esc(type)}" data-filter-value="${UI.esc(value)}"><span class="filter-option-media">${icon}</span><strong>${UI.esc(label)}</strong>${active?'<em>Attivo</em>':''}</button>`;
    let html='';
    if(type==='phase'){title.textContent='Scegli fase';html+=make('', 'Tutte le fasi', !phaseFilter, '<span class="filter-option-emoji">🏆</span>');store.selectors.phases(state).forEach(p=>html+=make(p,store.PHASE_LABELS[p]||p,p===phaseFilter,'<span class="filter-option-emoji">🏁</span>'));}
    if(type==='round'){title.textContent='Scegli giornata / turno';html+=make('', 'Tutte le giornate', !roundFilter, '<span class="filter-option-emoji">📅</span>');store.selectors.rounds(state).forEach(r=>html+=make(r,r,r===roundFilter,'<span class="filter-option-emoji">🗓️</span>'));}
    if(type==='team'){
      title.textContent='Scegli squadra';
      html+=make('', 'Tutte le squadre', !teamFilter, '<span class="filter-option-emoji">👥</span>');
      if(favoriteTeamId&&store.getTeam(state,favoriteTeamId)){
        const favTeam=store.getTeam(state,favoriteTeamId);
        html+=make(favoriteTeamId,'★ '+favTeam.name,teamFilter===favoriteTeamId,UI.logo(favTeam,false));
      }
      state.teams.forEach(t=>html+=make(t.id,t.name,t.id===teamFilter,UI.logo(t,false)));
    }
    box.innerHTML=html;modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');setTimeout(()=>modal.querySelector('.filter-option.active,.filter-option')?.focus(),0);
  }
  function closeMatchFilterSheet(){const modal=$('#matchFilterSheet');if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');scheduleDeferredArticleRender(460);}
  function setMatchFilter(type,value){if(type==='phase'){phaseFilter=value;roundFilter='';}else if(type==='round'){roundFilter=value;}else if(type==='team'){teamFilter=value;}persistPublicFilters();closeMatchFilterSheet();renderMatches();}
  function renderPlayerFilter(){const el=$('#publicPlayerTeamFilter');if(!el)return;if(playerTeamFilter&&!state.teams.some(t=>t.id===playerTeamFilter))playerTeamFilter='';el.innerHTML=teamFilterOptions(playerTeamFilter);}
  function favoriteTeamHomeMarkup(){
    const team=favoriteTeamId?store.getTeam(state,favoriteTeamId):null;
    if(!team){
      return `<div class="favorite-empty-card"><div><span class="article-kicker">Squadra preferita</span><h2>Scegli la tua squadra</h2><p class="muted">Salvala su questo dispositivo: la vedrai in evidenza in classifica, partite e tabellone.</p></div><button class="btn primary" type="button" data-open-teams-tab>Vai alle squadre</button></div>`;
    }
    const rec=teamRecord(team.id);
    const matches=(state.matches||[]).filter(m=>m.homeTeamId===team.id||m.awayTeamId===team.id);
    const last=matches.filter(m=>store.hasScore(state,m)||m.status==='played').slice(-1)[0];
    const next=matches.filter(m=>!(store.hasScore(state,m)||m.status==='played')).sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999'))||String(a.time||'99:99').localeCompare(String(b.time||'99:99')))[0];
    const compactMatch=m=>{if(!m)return '<span class="muted">Non disponibile</span>';const home=store.teamName(state,m.homeTeamId,m.homeLabel),away=store.teamName(state,m.awayTeamId,m.awayLabel);return `<strong>${UI.esc(home)} vs ${UI.esc(away)}</strong><small>${UI.esc(UI.fmtDate(m))} · ${UI.esc(m.field||'Campo da definire')}${store.hasScore(state,m)?' · '+UI.esc(store.scoreText(state,m)):''}</small>`;};
    return `<div class="favorite-team-dashboard">
      <div class="favorite-team-hero">${UI.logo(team,true)}<div><span class="article-kicker">La tua squadra</span><h2>${UI.esc(team.name)}</h2><p>${team.president?.name?`Presidente: ${UI.esc(team.president.name)}`:'Presidente non inserito'}${team.coach?.name?` · Allenatore: ${UI.esc(team.coach.name)}`:''}</p></div><button class="favorite-remove" type="button" data-clear-favorite aria-label="Rimuovi squadra preferita">×</button></div>
      <div class="favorite-kpis"><span><strong>${rec.points||0}</strong>Punti</span><span><strong>${rec.played||0}</strong>PG</span><span><strong>${rec.goalsFor||0}</strong>GF</span><span><strong>${rec.diff>0?'+':''}${rec.diff||0}</strong>DR</span></div>
      <div class="favorite-team-grid"><div><span>Prossima</span>${compactMatch(next)}</div><div><span>Ultima</span>${compactMatch(last)}</div></div>
      <div class="row-actions"><button class="btn primary" type="button" data-team-detail="${UI.esc(team.id)}">Apri scheda</button><button class="btn" type="button" data-filter-favorite-matches="${UI.esc(team.id)}">Mostra partite</button></div>
    </div>`;
  }
  function renderFavoriteHome(){
    const grid=$('#home .grid'); if(!grid)return;
    let slot=$('#favoriteTeamHome');
    if(!slot){slot=document.createElement('article');slot.id='favoriteTeamHome';slot.className='card pad span-12 favorite-team-home';grid.prepend(slot);}
    slot.innerHTML=favoriteTeamHomeMarkup();
  }

  function liveMatchesHomeMarkup(){
    const live=(state.matches||[]).filter(m=>m.status==='live'&&m.homeTeamId&&m.awayTeamId);
    if(!live.length)return '';
    return `<div class="live-strip-head"><span class="live-strip-dot" aria-hidden="true"></span><h2>Partite in corso</h2><span class="muted">Aggiornamento automatico in tempo reale</span></div>
      <div class="live-strip-grid">${live.map(m=>{
        const homeT=store.getTeam(state,m.homeTeamId), awayT=store.getTeam(state,m.awayTeamId);
        const home=store.teamName(state,m.homeTeamId,m.homeLabel), away=store.teamName(state,m.awayTeamId,m.awayLabel);
        const sc=store.matchGoals(state,m);
        return `<article class="live-strip-card is-live-card" data-match-detail="${UI.esc(m.id)}" role="button" tabindex="0">
          <div class="live-strip-meta"><span class="score-badge match-status-badge is-live">🔴 Live</span><small>${UI.esc(store.PHASE_LABELS[m.phase]||m.phase)} · ${UI.esc(m.round)}</small></div>
          <div class="live-strip-teams">
            <div class="live-strip-team">${UI.logo(homeT,false)}<strong>${UI.esc(home)}</strong></div>
            <div class="live-strip-score">${sc.home} - ${sc.away}</div>
            <div class="live-strip-team">${UI.logo(awayT,false)}<strong>${UI.esc(away)}</strong></div>
          </div>
          <div class="live-strip-footer"><small>📍 ${UI.esc(m.field||'Campo')}</small><small>🕒 ${UI.esc(UI.fmtDate(m))}</small></div>
        </article>`;
      }).join('')}</div>`;
  }
  let _lastLiveHomeHtml = '';
  function renderLiveHome(){
    const grid=$('#home .grid'); if(!grid)return;
    let slot=$('#liveStripHome');
    const html=liveMatchesHomeMarkup();
    if(!html){
      if(slot){slot.remove();_lastLiveHomeHtml='';}
      return;
    }
    if(!slot){
      slot=document.createElement('article');
      slot.id='liveStripHome';
      slot.className='card pad span-12 live-strip-home';
      grid.prepend(slot);
    }
    // Aggiorna il DOM solo se il markup è diverso: evita riflow inutili
    if(html !== _lastLiveHomeHtml){
      slot.innerHTML=html;
      _lastLiveHomeHtml=html;
    }
  }
  function publicMainStandingsRows(opts={includeLive:true}){
    if(state.rules?.format==='league_knockout')return store.selectors.calculateStandings(state,'league',opts);
    return store.selectors.calculateStandings(state,undefined,opts);
  }
  function decorateFavoriteUI(){
    sanitizeFavoriteTeam();
    document.querySelectorAll('.is-favorite-team,.is-favorite-match').forEach(el=>el.classList.remove('is-favorite-team','is-favorite-match'));
    if(!favoriteTeamId)return;
    document.querySelectorAll(`[data-team-detail="${CSS.escape(favoriteTeamId)}"], [data-team-id="${CSS.escape(favoriteTeamId)}"]`).forEach(el=>el.classList.add('is-favorite-team'));
    document.querySelectorAll('[data-match-detail]').forEach(el=>{const m=state.matches.find(x=>x.id===el.dataset.matchDetail);if(m&&(m.homeTeamId===favoriteTeamId||m.awayTeamId===favoriteTeamId))el.classList.add('is-favorite-match');});
  }
  var _lastHomeFP="";
  function renderHome(){
    var hfp=store.deriveFingerprint(state)+"|"+standingsGroup+"|favorite:"+(favoriteTeamId||'');
    if(hfp===_lastHomeFP){decorateFavoriteUI();return;}
    _lastHomeFP=hfp;document.title=UI.siteTitle?UI.siteTitle(state):(state.rules.name||'New Generation');const titleEl=$('#publicTitle');if(titleEl)titleEl.textContent=state.rules.name||'New Generation';const summaryEl=$('#publicSummary');if(summaryEl)summaryEl.innerHTML=UI.rulesSummary(state);const statsEl=$('#publicStats');if(statsEl)statsEl.innerHTML=UI.statsGrid(store.selectors.stats(state));renderLiveHome();renderFavoriteHome();const standingsMenu=$('#publicStandingsMenu');if(standingsMenu)standingsMenu.innerHTML=store.selectors.hasGroupStage(state)?UI.groupStandingsSelector(state,standingsGroup,'publicGroupStandingsFilter'):'';$('#publicStandings').innerHTML=store.selectors.hasGroupStage(state)?UI.groupStandingsTables(state,standingsGroup,{includeLive:true}):UI.standingsTable(publicMainStandingsRows({includeLive:true}),state);$('#publicPlayersMini').innerHTML=UI.playerStatsTable(store.selectors.playerStats(state).filter(p=>p.goals>0).slice(0,10));decorateFavoriteUI();renderShareActions();}
  var _lastTeamsFingerprint="";
  function renderTeams(){
    var container=$("#publicTeams");
    if(!container)return;
    var fp=JSON.stringify((state.teams||[]).map(function(t){
      return [t.id,t.name,t.logo||"",
        (t.players||[]).map(function(p){return (p.name||"")+(p.birthYear||"")+(p.number||"");}).join(","),
        (t.president&&t.president.name)||"",(t.coach&&t.coach.name)||""];
    }))+"|favorite:"+(favoriteTeamId||'');
    if(fp===_lastTeamsFingerprint){decorateFavoriteUI();return;}
    _lastTeamsFingerprint=fp;
    var openId=(container.querySelector("details.ng-disclosure[open]")||{}).dataset&&
               container.querySelector("details.ng-disclosure[open]").dataset.teamId||"";
    container.classList.add("ng-teams-restoring");
    container.innerHTML=UI.teamGrid(state).replaceAll('data-favorite-placeholder="','data-favorite-team="');
    if(openId){
      var el=container.querySelector("details.ng-disclosure[data-team-id=\""+CSS.escape(openId)+"\"]");
      if(el)el.setAttribute("open","");
    }
    requestAnimationFrame(function(){container.classList.remove("ng-teams-restoring");});
    decorateFavoriteUI();
  }
  function renderPlayers(){ resetFiltersForNewState(); persistPublicFilters(); renderPlayerFilter(); $('#publicPlayers').innerHTML=UI.playerStatsTable(filteredPlayerStats()); }
  function renderPublicMatchCenter(){const slot=document.getElementById('publicMatchCenter');if(slot)slot.remove();}
  function renderMatches(){const slot=document.getElementById('publicMatchCenter');if(slot)slot.remove();resetFiltersForNewState();persistPublicFilters();renderFilters();$('#publicMatches').innerHTML=UI.matchList(state,filteredMatches(),true);decorateFavoriteUI();}
  function renderBracket(){const el=$('#publicBracket');if(el)el.innerHTML=UI.bracketMarkup(state);decorateFavoriteUI();renderShareActions();}
  let _lastArticlesFP='';
  let _deferredArticleRender=false;
  let _articleRenderTimer=0;

  function articleRecordFingerprint(a){
    try{
      const img=String(a?.image||'');
      return JSON.stringify([
        a?.id||'',a?.title||'',a?.body||'',a?.createdAt||'',a?.updatedAt||'',
        img.length,img.slice(0,40),img.slice(-40)
      ]);
    }catch(_){return String(Date.now());}
  }
  function articleListFingerprint(list){
    try{return JSON.stringify((list||[]).map(articleRecordFingerprint));}
    catch(_){return String(Date.now());}
  }
  function isArticleModalOpen(){return !!$('#articleModal')?.classList.contains('open');}
  function isAnyOverlayOpen(){
    return Boolean(
      $('#articleModal')?.classList.contains('open') ||
      $('#matchModal')?.classList.contains('open') ||
      $('#teamModal')?.classList.contains('open') ||
      $('#matchFilterSheet')?.classList.contains('open') ||
      document.body.classList.contains('mobile-nav-open')
    );
  }
  function isArticlesPanelActive(){return !!$('#articles')?.classList.contains('active');}
  function withQuietRender(fn){
    document.body.classList.add('ng-quiet-render');
    try{fn();}
    finally{
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        window.setTimeout(()=>document.body.classList.remove('ng-quiet-render'),40);
      }));
    }
  }
  function refreshLoadedArticleImages(root){
    (root||document).querySelectorAll('img.article-image').forEach(img=>{
      if(!img.complete || !img.naturalWidth || !img.naturalHeight)return;
      const media=img.closest('.article-media');
      media?.classList.add('image-ready');
      if(img.naturalHeight>img.naturalWidth){
        img.classList.add('is-portrait');
        media?.classList.add('has-portrait');
      }
    });
  }
  function patchArticleCardFingerprints(root,list){
    const cards=Array.from(root.querySelectorAll('[data-article-id]'));
    cards.forEach(card=>{
      const article=(list||[]).find(a=>String(a.id)===String(card.dataset.articleId));
      if(article)card.dataset.articleFp=articleRecordFingerprint(article);
    });
  }
  function renderArticlesDom(el,list){
    const active=document.activeElement;
    const activeId=active?.closest?.('[data-article-id]')?.dataset?.articleId||'';
    const template=document.createElement('template');
    template.innerHTML=UI.articleList(list,false).trim();
    patchArticleCardFingerprints(template.content,list);
    const nextList=template.content.firstElementChild;
    const currentList=el.querySelector('.article-list');

    if(!currentList || !nextList || currentList.className!==nextList.className){
      withQuietRender(()=>{ el.replaceChildren(template.content); });
      refreshLoadedArticleImages(el);
    }else{
      const currentById=new Map(Array.from(currentList.children).map(node=>[String(node.dataset.articleId||''),node]));
      const frag=document.createDocumentFragment();
      Array.from(nextList.children).forEach(nextCard=>{
        const id=String(nextCard.dataset.articleId||'');
        const current=currentById.get(id);
        if(current && current.dataset.articleFp===nextCard.dataset.articleFp){
          currentById.delete(id);
          frag.appendChild(current);
        }else{
          frag.appendChild(nextCard);
        }
      });
      withQuietRender(()=>{ currentList.replaceChildren(frag); });
      refreshLoadedArticleImages(currentList);
    }
    el.dataset.rendered='1';
    if(activeId){
      const restored=el.querySelector(`[data-article-id="${CSS.escape(activeId)}"]`);
      restored?.focus?.({preventScroll:true});
    }
  }
  function scheduleDeferredArticleRender(delay=420){
    if(!_deferredArticleRender)return;
    window.clearTimeout(_articleRenderTimer);
    _articleRenderTimer=window.setTimeout(()=>{
      if(isAnyOverlayOpen())return scheduleDeferredArticleRender(delay);
      _deferredArticleRender=false;
      renderArticles(false);
    },delay);
  }
  function renderArticles(force=false){
    const el=$('#publicArticles');
    if(!el)return;
    const list=store.selectors.articles(state);
    const fp=articleListFingerprint(list);
    if(!isArticlesPanelActive() && el.dataset.rendered==='1' && !force){
      // Se l'utente non è nella tab Articoli, non tocchiamo la lista in background.
      // Verrà aggiornata appena la tab torna attiva.
      return;
    }
    if(!isArticlesPanelActive() && el.dataset.rendered!=='1' && !force)return;
    if(!force && fp===_lastArticlesFP && el.dataset.rendered==='1')return;
    // Non tocchiamo la DOM della lista mentre un modal/sheet è aperto. Il re-render
    // della lista sotto a un overlay è la causa tipica del flicker quando si chiude.
    if(isAnyOverlayOpen() && el.dataset.rendered==='1'){
      _deferredArticleRender=true;
      return;
    }
    renderArticlesDom(el,list);
    _lastArticlesFP=fp;
  }


  function setRgb(doc,method,c){doc[method](c[0],c[1],c[2]);}
  function slug(v){return String(v||'scheda-squadra').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'scheda-squadra';}
  async function dataUrlFromImage(src){
    if(!src) return '';
    if(String(src).startsWith('data:')) return src;
    return new Promise(resolve=>{
      const img=new Image(); img.crossOrigin='anonymous';
      img.onload=()=>{try{const canvas=document.createElement('canvas');const max=768;const ratio=Math.min(1,max/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/png'));}catch(_){resolve('');}};
      img.onerror=()=>resolve(''); img.src=src;
    });
  }
  // Canvas quadrato letterboxed: proporzioni preservate, logo distante dal bordo.
  function dataUrlFromImageContained(src, boxSize){
    boxSize = boxSize || 400;
    if(!src) return Promise.resolve("");
    return new Promise(function(resolve){
      function render(img){
        try{
          var c = document.createElement("canvas");
          c.width = boxSize; c.height = boxSize;
          var ctx = c.getContext("2d");
          ctx.clearRect(0, 0, boxSize, boxSize);
          var pad = Math.round(boxSize * 0.08);
          var inner = boxSize - pad * 2;
          var nw = img.naturalWidth || img.width || 1;
          var nh = img.naturalHeight || img.height || 1;
          var ar = nw / nh;
          var dw = ar >= 1 ? inner : inner * ar;
          var dh = ar >= 1 ? inner / ar : inner;
          ctx.drawImage(img, pad + (inner - dw)/2, pad + (inner - dh)/2, dw, dh);
          resolve(c.toDataURL("image/png"));
        } catch(e){ resolve(""); }
      }
      if(String(src).startsWith("data:")){
        var img = new Image();
        img.onload = function(){ render(img); };
        img.onerror = function(){ resolve(""); };
        img.src = src;
      } else {
        var img2 = new Image(); img2.crossOrigin = "anonymous";
        img2.onload = function(){ render(img2); };
        img2.onerror = function(){ resolve(""); };
        img2.src = src;
      }
    });
  }
  function drawPdfLogo(doc,src,x,y,size,fallback='NG'){
    if(src){try{doc.addImage(src,'PNG',x,y,size,size,undefined,'FAST');return;}catch(_){}}
    setRgb(doc,'setFillColor',PDF_COLORS.gold);doc.roundedRect(x,y,size,size,5,5,'F');setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(Math.max(8,size*.28));doc.text(String(fallback||'NG').slice(0,2).toUpperCase(),x+size/2,y+size*.6,{align:'center'});
  }
  function addTeamPdfFooter(doc){
    const pages=doc.internal.getNumberOfPages();
    for(let i=1;i<=pages;i++){doc.setPage(i);const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();setRgb(doc,'setDrawColor',PDF_COLORS.gold);doc.setLineWidth(.25);doc.line(14,h-13,w-14,h-13);setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(`Pagina ${i}/${pages}`,w-14,h-8,{align:'right'});doc.text('Scheda squadra generata dalla pagina pubblica',14,h-8);}
  }
  function emptyTeamPhaseRow(teamId,label='Statistiche'){return {teamId,label,played:0,points:0,goalsFor:0,goalsAgainst:0,diff:0,wins:0,draws:0,losses:0,status:'empty'};}
  function rowWithMeta(row,label,key,type='stage'){const r={...emptyTeamPhaseRow(row?.teamId||'',label),...(row||{})};r.label=label;r.key=key||label;r.type=type;r.diff=(Number(r.goalsFor)||0)-(Number(r.goalsAgainst)||0);r.status=r.played?'played':'empty';return r;}
  function teamBaseRecordForState(s,teamId){
    const format=s.rules?.format||'';
    if(store.selectors.hasGroupStage(s)){
      const g=(store.selectors.groupedStandings(s)||[]).find(x=>(x.rows||[]).some(r=>r.teamId===teamId));
      const row=g?.rows?.find(r=>r.teamId===teamId);
      if(row)return rowWithMeta(row,`Fase gironi${g?.name?' · '+g.name:''}`,'base-group','base');
    }
    if(format==='league'||format==='league_knockout'){
      const row=(store.selectors.calculateStandings(s,'league')||[]).find(r=>r.teamId===teamId);
      if(row)return rowWithMeta(row,format==='league_knockout'?'Classifica unica':'Campionato','base-league','base');
    }
    if(format==='knockout'){
      return teamStatsFromMatches(s,teamId,(s.matches||[]).filter(m=>store.isKnockoutPhase?store.isKnockoutPhase(m):m.phase==='knockout'),'Eliminazione diretta','base-knockout','base');
    }
    const row=(store.selectors.calculateStandings(s)||[]).find(r=>r.teamId===teamId);
    return rowWithMeta(row||emptyTeamPhaseRow(teamId,'Totale'),'Totale','base-total','base');
  }
  function teamStatsForPdf(s,teamId){return teamBaseRecordForState(s,teamId);}
  function teamPhaseStatsForState(s,teamId){
    const phases=[]; const format=s.rules?.format||'';
    if(format==='league'||format==='league_knockout'){const row=(store.selectors.calculateStandings(s,'league')||[]).find(r=>r.teamId===teamId);phases.push(rowWithMeta(row||emptyTeamPhaseRow(teamId),format==='league_knockout'?'Classifica unica':'Campionato','league','primary'));}
    if(store.selectors.hasGroupStage(s)){const groups=store.selectors.groupedStandings(s)||[];const g=groups.find(x=>(x.rows||[]).some(r=>r.teamId===teamId));const row=g?.rows?.find(r=>r.teamId===teamId);phases.push(rowWithMeta(row||emptyTeamPhaseRow(teamId),`Fase gironi${g?.name?' · '+g.name:''}`,'group','primary'));}
    const koMatches=(s.matches||[]).filter(m=>m.phase!=='league'&&m.phase!=='group'&&(m.homeTeamId===teamId||m.awayTeamId===teamId));
    const buckets=new Map();
    koMatches.forEach(m=>{const label=m.bracketName||store.PHASE_LABELS[m.phase]||'Eliminazione diretta';const key=`${m.phase}|${label}`;if(!buckets.has(key))buckets.set(key,{label,matches:[]});buckets.get(key).matches.push(m);});
    [...buckets.entries()].forEach(([key,b])=>phases.push(teamStatsFromMatches(s,teamId,b.matches,b.label,key,'knockout')));
    if(!phases.length)phases.push(rowWithMeta(emptyTeamPhaseRow(teamId),'Statistiche','empty','primary'));
    return phases;
  }
  function teamStatsFromMatches(s,teamId,matches,label,key,type='stage'){
    const row=emptyTeamPhaseRow(teamId,label); row.key=key||label; row.type=type; row.status='empty';
    (matches||[]).forEach(m=>{
      if(!(m.homeTeamId===teamId||m.awayTeamId===teamId))return;
      if(!store.hasScore(s,m))return;
      const sc=store.matchGoals(s,m);
      const gf=m.homeTeamId===teamId?sc.home:sc.away;
      const ga=m.homeTeamId===teamId?sc.away:sc.home;
      row.played++; row.goalsFor+=gf; row.goalsAgainst+=ga;
      if(gf>ga){row.points+=3;row.wins++;}
      else if(gf<ga){row.losses++;}
      else {row.points+=1;row.draws++;}
    });
    row.diff=row.goalsFor-row.goalsAgainst; row.status=row.played?'played':'empty'; return row;
  }
  function teamPhaseStats(teamId){return teamPhaseStatsForState(state,teamId);}
  function phaseStatsMarkup(teamId){
    const phases=teamPhaseStats(teamId);
    return `<section class="team-sheet-panel team-phase-panel"><div class="team-phase-head"><div><h3>Statistiche per fase</h3><p>Le statistiche sono separate: il tabellone non modifica classifica gironi/campionato.</p></div><span class="pill">${phases.length} sezioni</span></div><div class="team-phase-grid">${phases.map((r,i)=>`
      <article class="team-phase-card ${r.type==='primary'||i===0?'is-primary':''}">
        <div class="team-phase-card-head"><strong>${UI.esc(r.label)}</strong><small>${r.status==='played'?'Consolidata':'In attesa di risultati'}</small></div>
        <div class="phase-kpi-row"><span><b>${Number(r.points)||0}</b><em>Pt</em></span><span><b>${Number(r.played)||0}</b><em>PG</em></span><span><b>${Number(r.goalsFor)||0}</b><em>GF</em></span><span><b>${Number(r.goalsAgainst)||0}</b><em>GS</em></span><span><b>${(Number(r.diff)||0)>0?'+':''}${Number(r.diff)||0}</b><em>DR</em></span></div>
        <div class="phase-mini-row"><span>V ${Number(r.wins)||0}</span><span>N ${Number(r.draws)||0}</span><span>P ${Number(r.losses)||0}</span></div>
      </article>`).join('')}</div></section>`;
  }
  function nonKnockoutMatchesForTeam(s,teamId){
    return (s.matches||[]).filter(m=>!(store.isKnockoutPhase?store.isKnockoutPhase(m):m.phase==='knockout')&&(m.homeTeamId===teamId||m.awayTeamId===teamId)).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||''))||((a.roundIndex||0)-(b.roundIndex||0)));
  }
  async function downloadTeamPdf(teamId){
    const team=store.getTeam(state,teamId); if(!team) return;
    if(!window.jspdf||!window.jspdf.jsPDF){alert('Librerie PDF non disponibili. Controlla la connessione e riprova.');return;}
    const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation:'p',unit:'mm',format:'a4',compress:true});
    const brandLogo=await dataUrlFromImageContained(BRAND_LOGO,300); const teamLogo=await dataUrlFromImageContained(team.logo,300);
    const w=doc.internal.pageSize.getWidth();
    setRgb(doc,'setFillColor',PDF_COLORS.bg);doc.rect(0,0,w,48,'F');drawPdfLogo(doc,brandLogo,w/2-13,7,26,state.rules?.name||'NG');
    setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(String(state.rules?.name||'New Generation').toUpperCase(),w/2,39,{align:'center'});
    setRgb(doc,'setFillColor',PDF_COLORS.paper);doc.roundedRect(12,55,w-24,44,8,8,'F');drawPdfLogo(doc,teamLogo,20,62,28,team.name);
    setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(22);doc.text(String(team.name||'Squadra'),55,74,{maxWidth:w-70});
    const staffLine=[team.president?.name?`Presidente: ${team.president.name}`:'',team.coach?.name?`Allenatore: ${team.coach.name}`:''].filter(Boolean).join('  ·  ');
    if(staffLine){doc.setFont('helvetica','normal');doc.setFontSize(9);setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.text(staffLine,55,83,{maxWidth:w-70});}
    const st=teamStatsForPdf(state,teamId);
    const chips=[['Punti',st.points],['PG',st.played],['GF',st.goalsFor],['GS',st.goalsAgainst],['DR',(st.diff>0?'+':'')+st.diff]];
    chips.forEach((c,i)=>{const x=20+i*34,y=106;setRgb(doc,'setFillColor',[247,251,255]);setRgb(doc,'setDrawColor',PDF_COLORS.line);doc.roundedRect(x,y,28,17,4,4,'FD');setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFontSize(6.8);doc.text(c[0],x+14,y+5,{align:'center'});setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(String(c[1]),x+14,y+12,{align:'center'});});
    if(doc.autoTable){
      let y=132;
      const phaseRows=teamPhaseStatsForState(state,teamId).map(r=>[r.label,String(r.points||0),String(r.played||0),String(r.goalsFor||0),String(r.goalsAgainst||0),`${(Number(r.diff)||0)>0?'+':''}${Number(r.diff)||0}`,`${Number(r.wins)||0}-${Number(r.draws)||0}-${Number(r.losses)||0}`]);
      doc.autoTable({startY:y,head:[['Statistiche per fase','Pt','PG','GF','GS','DR','V-N-P']],body:phaseRows,styles:{font:'helvetica',fontSize:7.6,cellPadding:2.2,textColor:PDF_COLORS.ink,lineColor:PDF_COLORS.line,lineWidth:.1},headStyles:{fillColor:PDF_COLORS.ink,textColor:PDF_COLORS.gold2,fontStyle:'bold'},alternateRowStyles:{fillColor:[247,251,255]},columnStyles:{0:{cellWidth:70,fontStyle:'bold'},1:{halign:'center'},2:{halign:'center'},3:{halign:'center'},4:{halign:'center'},5:{halign:'center'},6:{halign:'center'}}});
      y=(doc.lastAutoTable?.finalY||y)+8; if(y>220){doc.addPage();y=20;}
      const staffRows=[team.president?.name?['Presidente',team.president.name]:null,team.coach?.name?['Allenatore',team.coach.name]:null].filter(Boolean);
      if(staffRows.length){doc.autoTable({startY:y,head:[['Staff','Nome e cognome']],body:staffRows,styles:{font:'helvetica',fontSize:8,cellPadding:2.4,textColor:PDF_COLORS.ink,lineColor:PDF_COLORS.line,lineWidth:.1},headStyles:{fillColor:PDF_COLORS.ink,textColor:PDF_COLORS.gold2,fontStyle:'bold'},alternateRowStyles:{fillColor:[247,251,255]},columnStyles:{0:{cellWidth:38,fontStyle:'bold'},1:{cellWidth:130,fontStyle:'bold'}}});y=(doc.lastAutoTable?.finalY||y)+8;if(y>220){doc.addPage();y=20;}}
      const playerStats=store.selectors.playerStats(state).filter(p=>p.teamId===teamId).sort((a,b)=>b.goals-a.goals||b.played-a.played||a.name.localeCompare(b.name,'it'));
      doc.autoTable({startY:y,head:[['Giocatore','PG','Gol','Gialli','Rossi']],body:playerStats.length?playerStats.map(p=>[p.name,String(p.played||0),String(p.goals||0),String(p.yellow||0),String(p.red||0)]):[['Roster non inserito','-','-','-','-']],styles:{font:'helvetica',fontSize:8,cellPadding:2.4,textColor:PDF_COLORS.ink,lineColor:PDF_COLORS.line,lineWidth:.1},headStyles:{fillColor:PDF_COLORS.ink,textColor:PDF_COLORS.gold2,fontStyle:'bold'},alternateRowStyles:{fillColor:[247,251,255]},columnStyles:{0:{cellWidth:104,fontStyle:'bold'},1:{halign:'center'},2:{halign:'center',fontStyle:'bold'},3:{halign:'center'},4:{halign:'center'}}});
      y=(doc.lastAutoTable?.finalY||y)+10; if(y>215){doc.addPage();y=20;}
      const allTeamMatches=(state.matches||[]).filter(m=>m.homeTeamId===teamId||m.awayTeamId===teamId).sort((a,b)=>String(a.phase||'').localeCompare(String(b.phase||''))||((a.roundIndex||0)-(b.roundIndex||0))||String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||'')));
      const matchRows=allTeamMatches.map(m=>{const isHome=m.homeTeamId===teamId;const other=store.teamName(state,isHome?m.awayTeamId:m.homeTeamId,isHome?m.awayLabel:m.homeLabel);return [store.PHASE_LABELS[m.phase]||m.bracketName||m.phase||'-',`${m.round||'-'} · ${isHome?'Casa':'Trasferta'}`,other,UI.fmtDate(m),m.field||'Campo da definire',store.hasScore(state,m)?store.scoreText(state,m):'Da giocare'];});
      doc.autoTable({startY:y,head:[['Fase','Turno','Avversaria','Data','Campo','Risultato']],body:matchRows.length?matchRows:[['Nessuna partita disponibile','-','-','-','-','-']],styles:{font:'helvetica',fontSize:7.2,cellPadding:2.1,textColor:PDF_COLORS.ink,lineColor:PDF_COLORS.line,lineWidth:.1,overflow:'linebreak'},headStyles:{fillColor:PDF_COLORS.ink,textColor:PDF_COLORS.gold2,fontStyle:'bold'},alternateRowStyles:{fillColor:[247,251,255]},columnStyles:{0:{cellWidth:34,fontStyle:'bold'},1:{cellWidth:34},2:{cellWidth:44,fontStyle:'bold'},3:{cellWidth:36},4:{cellWidth:30},5:{cellWidth:24,halign:'center',fontStyle:'bold'}}});
    }
    addTeamPdfFooter(doc); doc.save(`${slug(state.rules?.name)}-${slug(team.name)}-scheda-squadra.pdf`);
  }

  let lastTeamTrigger=null;
  function teamRecord(teamId){
    // Record principale della scheda: per i format multi-fase resta legato
    // alla fase qualificante (gironi/campionato), così i KO non alterano
    // mai classifica e riepilogo base.
    return teamBaseRecordForState(state,teamId)||{played:0,points:0,goalsFor:0,goalsAgainst:0,diff:0};
  }
  function teamLastMatches(teamId){
    const live=(state.matches||[]).filter(m=>(m.homeTeamId===teamId||m.awayTeamId===teamId)&&m.status==='live');
    const played=(state.matches||[]).filter(m=>(m.homeTeamId===teamId||m.awayTeamId===teamId)&&store.hasScore(state,m)).slice(-5).reverse();
    // Mostra prima le live, poi le giocate, max 5 totale (le live hanno priorità di visualizzazione)
    return [...live, ...played].slice(0, Math.max(5, live.length));
  }
  function ensureTeamModal(){
    let modal=$('#teamModal');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.className='modal team-modal';
    modal.id='teamModal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','teamModalTitle');
    modal.innerHTML=`<div class="modal-content team-modal-content"><div class="team-modal-toolbar"><div><span class="article-kicker">Scheda squadra</span><h2 id="teamModalTitle">Squadra</h2></div><button class="btn danger" id="closeTeamModal" type="button">Chiudi</button></div><div id="teamModalBody"></div></div>`;
    document.body.appendChild(modal);
    return modal;
  }
  function closeTeamModal(){const modal=$('#teamModal');if(!modal)return;modal.classList.remove('open');document.body.classList.remove('modal-open');scheduleDeferredArticleRender(460);if(lastTeamTrigger&&document.contains(lastTeamTrigger))lastTeamTrigger.focus?.();}
  function teamDetailMarkup(team){
    const rec=teamRecord(team.id);
    const playerStats=store.selectors.playerStats(state).filter(p=>p.teamId===team.id);
    const topPlayers=playerStats.slice().sort((a,b)=>b.goals-a.goals||b.played-a.played||a.name.localeCompare(b.name)).slice(0,6);
    // Ordina roster per numero maglia (vuoti in fondo)
    const sortedRoster=[...(team.players||[])].sort((a,b)=>{
      const an=a.number===''||a.number==null?9999:Number(a.number);
      const bn=b.number===''||b.number==null?9999:Number(b.number);
      if(an!==bn)return an-bn;
      return String(a.name||'').localeCompare(String(b.name||''),'it');
    });
    const roster=sortedRoster.map(p=>{
      const st=playerStats.find(x=>x.playerId===p.id)||{played:0,goals:0,yellow:0,red:0};
      const numBadge=p.number!==''&&p.number!=null
        ? `<span class="jersey-number small">${UI.esc(String(p.number))}</span>`
        : `<span class="jersey-number small empty">—</span>`;
      return `<li class="roster-li-with-num"><span class="roster-num-col">${numBadge}</span><span class="roster-name-col"><strong>${UI.esc(p.name)}</strong><span class="roster-meta">PG ${st.played} · Gol ${st.goals} · 🟨 ${st.yellow||0} · 🟥 ${st.red||0}</span></span></li>`;
    }).join('')||'<li class="muted">Roster non inserito</li>';
    const form=teamLastMatches(team.id).map(m=>{
      const isHome=m.homeTeamId===team.id;
      const opp=store.teamName(state,isHome?m.awayTeamId:m.homeTeamId,isHome?m.awayLabel:m.homeLabel);
      const isLiveM=m.status==='live';
      const scoreCell=isLiveM
        ? `<em class="team-form-live">🔴 LIVE ${store.matchGoals(state,m).home}-${store.matchGoals(state,m).away}</em>`
        : `<em>${UI.esc(store.scoreText(state,m))}</em>`;
      return `<div class="team-form-row ${isLiveM?'is-live-row':''}"><span>${UI.esc(m.round||'Turno')}</span><strong>${UI.esc(opp)}</strong>${scoreCell}</div>`;
    }).join('')||'<div class="empty small">Nessuna partita disputata.</div>';
    return `<section class="pro-team-sheet">
      <div class="pro-team-hero">
        <div class="pro-team-logo">${UI.logo(team,true)}</div>
        <div class="pro-team-title"><span class="pill">${rec.played?`PG ${rec.played}`:'Squadra'}</span><h2>${UI.esc(team.name)}</h2>${[team.president?.name?`Presidente: ${UI.esc(team.president.name)}`:'',team.coach?.name?`Allenatore: ${UI.esc(team.coach.name)}`:''].filter(Boolean).length?`<p>${[team.president?.name?`Presidente: ${UI.esc(team.president.name)}`:'',team.coach?.name?`Allenatore: ${UI.esc(team.coach.name)}`:''].filter(Boolean).join(' · ')}</p>`:''}<div class="favorite-hero-action">${favoriteButton(team.id,'Segui')}</div></div>
      </div>
      <div class="team-sheet-kpis">
        <div><strong>${rec.points||0}</strong><span>Punti</span></div><div><strong>${rec.goalsFor||0}</strong><span>Gol fatti</span></div><div><strong>${rec.goalsAgainst||0}</strong><span>Gol subiti</span></div><div><strong>${rec.diff>0?'+':''}${rec.diff||0}</strong><span>Diff.</span></div>
      </div>
      ${phaseStatsMarkup(team.id)}
      <div class="team-sheet-grid">
        ${(team.president?.name||team.coach?.name)?`<section class="team-sheet-panel"><h3>Composizione tecnica</h3><div class="staff-cards">${team.president?.name?`<div><span>Presidente</span><strong>${UI.esc(team.president.name)}</strong><small>Staff squadra</small></div>`:''}${team.coach?.name?`<div><span>Allenatore</span><strong>${UI.esc(team.coach.name)}</strong><small>Ruolo tecnico</small></div>`:''}</div></section>`:''}
        <section class="team-sheet-panel"><h3>Top giocatori</h3>${topPlayers.length?topPlayers.map(p=>`<div class="team-leader-row"><strong>${UI.esc(p.name)}</strong><span>Gol ${p.goals} · PG ${p.played} · 🟨 ${p.yellow||0} · 🟥 ${p.red||0}</span></div>`).join(''):'<div class="empty small">Nessuna statistica.</div>'}</section>
        <section class="team-sheet-panel roster-panel"><h3>Roster</h3><ul class="roster-clean-list team-detail-roster">${roster}</ul></section>
        <section class="team-sheet-panel"><h3>Ultime partite</h3>${form}</section>
      </div>
      <div class="row-actions margin-top"><button class="btn primary" data-team-pdf="${UI.esc(team.id)}" type="button">Scarica scheda PDF</button></div>
    </section>`;
  }
  function showTeamDetail(teamId,trigger=null){
    const team=store.getTeam(state,teamId);if(!team)return;
    lastTeamTrigger=trigger;
    const modal=ensureTeamModal();
    $('#teamModalTitle').textContent=team.name;
    $('#teamModalBody').innerHTML=teamDetailMarkup(team);
    modal.classList.add('open');document.body.classList.add('modal-open');setTimeout(()=>$('#closeTeamModal')?.focus(),0);
  }

  function renderSearch(){const q=($('#globalSearch').value||'').trim().toLowerCase();const box=$('#searchResults');if(!q){box.innerHTML='<div class="empty">Scrivi per cercare squadre, giocatori o partite.</div>';return;}const teams=state.teams.filter(t=>t.name.toLowerCase().includes(q)).map(t=>`<div class="team-row search-team-result" data-team-id="${UI.esc(t.id)}">${UI.logo(t)}<div><strong>${UI.esc(t.name)}</strong><p class="muted">${t.players.length} calciatori${t.president?.name?` · Presidente: ${UI.esc(t.president.name)}`:''}${t.coach?.name?` · Allenatore: ${UI.esc(t.coach.name)}`:''}</p></div><div class="row-actions">${favoriteButton(t.id,'Segui')}<button class="btn small" data-team-detail="${UI.esc(t.id)}" type="button">Scheda</button><button class="btn small primary" data-team-pdf="${UI.esc(t.id)}" type="button">PDF</button></div></div>`);const stats=store.selectors.playerStats(state);const players=stats.filter(p=>p.name.toLowerCase().includes(q)||p.teamName.toLowerCase().includes(q)).map(p=>`<div class="player-row"><div><strong>${UI.esc(p.name)}</strong><p class="muted">${UI.esc(p.teamName)}${p.birthYear?' · '+UI.esc(p.birthYear):''}</p></div><span class="pill">PG ${p.played} · Gol ${p.goals} · 🟨 ${p.yellow} · 🟥 ${p.red}</span></div>`);const matches=state.matches.filter(m=>`${store.teamName(state,m.homeTeamId,m.homeLabel)} ${store.teamName(state,m.awayTeamId,m.awayLabel)} ${m.round} ${m.referee} ${m.field}`.toLowerCase().includes(q)).map(m=>UI.matchCard(state,m,true));const articles=store.selectors.articles(state).filter(a=>`${a.title} ${a.body}`.toLowerCase().includes(q)).map(a=>UI.articleCard(a,false));box.innerHTML=[...teams,...players,...matches,...articles].join('')||`<div class="empty">Nessun risultato per “${UI.esc(q)}”.</div>`;decorateFavoriteUI();}
  function matchDetailEventList(items,emptyLabel){
    if(!items.length)return `<div class="public-match-empty">${UI.esc(emptyLabel)}</div>`;
    return items.map(item=>`<div class="public-match-event-item"><span class="event-dot ${UI.esc(item.kind||'')}">${UI.esc(item.icon||'•')}</span><div><strong>${UI.esc(item.name)}</strong>${item.meta?`<small>${UI.esc(item.meta)}</small>`:''}</div></div>`).join('');
  }
  function shareMatchText(m){
    const home=store.teamName(state,m.homeTeamId,m.homeLabel), away=store.teamName(state,m.awayTeamId,m.awayLabel);
    const played=isMatchPlayed(m), sc=store.matchGoals(state,m);
    return `${home} vs ${away}${played?` · ${sc.home}-${sc.away}`:''} · ${UI.fmtDate(m)} · ${m.field||'Campo da definire'}`;
  }
  function getTeamLogoImage(team){return new Promise(resolve=>{if(!team?.logo){resolve(null);return;}const img=new Image();img.crossOrigin='anonymous';img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=team.logo;});}
  function roundRectPath(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}
  function drawTextFit(ctx,text,x,y,maxWidth,fontSize=42,fw='900',align='center',color='#fff'){ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;let size=fontSize;do{ctx.font=`${fw} ${size}px Arial, sans-serif`;if(ctx.measureText(text).width<=maxWidth||size<=18)break;size-=2;}while(size>18);ctx.fillText(text,x,y,maxWidth);}
  function shareSlug(value){return String(value||'new-generation').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,70)||'new-generation';}
  function canvasToBlob(canvas){return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob),'image/png',.96));}
  function downloadBlob(blob,fileName){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1400);}
  async function shareImageBlob(blob,fileName,title,text){if(!blob)throw new Error('Immagine non generata');let file=null;try{file=new File([blob],fileName,{type:'image/png'});}catch(_){}if(file&&navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){await navigator.share({title:title||state.rules.name||'New Generation',text:text||'',files:[file]});return 'shared';}downloadBlob(blob,fileName);return 'downloaded';}
  async function runShareTask(key,btn,build,title,text,fileName){if(shareImageBusy.has(key))return;shareImageBusy.add(key);const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Preparo immagine...';}try{const blob=await build();const mode=await shareImageBlob(blob,fileName,title,text);if(mode==='downloaded'&&btn)btn.textContent='Scaricata';}catch(err){if(err&&err.name==='AbortError')return;alert('Non riesco a preparare la condivisione immagine: '+(err?.message||err));}finally{setTimeout(()=>{if(btn){btn.disabled=false;btn.textContent=old;}},450);shareImageBusy.delete(key);}}
  function wrapCanvasText(ctx,text,maxWidth){const words=String(text||'').split(/\s+/).filter(Boolean);const lines=[];let line='';words.forEach(word=>{const next=line?line+' '+word:word;if(ctx.measureText(next).width<=maxWidth)line=next;else{if(line)lines.push(line);line=word;}});if(line)lines.push(line);return lines.length?lines:[''];}
  function drawWrappedText(ctx,text,x,y,maxWidth,lineHeight,maxLines=2){const all=wrapCanvasText(ctx,text,maxWidth);const lines=all.slice(0,maxLines);lines.forEach((line,i)=>ctx.fillText(i===maxLines-1&&all.length>maxLines?line.replace(/\s+\S*$/,'')+'...':line,x,y+i*lineHeight,maxWidth));return lines.length*lineHeight;}
  function drawImageLogo(ctx,img,x,y,size,label){roundRectPath(ctx,x,y,size,size,18);ctx.fillStyle='rgba(255,255,255,.92)';ctx.fill();ctx.strokeStyle='rgba(255,122,24,.35)';ctx.lineWidth=2;ctx.stroke();if(img){const pad=Math.round(size*.12),inner=size-pad*2;const ar=(img.naturalWidth||img.width||1)/(img.naturalHeight||img.height||1);const dw=ar>=1?inner:inner*ar,dh=ar>=1?inner/ar:inner;ctx.drawImage(img,x+pad+(inner-dw)/2,y+pad+(inner-dh)/2,dw,dh);}else{ctx.fillStyle='#08245a';ctx.font=`900 ${Math.round(size*.32)}px Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(label||'?').trim().slice(0,2).toUpperCase(),x+size/2,y+size/2);}ctx.textBaseline='alphabetic';}
  function initShareCanvas(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,'#06132d');bg.addColorStop(.55,'#08245a');bg.addColorStop(1,'#09111f');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(0,0,width,180);ctx.fillStyle='#ff7a18';ctx.font='900 34px Arial, sans-serif';ctx.textAlign='left';ctx.fillText('NEW GENERATION',70,78);ctx.fillStyle='#ffffff';ctx.font='900 52px Arial, sans-serif';ctx.fillText(state.rules.name||'Torneo',70,136,width-140);ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,.78)';ctx.font='800 24px Arial, sans-serif';ctx.fillText(new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short'}).format(new Date()),width-70,82);return {canvas,ctx};}
  async function buildStandingsShareImage(groupName=''){
    const grouped=store.selectors.hasGroupStage(state);let title='Classifica generale';let rows=publicMainStandingsRows({includeLive:true});
    if(groupName&&grouped){const group=(store.selectors.groupedStandings(state,{includeLive:true})||[]).find(g=>g.name===groupName);if(group){title='Classifica '+group.name;rows=group.rows||[];}}
    const W=1400,H=Math.max(920,330+Math.max(1,rows.length)*76+130);const {canvas,ctx}=initShareCanvas(W,H);
    ctx.fillStyle='#ffffff';ctx.font='900 46px Arial, sans-serif';ctx.textAlign='left';ctx.fillText(title,70,235);ctx.fillStyle='rgba(255,255,255,.76)';ctx.font='700 24px Arial, sans-serif';ctx.fillText(`${rows.length} squadre · ${store.FORMAT_LABELS[state.rules.format]||'Torneo'}`,70,270);
    const logos=await Promise.all(rows.map(r=>getTeamLogoImage(store.getTeam(state,r.teamId))));const x=70,y0=320,rowH=68,cols=[70,150,720,830,930,1030,1130,1240];
    roundRectPath(ctx,x,y0-44,W-140,46,16);ctx.fillStyle='rgba(255,255,255,.12)';ctx.fill();ctx.fillStyle='#ffb05f';ctx.font='900 20px Arial, sans-serif';ctx.textAlign='left';['#','Squadra','Pt','PG','GF','GS','DR','CR'].forEach((h,i)=>ctx.fillText(h,cols[i],y0-15));
    rows.forEach((r,i)=>{const y=y0+i*rowH;roundRectPath(ctx,x,y,W-140,rowH-10,18);ctx.fillStyle=i%2?'rgba(255,255,255,.075)':'rgba(255,255,255,.12)';ctx.fill();ctx.fillStyle='#fff';ctx.font='900 25px Arial, sans-serif';ctx.textAlign='center';ctx.fillText(String(i+1),cols[0]+16,y+39);drawImageLogo(ctx,logos[i],cols[1],y+9,44,r.name);ctx.fillStyle='#fff';ctx.font='900 25px Arial, sans-serif';ctx.textAlign='left';drawWrappedText(ctx,r.name,cols[1]+60,y+29,480,26,1);ctx.font='900 25px Arial, sans-serif';ctx.textAlign='center';[r.points,r.played,r.goalsFor,r.goalsAgainst,(r.diff>0?'+':'')+r.diff,Number(r.cards)||0].forEach((v,j)=>ctx.fillText(String(v),cols[j+2]+18,y+39));});
    ctx.fillStyle='rgba(255,255,255,.72)';ctx.font='700 22px Arial, sans-serif';ctx.textAlign='left';ctx.fillText('Immagine generata dalla pagina pubblica',70,H-58);return canvasToBlob(canvas);
  }
  async function buildBracketShareImage(){
    const data=store.bracketData(state);if(!data.available||!data.brackets.length)throw new Error(data.message||'Tabellone non disponibile');const bracket=data.brackets[0];const rounds=bracket.rounds||[];const maxMatches=Math.max(1,...rounds.map(r=>(r.matches||[]).length));const W=Math.max(1400,240+rounds.length*330),H=Math.max(960,340+maxMatches*150);const {canvas,ctx}=initShareCanvas(W,H);
    ctx.fillStyle='#ffffff';ctx.font='900 46px Arial, sans-serif';ctx.textAlign='left';ctx.fillText(bracket.name||'Tabellone',70,235);ctx.fillStyle='rgba(255,255,255,.76)';ctx.font='700 24px Arial, sans-serif';ctx.fillText(`${rounds.length} turni · ${store.FORMAT_LABELS[state.rules.format]||'Fase finale'}`,70,270);
    const colW=280,gap=48,startX=70,startY=335,cardH=118;
    rounds.forEach((round,ri)=>{const x=startX+ri*(colW+gap);ctx.fillStyle='#ffb05f';ctx.font='900 22px Arial, sans-serif';ctx.textAlign='left';ctx.fillText(round.name||`Turno ${ri+1}`,x,startY-28,colW);const matches=round.matches||[];const spacing=Math.max(cardH+24,(H-startY-130)/Math.max(1,matches.length));matches.forEach((m,mi)=>{const y=startY+mi*spacing;const score=store.matchGoals(state,m),played=store.hasScore(state,m)||m.status==='played';const home=store.teamName(state,m.homeTeamId,m.homeLabel||m.sourceHome||'Da definire');const away=store.teamName(state,m.awayTeamId,m.awayLabel||m.sourceAway||'Da definire');roundRectPath(ctx,x,y,colW,cardH,18);ctx.fillStyle='rgba(255,255,255,.12)';ctx.fill();ctx.strokeStyle='rgba(255,176,95,.35)';ctx.stroke();ctx.fillStyle='rgba(255,255,255,.62)';ctx.font='800 16px Arial, sans-serif';ctx.fillText(m.field||'Campo da definire',x+16,y+25,colW-32);ctx.fillStyle='#fff';ctx.font='900 21px Arial, sans-serif';drawWrappedText(ctx,home,x+16,y+57,colW-78,22,1);drawWrappedText(ctx,away,x+16,y+91,colW-78,22,1);ctx.textAlign='right';ctx.fillStyle=played?'#fff':'#ffb05f';ctx.font='900 23px Arial, sans-serif';ctx.fillText(played?String(score.home):'-',x+colW-18,y+57);ctx.fillText(played?String(score.away):'-',x+colW-18,y+91);ctx.textAlign='left';if(ri<rounds.length-1){ctx.strokeStyle='rgba(255,176,95,.30)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+colW,y+cardH/2);ctx.lineTo(x+colW+gap*.66,y+cardH/2);ctx.stroke();}});});
    ctx.fillStyle='rgba(255,255,255,.72)';ctx.font='700 22px Arial, sans-serif';ctx.textAlign='left';ctx.fillText('Tabellone esportato come immagine dalla pagina pubblica',70,H-58);return canvasToBlob(canvas);
  }
  async function shareStandingsImage(btn){await runShareTask('standings',btn,()=>buildStandingsShareImage(''),'Classifica generale',state.rules.name||'New Generation',`${shareSlug(state.rules.name)}-classifica.png`);}
  async function shareGroupStandingsImage(groupName,btn){await runShareTask('standings:'+groupName,btn,()=>buildStandingsShareImage(groupName),'Classifica '+groupName,state.rules.name||'New Generation',`${shareSlug(state.rules.name)}-${shareSlug(groupName)}.png`);}
  async function shareBracketImage(btn){await runShareTask('bracket',btn,()=>buildBracketShareImage(),'Tabellone '+(state.rules.name||''),state.rules.name||'New Generation',`${shareSlug(state.rules.name)}-tabellone.png`);}
  function renderShareActions(){const menu=$('#publicStandingsMenu');if(menu&&!menu.querySelector('[data-share-actions="standings"]')){const groups=store.selectors.hasGroupStage(state)?store.selectors.groupNames(state):[];const groupBtns=groups.map(g=>`<button class="btn small" type="button" data-share-group-standings="${UI.esc(g)}">Immagine ${UI.esc(g)}</button>`).join('');menu.insertAdjacentHTML('beforeend',`<div class="share-toolbar" data-share-actions="standings"><button class="btn small primary" type="button" data-share-standings>Immagine classifica</button>${groupBtns}</div>`);}const bracket=$('#publicBracket');if(bracket&&store.bracketData(state).available&&!bracket.querySelector('[data-share-actions="bracket"]'))bracket.insertAdjacentHTML('afterbegin','<div class="share-toolbar bracket-share-toolbar" data-share-actions="bracket"><button class="btn small primary" type="button" data-share-bracket>Immagine tabellone</button></div>');}
  async function buildMatchShareImage(m){
    const homeT=store.getTeam(state,m.homeTeamId),awayT=store.getTeam(state,m.awayTeamId);
    const home=store.teamName(state,m.homeTeamId,m.homeLabel),away=store.teamName(state,m.awayTeamId,m.awayLabel);
    const played=isMatchPlayed(m),score=store.matchGoals(state,m);
    const W=1600,H=1000;
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
    ctx.textBaseline='alphabetic';
    const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#070806');bg.addColorStop(.58,'#17190f');bg.addColorStop(1,'#090a07');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(230,199,96,.06)';ctx.fillRect(0,0,W,160);
    roundRectPath(ctx,64,64,W-128,H-128,44);ctx.fillStyle='rgba(255,255,255,.035)';ctx.fill();ctx.strokeStyle='rgba(230,199,96,.72)';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#e6c760';ctx.font='900 34px Arial, sans-serif';ctx.textAlign='left';ctx.fillText('NEW GENERATION',112,132);
    ctx.textAlign='right';ctx.font='800 30px Arial, sans-serif';ctx.fillText(UI.fmtDate(m),W-112,132);
    const contextLine=`${store.PHASE_LABELS[m.phase]||m.phase||'Partita'}${m.groupName?' · '+m.groupName:''}${m.round?' · '+m.round:''}`.replace(/\s+/g,' ').trim();
    ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 42px Arial, sans-serif';ctx.fillText(contextLine,W/2,210,W-240);
    const homeLogo=await getTeamLogoImage(homeT),awayLogo=await getTeamLogoImage(awayT);
    function drawLogo(img,x,y,name){
      roundRectPath(ctx,x-76,y-76,152,152,30);ctx.fillStyle='rgba(255,255,255,.07)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1.5;ctx.stroke();
      if(img){
        ctx.save();
        roundRectPath(ctx,x-64,y-64,128,128,24);
        ctx.clip();
        // Sfondo neutro + letterbox: proporzioni preservate, logo non tocca il bordo
        // sfondo trasparente
        var pad=10; var inner=128-pad*2;
        var ar=(img.naturalWidth||img.width||1)/(img.naturalHeight||img.height||1);
        var dw=ar>=1?inner:inner*ar; var dh=ar>=1?inner/ar:inner;
        ctx.drawImage(img,(x-64)+pad+(inner-dw)/2,(y-64)+pad+(inner-dh)/2,dw,dh);
        ctx.restore();
      }
      else{ctx.fillStyle='#e6c760';ctx.font='900 42px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(name||'?').slice(0,2).toUpperCase(),x,y);ctx.textBaseline='alphabetic';}
    }
    drawLogo(homeLogo,300,375,home);drawLogo(awayLogo,1300,375,away);
    drawTextFit(ctx,home,300,535,430,62,'900');drawTextFit(ctx,away,1300,535,430,62,'900');
    roundRectPath(ctx,650,300,300,190,34);ctx.fillStyle='rgba(0,0,0,.36)';ctx.fill();ctx.strokeStyle='rgba(230,199,96,.66)';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=played?'#7ff0bc':'#ff4c55';ctx.font='900 26px Arial';ctx.textAlign='center';ctx.fillText(played?'GIOCATA':'DA GIOCARE',800,345);
    ctx.fillStyle='#fff';ctx.font='950 82px Arial';ctx.fillText(played?`${score.home} - ${score.away}`:'VS',800,430);
    const meta=[['CAMPO',m.field||'Da definire'],['ARBITRO',m.referee||'Da definire'],['DATA',UI.fmtDate(m)]];
    meta.forEach((it,i)=>{const x=130+i*450;roundRectPath(ctx,x,650,390,104,22);ctx.fillStyle='rgba(0,0,0,.42)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#e6c760';ctx.font='900 19px Arial';ctx.textAlign='left';ctx.fillText(it[0],x+28,690);ctx.fillStyle='#fff';ctx.font='850 28px Arial';ctx.fillText(it[1],x+28,725,330);});
    const goals=(m.goals||[]).map(g=>store.goalLabel?store.goalLabel(state,m,g):store.playerName(state,g.playerId)).filter(Boolean).slice(0,10).join(' · ')||'Nessun marcatore';
    roundRectPath(ctx,130,810,W-260,94,22);ctx.fillStyle='rgba(0,0,0,.34)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#e6c760';ctx.font='900 20px Arial';ctx.textAlign='left';ctx.fillText('MARCATORI',160,848);ctx.fillStyle='#fff';ctx.font='850 28px Arial';ctx.fillText(goals,160,884,W-320);
    return canvasToBlob(canvas);
  }
  async function shareMatchImage(m,btn){
    await runShareTask('match:'+m.id,btn,()=>buildMatchShareImage(m),`${store.teamName(state,m.homeTeamId,m.homeLabel)} vs ${store.teamName(state,m.awayTeamId,m.awayLabel)}`,shareMatchText(m),`${shareSlug(state.rules.name)}-${shareSlug(m.round||m.id||'partita')}.png`);
  }
  function publicMatchDetailMarkup(m){
    const homeT=store.getTeam(state,m.homeTeamId), awayT=store.getTeam(state,m.awayTeamId);
    const home=store.teamName(state,m.homeTeamId,m.homeLabel), away=store.teamName(state,m.awayTeamId,m.awayLabel);
    const score=store.matchGoals(state,m);
    const isLive=m.status==='live';
    const played=store.hasScore(state,m)||m.status==='played';
    const showScore=played||isLive||(store.hasGoals&&store.hasGoals(state,m));
    const homeGoals=[], awayGoals=[], yellow=[], red=[];
    (m.goals||[]).forEach(g=>{const scoringTeam=store.goalScoringTeamId?store.goalScoringTeamId(state,m,g):store.playerTeamId?.(state,g.playerId);const row={icon:(store.isOwnGoalEvent&&store.isOwnGoalEvent(g))?'🥅':'⚽',kind:'goal',name:store.goalLabel?store.goalLabel(state,m,g):store.playerName(state,g.playerId),meta:(store.isOwnGoalEvent&&store.isOwnGoalEvent(g))?'Autogol':''};if(scoringTeam===m.homeTeamId)homeGoals.push(row);else if(scoringTeam===m.awayTeamId)awayGoals.push(row);else homeGoals.push(row);});
    (m.cards||[]).forEach(c=>{const row={icon:c.type==='red'?'■':'■',kind:c.type==='red'?'red':'yellow',name:store.playerName(state,c.playerId),meta:c.type==='red'?'Espulsione':'Ammonizione'};(c.type==='red'?red:yellow).push(row);});
    const status=store.matchStatusInfo?store.matchStatusInfo(state,m):(played?{label:'Giocata',cls:'is-played'}:{label:'Da giocare',cls:'is-pending'});
    // Compone una sottostringa pulita per la pill, evitando duplicati di "Girone X" tra
    // groupName e round (i round dei match di girone includono già il nome del girone).
    const phaseLabel=store.PHASE_LABELS[m.phase]||m.phase;
    const groupName=m.groupName||'';
    let round=m.round||'';
    if(groupName && round.includes(groupName)){
      // Es. round = "Girone B - Giornata 1", groupName = "Girone B" → tengo solo "Giornata 1"
      round = round.replace(groupName,'').replace(/^[\s·:\-–—]+/,'').replace(/[\s·:\-–—]+$/,'').trim();
    }
    const subtitle=[UI.esc(phaseLabel),UI.esc(groupName),UI.esc(round)].filter(Boolean).join(' · ');
    const centerCls=isLive?'is-live':(played?'is-played':'is-pending');
    // Rigori
    let pBlock='';
    if(showScore&&score.home===score.away&&store.isKnockoutPhase&&store.isKnockoutPhase(m)&&m.penalties){
      const p=store.normalizePenalties?store.normalizePenalties(m.penalties):m.penalties;
      if(p){
        const winner=p.home>p.away?home:(p.away>p.home?away:'');
        pBlock=`<div class="public-penalty-block">
          <div class="public-penalty-head"><span>Rigori</span><strong>${p.home} - ${p.away}</strong></div>
          ${winner?`<div class="public-penalty-winner">🏆 ${UI.esc(winner)} qualificata ai rigori</div>`:''}
        </div>`;
      }
    }
    return `<article class="public-match-detail-card ${isLive?'is-live-card':''}">
      <section class="public-match-hero">
        <div class="public-match-hero-top">
          <span class="pill">${subtitle||'Partita'}</span>
          <span class="score-badge match-status-badge ${status.cls}" role="status">${isLive?'🔴 ':''}${UI.esc(status.label)}</span>
        </div>
        <div class="public-scoreboard">
          <div class="public-score-team public-score-home">${UI.logo(homeT,false)}<strong>${UI.esc(home)}</strong></div>
          <div class="public-score-center ${centerCls}"><span>${showScore?score.home:'-'}</span><em aria-hidden="true">${showScore?'-':'vs'}</em><span>${showScore?score.away:'-'}</span></div>
          <div class="public-score-team public-score-away">${UI.logo(awayT,false)}<strong>${UI.esc(away)}</strong></div>
        </div>
        ${pBlock}
        <div class="public-match-meta-grid">
          <span><small>Data e ora</small><strong>${UI.esc(UI.fmtDate(m))}</strong></span>
          <span><small>Campo</small><strong>${UI.esc(m.field||'Da definire')}</strong></span>
          <span><small>Arbitro</small><strong>${UI.esc(m.referee||'Da definire')}</strong></span>
        </div>
      </section>
      <section class="public-match-panels">
        <div class="public-match-panel"><div class="panel-title"><span>⚽</span><h3>Marcatori ${UI.esc(home)}</h3></div>${matchDetailEventList(homeGoals,'Nessun marcatore')}</div>
        <div class="public-match-panel"><div class="panel-title"><span>⚽</span><h3>Marcatori ${UI.esc(away)}</h3></div>${matchDetailEventList(awayGoals,'Nessun marcatore')}</div>
        <div class="public-match-panel"><div class="panel-title"><span>🟨</span><h3>Cartellini gialli</h3></div>${matchDetailEventList(yellow,'Nessun ammonito')}</div>
        <div class="public-match-panel"><div class="panel-title"><span>🟥</span><h3>Cartellini rossi</h3></div>${matchDetailEventList(red,'Nessun espulso')}</div>
      </section>
      ${isLive
        ? '<div class="public-match-actions"><small class="muted live-share-note">⛔ La condivisione immagine sarà disponibile a partita conclusa.</small></div>'
        : `<div class="public-match-actions"><button class="btn primary" type="button" data-share-match="${UI.esc(m.id)}">Condividi immagine</button></div>`}
    </article>`;
  }
  function showMatch(id){const m=state.matches.find(x=>x.id===id);if(!m)return;const modal=$('#matchModal');$('#matchModalBody').innerHTML=publicMatchDetailMarkup(m);modal.classList.remove('is-closing');modal.classList.add('public-match-modal');modal.classList.add('open');document.body.classList.add('modal-open');setTimeout(()=>$('#closeModal')?.focus(),0);}
  let lastArticleTrigger=null;
  function ensureArticleModal(){
    let modal=$('#articleModal');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.className='modal article-modal';
    modal.id='articleModal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','articleModalTitle');
    modal.innerHTML=`<div class="modal-content article-modal-content"><div class="article-modal-toolbar"><div><strong class="article-modal-label">Dettaglio articolo</strong><h2 id="articleModalTitle">Articolo</h2></div><button class="btn danger article-modal-close" id="closeArticleModal" type="button">Chiudi</button></div><div id="articleModalBody"></div></div>`;
    document.body.appendChild(modal);
    return modal;
  }
  function closeArticleModal(){
    const modal=$('#articleModal');
    if(!modal)return;
    if(!modal.classList.contains('open'))return;
    window.clearTimeout(closeArticleModal._t);
    modal.classList.add('closing');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    closeArticleModal._t=window.setTimeout(()=>{
      if(modal.classList.contains('open'))return;
      modal.classList.remove('closing');
      document.body.classList.remove('article-modal-open');
      // Non forziamo il focus sulla card dopo la chiusura: su mobile può generare
      // scroll/repaint visibile. La lista articoli resta già nella stessa posizione.
      document.body.classList.add('ng-modal-settling');
      window.setTimeout(()=>document.body.classList.remove('ng-modal-settling'),260);
      scheduleDeferredArticleRender(700);
    },360);
  }
  function showArticle(id,trigger=null){
    const article=store.selectors.articles(state).find(x=>x.id===id);
    if(!article)return;
    lastArticleTrigger=trigger;
    const modal=ensureArticleModal();
    const body=$('#articleModalBody');
    $('#articleModalTitle').textContent=article.title||'Articolo';
    const nextHtml=UI.articleDetail(article);
    if(body.dataset.articleId!==String(id)||body.dataset.articleHtml!==nextHtml){
      body.innerHTML=nextHtml;
      body.dataset.articleId=String(id);
      body.dataset.articleHtml=nextHtml;
    }
    window.clearTimeout(closeArticleModal._t);
    modal.classList.remove('closing');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('article-modal-open');
    // Forza lo stato iniziale off-canvas prima dell'apertura: evita il lampo
    // tra visibility e transform su browser mobile.
    void modal.offsetHeight;
    requestAnimationFrame(()=>{
      modal.classList.add('open');
    });
  }
  function resetFiltersForNewState(){
    if(phaseFilter && !store.selectors.phases(state).includes(phaseFilter)) phaseFilter='';
    if(statusFilter==='favorite' && (!favoriteTeamId||!store.getTeam(state,favoriteTeamId))) statusFilter='';
    if(roundFilter && !store.selectors.rounds(state).includes(roundFilter)) roundFilter='';
    if(teamFilter && !state.teams.some(t=>t.id===teamFilter)) teamFilter='';
    if(playerTeamFilter && !state.teams.some(t=>t.id===playerTeamFilter)) playerTeamFilter='';
    if(standingsGroup !== 'all' && !store.selectors.groupNames(state).includes(standingsGroup)) standingsGroup='all';
  }
  // -----------------------------------------------------------------------
  // Notifiche pop-up per partite live: appaiono in alto a destra solo quando
  // il PUNTEGGIO di una partita live cambia. Spariscono dopo 10s.
  // -----------------------------------------------------------------------
  const liveScoreSnapshot = new Map(); // matchId -> "home-away"
  let _liveNotifContainer = null;
  function ensureLiveNotifContainer(){
    if(_liveNotifContainer && document.body.contains(_liveNotifContainer)) return _liveNotifContainer;
    _liveNotifContainer = document.createElement('div');
    _liveNotifContainer.id = 'ngLiveNotifContainer';
    _liveNotifContainer.className = 'ng-live-notif-container';
    _liveNotifContainer.setAttribute('aria-live', 'polite');
    _liveNotifContainer.setAttribute('aria-label', 'Notifiche partite live');
    document.body.appendChild(_liveNotifContainer);
    return _liveNotifContainer;
  }
  function showLiveNotification(m, prevScore, newScore){
    // Se l'utente è già nella tab Home, il banner "Partite in corso" è visibile e si
    // aggiorna in tempo reale: la notifica pop-up sarebbe ridondante e confusionaria.
    if(activePublicTab()==='home') return;
    const container = ensureLiveNotifContainer();
    const home = store.teamName(state, m.homeTeamId, m.homeLabel);
    const away = store.teamName(state, m.awayTeamId, m.awayLabel);
    const homeT = store.getTeam(state, m.homeTeamId);
    const awayT = store.getTeam(state, m.awayTeamId);
    // Indico chi ha segnato in base a quale colonna è salita
    let scorerLabel = '';
    if(newScore.home > prevScore.home) scorerLabel = `⚽ ${home}`;
    else if(newScore.away > prevScore.away) scorerLabel = `⚽ ${away}`;
    else scorerLabel = '⚽ Aggiornamento risultato';

    // Se esiste già una notifica per QUESTO match, la sostituisco (no duplicati visibili).
    container.querySelectorAll(`.ng-live-notif[data-match-id="${UI.esc(m.id)}"]`).forEach(el=>el.remove());

    const notif = document.createElement('article');
    notif.className = 'ng-live-notif';
    notif.setAttribute('role', 'status');
    notif.dataset.matchId = m.id;
    notif.innerHTML = `
      <button class="ng-live-notif-close" type="button" aria-label="Chiudi notifica">×</button>
      <div class="ng-live-notif-head">
        <span class="ng-live-notif-badge">🔴 LIVE</span>
        <span class="ng-live-notif-scorer">${UI.esc(scorerLabel)}</span>
      </div>
      <div class="ng-live-notif-body">
        <div class="ng-live-notif-team">${UI.logo(homeT,false)}<strong>${UI.esc(home)}</strong></div>
        <div class="ng-live-notif-score">${newScore.home} - ${newScore.away}</div>
        <div class="ng-live-notif-team">${UI.logo(awayT,false)}<strong>${UI.esc(away)}</strong></div>
      </div>
      <div class="ng-live-notif-hint">Tocca per aprire il dettaglio partita</div>
    `;
    container.appendChild(notif);

    // Anima ingresso
    requestAnimationFrame(()=> notif.classList.add('is-in'));

    const dismiss = () => {
      notif.classList.remove('is-in');
      notif.classList.add('is-out');
      setTimeout(()=> notif.remove(), 320);
    };
    // Rimozione immediata senza animazione (es. quando si apre il modale per evitare sovrapposizione visiva)
    const dismissNow = () => {
      notif.classList.remove('is-in');
      notif.classList.add('is-out');
      // remove subito, senza setTimeout: evita sfarfallio quando si apre il modale
      if(notif.parentNode) notif.parentNode.removeChild(notif);
    };
    let autoTimer = setTimeout(dismiss, 10000);

    notif.addEventListener('click', e => {
      // Click sulla X: chiude SOLO la notifica, lascia tutto il resto com'è
      if(e.target.closest('.ng-live-notif-close')){
        e.stopPropagation();
        clearTimeout(autoTimer);
        dismiss();
        return;
      }
      // Click sul corpo: apro la schermata dedicata del match.
      // La notifica viene rimossa SUBITO (no animazione) per evitare sfarfallio mentre il modale appare.
      clearTimeout(autoTimer);
      dismissNow();
      showMatch(m.id);
    });

    // Se la notifica si trova ad esistere quando il modale già è aperto sullo stesso match,
    // la nascondo subito (sarebbe ridondante - l'utente sta già guardando i dettagli).
    if(openMatchModalId === m.id){
      clearTimeout(autoTimer);
      dismissNow();
    }
  }
  function detectLiveScoreChanges(newState){
    // Trovo i match attualmente live nel nuovo state e confronto con lo snapshot precedente.
    // Notifico SOLO se il punteggio è cambiato (per evitare spam su altre modifiche, es. cambio campo/arbitro).
    const newLiveByMatch = new Map();
    (newState.matches||[]).forEach(m => {
      if(m.status==='live' && m.homeTeamId && m.awayTeamId){
        newLiveByMatch.set(m.id, store.matchGoals(newState, m));
      }
    });
    newLiveByMatch.forEach((sc, matchId) => {
      const key = `${sc.home}-${sc.away}`;
      const prevKey = liveScoreSnapshot.get(matchId);
      if(prevKey === undefined){
        // Prima volta che vedo questa partita live: registro senza notificare
        // (evita notifica al primo caricamento o quando una partita inizia ora)
        liveScoreSnapshot.set(matchId, key);
        return;
      }
      if(prevKey !== key){
        // Punteggio cambiato!
        const prev = (()=>{const [h,a]=prevKey.split('-'); return {home:Number(h)||0, away:Number(a)||0};})();
        const m = newState.matches.find(x=>x.id===matchId);
        if(m) showLiveNotification(m, prev, sc);
        liveScoreSnapshot.set(matchId, key);
      }
    });
    // Pulisco snapshot di match che non sono più live
    for(const id of Array.from(liveScoreSnapshot.keys())){
      if(!newLiveByMatch.has(id)) liveScoreSnapshot.delete(id);
    }
  }

  var _lastRenderFP="";
  function render(opts={}){
    if(!opts.skipAlign) store.alignState(state);
    try{UI.applySiteTheme(state);}catch(e){}
    sanitizeFavoriteTeam();
    deferredSave();
    // Fingerprint globale: se lo state non è cambiato, non toccare il DOM.
    // Evita il flash visivo causato dal polling Supabase ogni ~6 secondi.
    var fp=store.deriveFingerprint(state);
    fp+="|articles:"+articleListFingerprint(state.articles||[]);
    fp+="|logos:"+(state.teams||[]).map(function(t){return (t.logo||'').length+':'+String(t.logo||'').slice(0,18);}).join(',');
    fp+="|favorite:"+(favoriteTeamId||'');
    if(!opts.force&&fp===_lastRenderFP){
      decorateFavoriteUI();
      return;
    }
    _lastRenderFP=fp;
    resetFiltersForNewState();
    persistPublicFilters();
    renderHome();renderTeams();renderPlayers();renderMatches();renderBracket();renderArticles();renderSearch();
  }
  let _saveTimer=null;
  function deferredSave(){
    if(_saveTimer) return;
    const schedule = window.requestIdleCallback || function(cb){return setTimeout(cb,1);};
    _saveTimer = schedule(()=>{_saveTimer=null; save();}, {timeout: 300});
  }
  // Debounce dei render in arrivo da eventi realtime (burst protection)
  let _renderRafId = null;
  let _renderPending = null;
  function scheduleRender(opts={}){
    _renderPending = opts;
    if(_renderRafId) return;
    _renderRafId = requestAnimationFrame(()=>{
      const o = _renderPending || {};
      _renderRafId = null; _renderPending = null;
      render(o);
    });
  }
  const publicImport=$('#publicImport'); if(publicImport) publicImport.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const json=JSON.parse(await file.text());state=store.normalizeState(json);save();phaseFilter='';roundFilter='';teamFilter='';statusFilter='';playerTeamFilter='';standingsGroup='all';persistPublicFilters();render();alert('Dati pubblici importati correttamente.');}catch(err){alert('File JSON non valido.');}});
  document.addEventListener('ng:tab-changed',e=>{const tab=e.detail?.tab;if(PUBLIC_TABS.has(tab)&&!e.detail?.restored)safeSessionSet(PUBLIC_ACTIVE_TAB_KEY,tab);if(tab==='articles')requestAnimationFrame(()=>renderArticles(true));});
  $('#publicPhaseFilter').addEventListener('change',e=>{phaseFilter=e.target.value;persistPublicFilters();renderMatches();});$('#publicRoundFilter').addEventListener('change',e=>{roundFilter=e.target.value;persistPublicFilters();renderMatches();});$('#publicTeamFilter').addEventListener('change',e=>{teamFilter=e.target.value;persistPublicFilters();renderMatches();});$('#publicPlayerTeamFilter')?.addEventListener('change',e=>{playerTeamFilter=e.target.value;persistPublicFilters();renderPlayers();});document.addEventListener('change',e=>{if(e.target.id==='publicGroupStandingsFilter'){standingsGroup=e.target.value||'all';persistPublicFilters();renderHome();}});$('#globalSearch').addEventListener('input',()=>{persistPublicFilters();renderSearch();});document.addEventListener('click',async e=>{const filterOpener=e.target.closest('[data-open-match-filter]');if(filterOpener){e.preventDefault();openMatchFilterSheet(filterOpener.dataset.openMatchFilter);return;}const filterChoice=e.target.closest('[data-filter-type]');if(filterChoice){e.preventDefault();setMatchFilter(filterChoice.dataset.filterType,filterChoice.dataset.filterValue||'');return;}if(e.target.closest('[data-close-match-filter]')||e.target.id==='matchFilterSheet'){e.preventDefault();closeMatchFilterSheet();return;}if(e.target.closest('[data-clear-match-filters]')){e.preventDefault();phaseFilter='';roundFilter='';teamFilter='';statusFilter='';persistPublicFilters();renderMatches();return;}const presetBtn=e.target.closest('[data-match-preset]');if(presetBtn){e.preventDefault();statusFilter=presetBtn.dataset.matchPreset==='all'?'':presetBtn.dataset.matchPreset;persistPublicFilters();renderMatches();return;}const shareStandingsBtn=e.target.closest('[data-share-standings]');if(shareStandingsBtn){e.preventDefault();await shareStandingsImage(shareStandingsBtn);return;}const shareGroupBtn=e.target.closest('[data-share-group-standings]');if(shareGroupBtn){e.preventDefault();await shareGroupStandingsImage(shareGroupBtn.dataset.shareGroupStandings,shareGroupBtn);return;}const shareBracketBtn=e.target.closest('[data-share-bracket]');if(shareBracketBtn){e.preventDefault();await shareBracketImage(shareBracketBtn);return;}const shareBtn=e.target.closest('[data-share-match]');if(shareBtn){e.preventDefault();const m=state.matches.find(x=>x.id===shareBtn.dataset.shareMatch);if(m){if(m.status==='live'){alert('La condivisione immagine è disponibile solo per partite concluse.');return;}await shareMatchImage(m,shareBtn);}return;}const favBtn=e.target.closest('[data-favorite-team]');if(favBtn){e.preventDefault();e.stopPropagation();const id=favBtn.dataset.favoriteTeam;if(isFavoriteTeam(id))clearFavoriteTeam();else setFavoriteTeam(id);return;}const clearFavBtn=e.target.closest('[data-clear-favorite]');if(clearFavBtn){e.preventDefault();e.stopPropagation();clearFavoriteTeam();return;}if(e.target.closest('[data-open-teams-tab]')){e.preventDefault();document.querySelector('[data-tab="teams"]')?.click();return;}const favMatchBtn=e.target.closest('[data-filter-favorite-matches]');if(favMatchBtn){e.preventDefault();teamFilter=favMatchBtn.dataset.filterFavoriteMatches||favoriteTeamId;persistPublicFilters();document.querySelector('[data-tab="matches"]')?.click();renderMatches();return;}const teamTarget=e.target.closest('[data-team-detail]');if(teamTarget){e.preventDefault();showTeamDetail(teamTarget.dataset.teamDetail,teamTarget);return;}const pdfBtn=e.target.closest('[data-team-pdf]');if(pdfBtn){pdfBtn.disabled=true;const oldPdf=pdfBtn.textContent;pdfBtn.textContent='Genero PDF...';try{await downloadTeamPdf(pdfBtn.dataset.teamPdf);}catch(err){alert('Errore PDF squadra: '+(err.message||err));}finally{pdfBtn.disabled=false;pdfBtn.textContent=oldPdf;}return;}const articleTarget=e.target.closest('[data-article-open]');if(articleTarget && !e.target.closest('[data-edit-article],[data-delete-article]')){e.preventDefault();e.stopPropagation();showArticle(articleTarget.dataset.articleOpen||articleTarget.closest('[data-article-open]')?.dataset.articleOpen,articleTarget);return;}const card=e.target.closest('[data-match-detail]');if(card){e.preventDefault();showMatch(card.dataset.matchDetail);return;}if(e.target.id==='closeModal'||e.target.id==='matchModal'){e.preventDefault();closeMatchModal();return;}if(e.target.id==='closeArticleModal'||e.target.id==='articleModal')closeArticleModal();if(e.target.id==='closeTeamModal'||e.target.id==='teamModal')closeTeamModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeArticleModal();closeTeamModal();closeMatchFilterSheet();closeMatchModal();}if((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('[data-team-detail]')){e.preventDefault();showTeamDetail(e.target.dataset.teamDetail,e.target);return;}if((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('[data-article-open]')){e.preventDefault();showArticle(e.target.dataset.articleOpen,e.target);return;}const matchTarget=e.target?.closest?.('[data-match-detail]');if((e.key==='Enter'||e.key===' ')&&matchTarget){e.preventDefault();showMatch(matchTarget.dataset.matchDetail);}});

  document.addEventListener('error',e=>{
    const img=e.target?.closest?.('img.article-image');
    if(!img)return;
    // Retry: se è il primo errore, riprova ricaricando (cache bust)
    if(!img.dataset.retried){
      img.dataset.retried='1';
      var origSrc=img.getAttribute('src')||'';
      // Non aggiungere parametri ai data URL: li renderebbe non validi o inutilmente più pesanti.
      if(origSrc && !origSrc.startsWith('data:')){
        var sep=origSrc.indexOf('?')>=0?'&':'?';
        img.src=origSrc+sep+'_retry='+Date.now();
        return;
      }
    }
    // Secondo errore: mostra il placeholder
    UI.replaceBrokenArticleImage(img);
  },true);
  document.addEventListener('load',e=>{
    const img=e.target?.closest?.('img.article-image');
    if(!img)return;
    const media=img.closest('.article-media');
    media?.classList.add('image-ready');
    if(img.naturalWidth&&img.naturalHeight&&img.naturalHeight>img.naturalWidth){
      img.classList.add('is-portrait');
      media?.classList.add('has-portrait');
    }
    const detailFrame=img.closest('.article-detail-frame');
    if(detailFrame&&img.naturalWidth&&img.naturalHeight){
      detailFrame.style.setProperty('--article-natural-w',img.naturalWidth+'px');
      detailFrame.style.setProperty('--article-natural-h',img.naturalHeight+'px');
      detailFrame.classList.add('natural-size-ready');
      if(img.naturalHeight>img.naturalWidth)detailFrame.classList.add('has-portrait');
    }
  },true);

  function setupMobileNavigation(){
    if(document.querySelector('.mobile-bottom-nav')) return;
    const labels={home:'Panoramica',teams:'Squadre',players:'Giocatori',matches:'Partite',bracket:'Tabellone',articles:'Articoli',search:'Cerca'};
    const icons={home:'⌂',teams:'◎',players:'♙',matches:'⚽',bracket:'▥',articles:'✦',search:'⌕'};
    const mainTabs=['home','teams','matches','search'];
    const moreTabs=['players','bracket','articles'];
    const nav=document.createElement('nav');
    nav.className='mobile-bottom-nav';
    nav.setAttribute('aria-label','Navigazione principale mobile');
    nav.innerHTML=mainTabs.map(tab=>`<button type="button" class="mobile-nav-item ${tab==='home'?'active':''}" data-tab="${tab}" aria-label="${labels[tab]}"><span class="mobile-nav-icon">${icons[tab]}</span><span>${labels[tab]}</span></button>`).join('')+
      `<button type="button" class="mobile-nav-item mobile-more-trigger" data-mobile-more="open" aria-label="Altre sezioni"><span class="mobile-nav-icon">☰</span><span>Altro</span></button>`;
    const sheet=document.createElement('div');
    sheet.className='mobile-nav-sheet';
    sheet.setAttribute('aria-hidden','true');
    sheet.innerHTML=`<div class="mobile-nav-backdrop" data-mobile-more="close"></div><section class="mobile-nav-panel" role="dialog" aria-label="Altre sezioni"><div class="mobile-sheet-handle"></div><div class="mobile-sheet-head"><strong>Vai a</strong><button type="button" class="btn small" data-mobile-more="close">Chiudi</button></div><div class="mobile-sheet-grid">${moreTabs.map(tab=>`<button type="button" class="mobile-sheet-item" data-tab="${tab}"><span>${icons[tab]}</span><strong>${labels[tab]}</strong></button>`).join('')}</div></section>`;
    document.body.appendChild(nav);
    document.body.appendChild(sheet);
    function closeSheet(){sheet.classList.remove('open');sheet.setAttribute('aria-hidden','true');document.body.classList.remove('mobile-nav-open');}
    function openSheet(){sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');document.body.classList.add('mobile-nav-open');}
    document.addEventListener('click',e=>{
      const more=e.target.closest('[data-mobile-more]');
      if(more){more.dataset.mobileMore==='open'?openSheet():closeSheet();return;}
      if(e.target.closest('.mobile-sheet-item')) closeSheet();
    });
    document.addEventListener('ng:tab-changed',e=>{
      const tab=e.detail?.tab;
      document.querySelectorAll('.mobile-nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===tab));
      const moreActive=moreTabs.includes(tab);
      const moreBtn=document.querySelector('.mobile-more-trigger');
      if(moreBtn) moreBtn.classList.toggle('active',moreActive);
      closeSheet();
      if(window.matchMedia('(max-width:720px)').matches) window.scrollTo({top:0,behavior:'smooth'});
    });
  }
  // Memorizza l'id del match/team del modale aperto, per ri-disegnarli alla ricezione di nuovi dati
  let openMatchModalId = '';
  let openTeamModalId = '';
  const _origShowMatch = showMatch;
  showMatch = function(id){ openMatchModalId = id; _origShowMatch(id); _lastMatchModalHtml=$('#matchModalBody')?.innerHTML||''; };
  const _origShowTeamDetail = showTeamDetail;
  showTeamDetail = function(teamId, trigger=null){ openTeamModalId = teamId; _origShowTeamDetail(teamId, trigger); };
  let _lastMatchModalHtml='', _lastTeamModalHtml='';
  let _matchCloseTimer=null;
  function closeMatchModal(){
    const modal=$('#matchModal');
    if(!modal)return;
    if(_matchCloseTimer){clearTimeout(_matchCloseTimer);_matchCloseTimer=null;}
    openMatchModalId='';
    _lastMatchModalHtml='';
    document.body.classList.remove('modal-open');
    if(!modal.classList.contains('open')){modal.classList.remove('public-match-modal','is-closing');return;}
    modal.classList.add('is-closing');
    _matchCloseTimer=setTimeout(()=>{
      modal.classList.remove('open','public-match-modal','is-closing');
      _matchCloseTimer=null;
      scheduleDeferredArticleRender(460);
    },140);
  }
  function refreshOpenModals(){
    const matchModal=$('#matchModal');
    if(openMatchModalId && matchModal && matchModal.classList.contains('open')){
      const m=state.matches.find(x=>x.id===openMatchModalId);
      if(m){
        const html=publicMatchDetailMarkup(m);
        if(html!==_lastMatchModalHtml){$('#matchModalBody').innerHTML=html;_lastMatchModalHtml=html;}
      } else { matchModal.classList.remove('open'); matchModal.classList.remove('public-match-modal'); document.body.classList.remove('modal-open'); openMatchModalId=''; _lastMatchModalHtml=''; }
    } else if(!openMatchModalId){_lastMatchModalHtml='';}
    const teamModal=$('#teamModal');
    if(openTeamModalId && teamModal && teamModal.classList.contains('open')){
      const t=store.getTeam(state,openTeamModalId);
      if(t){
        const html=teamDetailMarkup(t);
        if(html!==_lastTeamModalHtml){$('#teamModalBody').innerHTML=html;_lastTeamModalHtml=html;}
      }
    } else if(!openTeamModalId){_lastTeamModalHtml='';}
  }
  window.addEventListener('ng:public-state-updated',e=>{
    if(e.detail&&e.detail.state){
      // Lo state arrivato è già normalizzato (publishPublicState chiama normalizeState).
      // Salto alignState e debouncing del render.
      const incoming = e.detail.state;
      const source = e.detail.source || '';
      // Rilevo cambi di punteggio nelle partite live PRIMA di sostituire lo state,
      // così posso notificare l'utente. Lo snapshot interno è mantenuto.
      detectLiveScoreChanges(incoming);
      state = incoming;
      // Per broadcast HOT-PATH: render SINCRONO (zero latency, no rAF wait).
      // Per altri source (postgres_changes, polling, storage): normale scheduleRender.
      if(source === 'broadcast'){
        render({skipAlign:true});
      } else {
        scheduleRender({skipAlign:true});
      }
      refreshOpenModals();
    }
  });
  window.addEventListener('storage',e=>{
    if(e.key===store.PUBLIC_KEY&&e.newValue){
      try{
        const currentTab=activePublicTab();
        const incoming=store.normalizeState(store.mergeMissingMedia?store.mergeMissingMedia(JSON.parse(e.newValue),state):JSON.parse(e.newValue));
        detectLiveScoreChanges(incoming);
        state=incoming;
        scheduleRender({skipAlign:true});
        setPublicTab(currentTab,{persist:true,scroll:false});
        refreshOpenModals();
      }catch(_){}
    }
  });
  // Pulizia variabili modale alla chiusura
  document.addEventListener('click',e=>{
    if(e.target.id==='closeTeamModal'||e.target.id==='teamModal') openTeamModalId='';
  });
  UI.bindTabs();setupMobileNavigation();restorePublicFilters();restorePublicTab();
  // Inizializzo lo snapshot dei punteggi live PRIMA del primo render, così le partite
  // già in corso al boot non triggerano notifiche fasulle.
  detectLiveScoreChanges(state);
  render();
})();
