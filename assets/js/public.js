(function(){
  const store=window.NexoraStore, UI=window.NexoraUI, $=UI.$;
  let state=store.load('public'); let phaseFilter='', roundFilter='', teamFilter='', statusFilter='', playerTeamFilter='', standingsGroup='all';
  const FAVORITE_TEAM_KEY='new-generation-public-favorite-team-v1';
  let favoriteTeamId=loadFavoriteTeamId();
  const BRAND_LOGO='assets/brand/new-generation-logo-transparent.png';
  const PDF_COLORS={bg:[8,8,8],ink:[23,19,10],muted:[112,94,56],gold:[201,154,58],gold2:[255,235,176],paper:[255,252,241],line:[225,205,151]};
  const PUBLIC_ACTIVE_TAB_KEY='new-generation-public-active-tab-v1';
  const PUBLIC_FILTERS_KEY='new-generation-public-filter-state-v1';
  const PUBLIC_TABS=new Set(['home','teams','players','matches','bracket','articles','photos','search']);
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
  function sanitizeFavoriteTeam(){if(favoriteTeamId&&!store.getTeam(state,favoriteTeamId)){favoriteTeamId='';persistFavoriteTeamId();}}
  function setFavoriteTeam(teamId){favoriteTeamId=teamId||'';persistFavoriteTeamId();render();}
  function clearFavoriteTeam(){favoriteTeamId='';persistFavoriteTeamId();render();}
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
  function closeMatchFilterSheet(){const modal=$('#matchFilterSheet');if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');}
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
  function decorateFavoriteUI(){
    sanitizeFavoriteTeam();
    document.querySelectorAll('.is-favorite-team,.is-favorite-match').forEach(el=>el.classList.remove('is-favorite-team','is-favorite-match'));
    if(!favoriteTeamId)return;
    document.querySelectorAll(`[data-team-detail="${CSS.escape(favoriteTeamId)}"], [data-team-id="${CSS.escape(favoriteTeamId)}"]`).forEach(el=>el.classList.add('is-favorite-team'));
    document.querySelectorAll('[data-match-detail]').forEach(el=>{const m=state.matches.find(x=>x.id===el.dataset.matchDetail);if(m&&(m.homeTeamId===favoriteTeamId||m.awayTeamId===favoriteTeamId))el.classList.add('is-favorite-match');});
  }
  function renderHome(){document.title=UI.siteTitle?UI.siteTitle(state):(state.rules.name||'New Generation');const titleEl=$('#publicTitle');if(titleEl)titleEl.textContent=state.rules.name||'New Generation';const summaryEl=$('#publicSummary');if(summaryEl)summaryEl.innerHTML=UI.rulesSummary(state);const statsEl=$('#publicStats');if(statsEl)statsEl.innerHTML=UI.statsGrid(store.selectors.stats(state));renderLiveHome();renderFavoriteHome();const standingsMenu=$('#publicStandingsMenu');if(standingsMenu)standingsMenu.innerHTML=store.selectors.hasGroupStage(state)?UI.groupStandingsSelector(state,standingsGroup,'publicGroupStandingsFilter'):'';$('#publicStandings').innerHTML=store.selectors.hasGroupStage(state)?UI.groupStandingsTables(state,standingsGroup,{includeLive:true}):UI.standingsTable(store.selectors.calculateStandings(state,undefined,{includeLive:true}),state);$('#publicPlayersMini').innerHTML=UI.playerStatsTable(store.selectors.playerStats(state).filter(p=>p.goals>0).slice(0,10))+(state.rules.isKingsLeague?'<div class="mini-section-title margin-top"><h3>Presidenti marcatori</h3></div>'+UI.presidentStatsTable(store.selectors.presidentScorers(state).slice(0,10)):'');decorateFavoriteUI();}
  function renderTeams(){ $('#publicTeams').innerHTML=UI.teamGrid(state).replaceAll('data-favorite-placeholder="','data-favorite-team="'); decorateFavoriteUI(); }
  function renderPlayers(){ resetFiltersForNewState(); persistPublicFilters(); renderPlayerFilter(); $('#publicPlayers').innerHTML=UI.playerStatsTable(filteredPlayerStats()); }
  function renderPublicMatchCenter(){const slot=document.getElementById('publicMatchCenter');if(slot)slot.remove();}
  function renderMatches(){const slot=document.getElementById('publicMatchCenter');if(slot)slot.remove();resetFiltersForNewState();persistPublicFilters();renderFilters();$('#publicMatches').innerHTML=UI.matchList(state,filteredMatches(),true);decorateFavoriteUI();}
  function renderBracket(){const el=$('#publicBracket');if(el)el.innerHTML=UI.bracketMarkup(state);decorateFavoriteUI();}
  function renderArticles(){const el=$('#publicArticles');if(el)el.innerHTML=UI.articleList(store.selectors.articles(state),false);}

  // ---- Sezione Foto squadre (lato pubblico) ----
  let photosSelectedTeam = '';
  let publicLightboxIndex = -1;

  // Loader robusto immagini foto (desktop + mobile + refresh realtime)
  // ------------------------------------------------------------
  // Su mobile il problema più frequente è un errore temporaneo della thumbnail
  // o una richiesta lazy/stalled dopo refresh realtime. Il lightbox funziona perché
  // usa l'originale, quindi per dispositivi touch/schermi piccoli diamo priorità
  // all'originale e usiamo la thumbnail solo come alternativa. Il loader non si
  // affida a complete da solo: complete può essere true anche per immagini rotte.
  function attachSmartImageRetry(img, opts={}){
    if(!img) return;
    if(window.NGPhotoEngine){
      window.NGPhotoEngine.load(img, opts);
      return;
    }
    // Fallback minimo se photo-runtime.js non viene caricato.
    const thumb = img.closest('.photo-thumb');
    const primary = img.dataset.src || img.dataset.previewSrc || '';
    const original = img.dataset.fallbackSrc || img.dataset.originalSrc || primary;
    function mark(cls){
      if(!thumb) return;
      thumb.classList.remove('is-loading','is-loaded','is-broken');
      thumb.classList.add(cls);
    }
    mark('is-loading');
    img.onload = () => {
      if(img.naturalWidth > 0 || img.naturalHeight > 0) mark('is-loaded');
      else if(img.src !== original) img.src = original;
      else mark('is-broken');
    };
    img.onerror = () => {
      if(original && img.src !== original) img.src = original;
      else mark('is-broken');
    };
    img.src = primary || original;
  }

  // Reset manuale al click su "Riprova": riparte dalla thumb originale
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-photo-retry]');
    if(!btn) return;
    e.stopPropagation();
    const thumb = btn.closest('.photo-thumb');
    const img = thumb?.querySelector('img[data-src]');
    if(!img || !thumb) return;
    img.dataset.retries = '0';
    delete img.dataset.triedFallback;
    thumb.classList.remove('is-broken','is-loaded');
    thumb.classList.add('is-loading');
    attachSmartImageRetry(img, {force:true});
  });

  function renderPhotos(){
    const grid = $('#publicPhotosGrid');
    const dlBtn = $('#publicPhotosDownloadAllBtn');
    const teamBar = $('#publicPhotosTeamBar');
    const legacySel = $('#publicPhotosTeamFilter');
    if(legacySel) legacySel.hidden = true; // nascondo il vecchio select, uso pillole

    if(!grid || !teamBar) return;

    const Photos = window.NexoraPhotos;
    const photoStatus = Photos?.status?.() || {loaded:false, loading:false};
    const photosMap = Photos?.getTeamPhotoMap ? Photos.getTeamPhotoMap(state) : (state.teamPhotos || {});
    const teamsWithPhotos = (state.teams||[]).filter(t => Array.isArray(photosMap[t.id]) && photosMap[t.id].length>0);

    if(!photoStatus.loaded && Photos?.refreshAll){
      Photos.refreshAll().catch(()=>{});
      teamBar.innerHTML = '';
      teamBar.hidden = true;
      grid.innerHTML = '<div class="empty photos-empty"><div class="empty-icon">📷</div><div>Caricamento foto squadra…</div><small>Recupero immagini da Cloudinary.</small></div>';
      if(dlBtn) dlBtn.hidden = true;
      return;
    }

    if(!teamsWithPhotos.length){
      teamBar.innerHTML = '';
      teamBar.hidden = true;
      const err = photoStatus.error ? '<small>Cloudinary: '+UI.esc(photoStatus.error.message||photoStatus.error)+'</small>' : '<small>L\'admin caricherà presto le foto del torneo.</small>';
      grid.innerHTML = '<div class="empty photos-empty"><div class="empty-icon">📷</div><div>Nessuna foto pubblicata.</div>'+err+'</div>';
      if(dlBtn) dlBtn.hidden = true;
      photosSelectedTeam = '';
      return;
    }

    teamBar.hidden = false;
    if(photosSelectedTeam && !teamsWithPhotos.find(t=>t.id===photosSelectedTeam)) photosSelectedTeam = '';
    if(!photosSelectedTeam) photosSelectedTeam = teamsWithPhotos[0].id;

    // Pillole squadra scroll orizzontale (mobile-friendly).
    // Mostro il LOGO della squadra (più identificativo per riconoscerla a colpo d'occhio).
    teamBar.innerHTML = teamsWithPhotos.map(t=>{
      const count = (photosMap[t.id]||[]).length;
      const active = t.id===photosSelectedTeam ? ' active' : '';
      return `<button type="button" class="photos-team-pill${active}" data-photos-team="${UI.esc(t.id)}">
        ${UI.logo(t,false)}
        <span class="photos-team-name">${UI.esc(t.name)}</span>
        <span class="photos-team-count">${count}</span>
      </button>`;
    }).join('');
    // Scroll into view della pillola attiva (utile su mobile con tante squadre)
    requestAnimationFrame(()=>{
      const activePill = teamBar.querySelector('.photos-team-pill.active');
      if(activePill) activePill.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
    });

    const team = teamsWithPhotos.find(t=>t.id===photosSelectedTeam);
    const photos = window.NexoraPhotos ? window.NexoraPhotos.listTeamPhotos(state, team.id) : [];

    if(!photos.length){
      grid.innerHTML = '<div class="empty">Nessuna foto per questa squadra.</div>';
      grid.dataset.renderKey = '';
      if(dlBtn) dlBtn.hidden = true;
      return;
    }

    // ============================================================
    // RENDERING IDEMPOTENTE (fix: refresh lento)
    // ------------------------------------------------------------
    // Prima della fix, ad ogni cambio di state arrivato via Supabase
    // (anche update non legati alle foto, es. goal in una partita)
    // facevamo grid.innerHTML = ... ricreando da zero TUTTI gli <img>.
    // Il browser abortiva le richieste in volo e ne faceva partire di
    // nuove → al refresh la fetch dello state da Supabase arrivava
    // 100-500ms dopo il primo render, causando un aborto+restart di
    // tutte le richieste immagine, raddoppiando il tempo percepito.
    //
    // Soluzione: confronto i path delle foto già renderizzate con
    // quelli nuovi. Se sono gli stessi (caso comune!), NON tocco il
    // DOM e gli <img> in caricamento continuano indisturbati.
    // Se cambia solo un sottoinsieme (es. una foto aggiunta o
    // rimossa), faccio un diff minimale invece di nuke+rebuild.
    // ============================================================
    const renderKey = team.id + '|' + photos.map(p=>p.path).join(',');
    if(grid.dataset.renderKey === renderKey){
      // Identico: non ricreo il DOM, ma sincronizzo comunque gli URL e
      // riavvio solo le card rimaste in errore dopo refresh/realtime.
      const byPath = new Map();
      grid.querySelectorAll('.photo-thumb[data-photo-path]').forEach(el => byPath.set(el.dataset.photoPath, el));
      photos.forEach((p, i) => {
        const el = byPath.get(p.path);
        if(!el) return;
        el.dataset.publicPhotoOpen = i;
        const img = el.querySelector('img[data-src]');
        const nextSrc = p.thumbUrl || p.url || '';
        const nextFallback = p.originalUrl || p.url || '';
        if(img){
          const changed = img.dataset.src !== nextSrc || img.dataset.fallbackSrc !== nextFallback;
          if(changed){
            img.dataset.src = nextSrc;
            img.dataset.fallbackSrc = nextFallback;
            img.dataset.previewSrc = nextSrc;
            img.dataset.originalSrc = nextFallback;
            img.dataset.photoVersion = String(p.ts || p.path || i);
          }
          attachSmartImageRetry(img, {force: changed || el.classList.contains('is-broken')});
        }
        const dl = el.querySelector('.photo-download-btn');
        if(dl) dl.href = p.downloadUrl || nextFallback;
      });
      if(dlBtn){
        dlBtn.hidden = false;
        dlBtn.disabled = false;
        dlBtn.innerHTML = `<span class="dl-icon">⬇</span> Scarica tutte <strong>(${photos.length})</strong> ZIP`;
      }
      return;
    }
    // Se cambia solo la squadra selezionata, nuke+rebuild è giusto
    // (foto completamente diverse). Se cambia la lista nella STESSA
    // squadra, provo l'update incrementale.
    const prevKey = grid.dataset.renderKey || '';
    const prevTeamId = prevKey.split('|')[0];
    const sameTeam = prevTeamId === team.id && prevKey !== '';
    const existingByPath = new Map();
    if(sameTeam){
      grid.querySelectorAll('.photo-thumb[data-photo-path]').forEach(el => {
        existingByPath.set(el.dataset.photoPath, el);
      });
    }

    function buildThumb(p, i){
      const loadStrategy = i < 6 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
      const imgSrc = UI.esc(p.thumbUrl||p.url);
      const fallbackSrc = UI.esc(p.originalUrl||p.url);
      const thumbPathAttr = p.thumbPath ? ` data-thumb-path="${UI.esc(p.thumbPath)}"` : '';
      const fig = document.createElement('figure');
      fig.className = 'photo-thumb public is-loading';
      fig.dataset.publicPhotoOpen = i;
      fig.dataset.photoPath = p.path;
      // Solo le foto nuove (non già nel DOM) hanno l'animazione di entrata.
      // Le foto già caricate non rifanno il fade-in: percepito come "istantaneo".
      fig.style.setProperty('--enter-delay', Math.min(i*15, 180) + 'ms');
      fig.innerHTML = `
      <div class="photo-img-wrap">
        <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" data-photo-managed="1" data-src="${imgSrc}" data-fallback-src="${fallbackSrc}" data-preview-src="${imgSrc}" data-original-src="${fallbackSrc}" data-photo-version="${UI.esc(String(p.ts||p.path||i))}"${thumbPathAttr} data-retries="0" alt="" ${loadStrategy} decoding="async" />
        <div class="photo-status photo-status-loading" aria-hidden="true">
          <span class="photo-status-dots"><span></span><span></span><span></span></span>
          <span class="photo-status-text">Recupero dati, attendere…</span>
        </div>
        <div class="photo-status photo-status-error" aria-hidden="true">
          <span class="photo-status-icon">📷</span>
          <span class="photo-status-text">Foto non disponibile</span>
          <button type="button" class="photo-status-retry" data-photo-retry aria-label="Riprova caricamento">Riprova</button>
        </div>
      </div>
      <figcaption>
        <span class="photo-name" title="${UI.esc(p.name)}">${UI.esc(p.name)}</span>
        <a href="${UI.esc(p.downloadUrl||p.originalUrl||p.url)}" download="${UI.esc(p.name)}" class="photo-download-btn" aria-label="Scarica foto" title="Scarica originale" onclick="event.stopPropagation()">⬇</a>
      </figcaption>`;
      return fig;
    }

    if(!sameTeam || existingByPath.size === 0){
      // Cambio squadra o griglia vuota: build full ma con DocumentFragment
      // (più veloce e meno reflow rispetto a innerHTML)
      const frag = document.createDocumentFragment();
      photos.forEach((p, i) => frag.appendChild(buildThumb(p, i)));
      grid.innerHTML = '';
      grid.appendChild(frag);
    } else {
      // Stessa squadra, lista parzialmente cambiata: diff in-place SENZA
      // rimuovere tutti i nodi (così l'animazione di entrata NON ri-parte
      // sui thumb già visibili).
      const stillUsed = new Set();
      // 1. Rimuovo i mancanti
      existingByPath.forEach((el, path) => {
        if(!photos.find(p => p.path === path)) el.remove();
      });
      // 2. Posiziono ogni foto al posto giusto, inserendo i nuovi
      photos.forEach((p, i) => {
        let el = existingByPath.get(p.path);
        const refNode = grid.children[i] || null;
        if(el){
          stillUsed.add(p.path);
          if(refNode !== el){
            grid.insertBefore(el, refNode);
          }
          el.dataset.publicPhotoOpen = i;
          const exImg = el.querySelector('img[data-src]');
          const nextSrc = p.thumbUrl || p.url || '';
          const nextFallback = p.originalUrl || p.url || '';
          if(exImg){
            const changed = exImg.dataset.src !== nextSrc || exImg.dataset.fallbackSrc !== nextFallback;
            if(changed){
              exImg.dataset.src = nextSrc;
              exImg.dataset.fallbackSrc = nextFallback;
              exImg.dataset.previewSrc = nextSrc;
              exImg.dataset.originalSrc = nextFallback;
              exImg.dataset.photoVersion = String(p.ts || p.path || i);
            }
            attachSmartImageRetry(exImg, {force: changed || el.classList.contains('is-broken')});
          }
          const dl = el.querySelector('.photo-download-btn');
          if(dl) dl.href = p.downloadUrl || nextFallback;
        } else {
          el = buildThumb(p, i);
          grid.insertBefore(el, refNode);
        }
      });
    }
    grid.dataset.renderKey = renderKey;
    // Attivo retry inteligente su ogni img della griglia (idempotente:
    // se già montato salta via dataset.retryBound)
    grid.querySelectorAll('img[data-src]').forEach(img => attachSmartImageRetry(img));

    if(dlBtn){
      dlBtn.hidden = false;
      dlBtn.disabled = false;
      dlBtn.innerHTML = `<span class="dl-icon">⬇</span> Scarica tutte <strong>(${photos.length})</strong> ZIP`;
    }
  }

  // Lightbox pubblico
  function ensurePublicLightbox(){
    if($('#publicPhotosLightbox')) return;
    const lb = document.createElement('div');
    lb.id = 'publicPhotosLightbox';
    lb.className = 'photos-lightbox';
    lb.setAttribute('aria-hidden','true');
    lb.innerHTML = `
      <button type="button" class="lightbox-close" aria-label="Chiudi">×</button>
      <button type="button" class="lightbox-nav lightbox-prev" aria-label="Precedente">‹</button>
      <button type="button" class="lightbox-nav lightbox-next" aria-label="Successiva">›</button>
      <div class="lightbox-stage"><img class="lightbox-img" alt="" /></div>
      <div class="lightbox-bar">
        <div class="lightbox-meta"><span class="lightbox-name"></span><small class="lightbox-counter"></small></div>
        <a class="lightbox-download btn small" download href="#">⬇ Scarica</a>
      </div>`;
    document.body.appendChild(lb);
    const img = lb.querySelector('.lightbox-img');
    let isZoomed = false;
    function toggleZoom(){
      isZoomed = !isZoomed;
      img.classList.toggle('is-zoomed', isZoomed);
    }
    lb.addEventListener('click', e=>{
      if(e.target.matches('.lightbox-close, .photos-lightbox, .lightbox-stage')) closePublicLightbox();
      else if(e.target.matches('.lightbox-prev')) navPublicLightbox(-1);
      else if(e.target.matches('.lightbox-next')) navPublicLightbox(1);
    });
    let lastTap = 0;
    img.addEventListener('click', e=>{
      e.stopPropagation();
      const now = Date.now();
      if(now - lastTap < 300){ toggleZoom(); lastTap = 0; }
      else lastTap = now;
    });
    document.addEventListener('keydown', e=>{
      if(!lb.classList.contains('open')) return;
      if(e.key === 'Escape') closePublicLightbox();
      else if(e.key === 'ArrowLeft') navPublicLightbox(-1);
      else if(e.key === 'ArrowRight') navPublicLightbox(1);
    });
    // Swipe gesture per mobile
    let touchStartX = 0;
    lb.addEventListener('touchstart', e=>{ touchStartX = e.touches[0].clientX; }, {passive:true});
    lb.addEventListener('touchend', e=>{
      if(isZoomed) return;
      const dx = (e.changedTouches[0].clientX - touchStartX);
      if(Math.abs(dx) > 50) navPublicLightbox(dx < 0 ? 1 : -1);
    }, {passive:true});
  }

  function openPublicLightbox(idx){
    ensurePublicLightbox();
    publicLightboxIndex = idx;
    updatePublicLightboxContent();
    const lb = $('#publicPhotosLightbox');
    lb.classList.add('open');
    lb.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closePublicLightbox(){
    const lb = $('#publicPhotosLightbox');
    if(lb){ lb.classList.remove('open'); lb.setAttribute('aria-hidden','true'); }
    document.body.style.overflow = '';
    publicLightboxIndex = -1;
  }
  function navPublicLightbox(delta){
    const photos = window.NexoraPhotos ? window.NexoraPhotos.listTeamPhotos(state, photosSelectedTeam) : [];
    if(!photos.length) return;
    publicLightboxIndex = (publicLightboxIndex + delta + photos.length) % photos.length;
    updatePublicLightboxContent();
  }
  function updatePublicLightboxContent(){
    const photos = window.NexoraPhotos ? window.NexoraPhotos.listTeamPhotos(state, photosSelectedTeam) : [];
    const p = photos[publicLightboxIndex];
    if(!p) return closePublicLightbox();
    const lb = $('#publicPhotosLightbox');
    const img = lb.querySelector('.lightbox-img');
    // Progressive loading: mostro SUBITO la thumb (già in cache dalla griglia) per apertura istantanea,
    // poi cambio in background all'originale HD appena scaricato.
    const thumbSrc = p.thumbUrl || p.url;
    const hdSrc = p.largeUrl || p.originalUrl || p.url;
    img.src = thumbSrc;
    img.alt = p.name;
    // Preload HD: appena pronto sostituisce la thumb. Niente flicker (stessa immagine, solo più dettaglio).
    if(hdSrc && hdSrc !== thumbSrc){
      const preloader = new Image();
      preloader.onload = () => {
        // Verifico che il lightbox sia ancora aperto su questa stessa foto
        if(lb.classList.contains('open') && img.alt === p.name){
          img.src = hdSrc;
        }
      };
      preloader.src = hdSrc;
    }
    lb.querySelector('.lightbox-name').textContent = p.name;
    lb.querySelector('.lightbox-counter').textContent = `${publicLightboxIndex+1} / ${photos.length}`;
    const dl = lb.querySelector('.lightbox-download');
    dl.href = p.downloadUrl || p.originalUrl || hdSrc;
    dl.setAttribute('download', p.name);
  }

  // Click su pillole + apertura foto + click change retrocompatibile
  document.addEventListener('click', e => {
    const pill = e.target.closest('[data-photos-team]');
    if(pill){
      photosSelectedTeam = pill.dataset.photosTeam;
      renderPhotos();
      return;
    }
    const opener = e.target.closest('[data-public-photo-open]');
    if(opener){
      const idx = Number(opener.dataset.publicPhotoOpen);
      if(!Number.isNaN(idx)) openPublicLightbox(idx);
      return;
    }
  });

  document.addEventListener('change', e => {
    if(e.target?.id === 'publicPhotosTeamFilter'){
      photosSelectedTeam = e.target.value;
      renderPhotos();
    }
  });

  // Click "Scarica tutte" → ZIP via NexoraPhotos con UX progress
  document.addEventListener('click', async e => {
    if(e.target?.closest?.('#publicPhotosDownloadAllBtn')){
      const btn = $('#publicPhotosDownloadAllBtn');
      const team = (state.teams||[]).find(t=>t.id===photosSelectedTeam);
      if(!team || !window.NexoraPhotos) return;
      const origHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-dot"></span> Preparazione ZIP...';
      try{
        await window.NexoraPhotos.downloadAllAsZip(state, team.id, team.name);
        btn.innerHTML = '✓ Scaricato';
        setTimeout(()=>{ btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
      }catch(err){
        btn.innerHTML = '✗ Errore';
        setTimeout(()=>{ btn.innerHTML = origHtml; btn.disabled = false; }, 3000);
      }
    }
  });

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
  function drawPdfLogo(doc,src,x,y,size,fallback='NG'){
    if(src){try{doc.addImage(src,'PNG',x,y,size,size,undefined,'FAST');return;}catch(_){}}
    setRgb(doc,'setFillColor',PDF_COLORS.gold);doc.roundedRect(x,y,size,size,5,5,'F');setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(Math.max(8,size*.28));doc.text(String(fallback||'NG').slice(0,2).toUpperCase(),x+size/2,y+size*.6,{align:'center'});
  }
  function addTeamPdfFooter(doc){
    const pages=doc.internal.getNumberOfPages();
    for(let i=1;i<=pages;i++){doc.setPage(i);const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();setRgb(doc,'setDrawColor',PDF_COLORS.gold);doc.setLineWidth(.25);doc.line(14,h-13,w-14,h-13);setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(`Pagina ${i}/${pages}`,w-14,h-8,{align:'right'});doc.text('Scheda squadra generata dalla pagina pubblica',14,h-8);}
  }
  function teamStatsForPdf(s,teamId){
    const rows=store.selectors.calculateStandings(s);
    return rows.find(r=>r.teamId===teamId)||{played:0,points:0,goalsFor:0,goalsAgainst:0,diff:0};
  }
  function nonKnockoutMatchesForTeam(s,teamId){
    return (s.matches||[]).filter(m=>m.phase!=='knockout'&&(m.homeTeamId===teamId||m.awayTeamId===teamId)).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||''))||((a.roundIndex||0)-(b.roundIndex||0)));
  }
  async function downloadTeamPdf(teamId){
    const team=store.getTeam(state,teamId); if(!team) return;
    if(!window.jspdf||!window.jspdf.jsPDF){alert('Librerie PDF non disponibili. Controlla la connessione e riprova.');return;}
    const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation:'p',unit:'mm',format:'a4',compress:true});
    const brandLogo=await dataUrlFromImage(BRAND_LOGO); const teamLogo=await dataUrlFromImage(team.logo);
    const w=doc.internal.pageSize.getWidth();
    setRgb(doc,'setFillColor',PDF_COLORS.bg);doc.rect(0,0,w,48,'F');drawPdfLogo(doc,brandLogo,w/2-13,7,26,state.rules?.name||'NG');
    setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(String(state.rules?.name||'New Generation').toUpperCase(),w/2,39,{align:'center'});
    setRgb(doc,'setFillColor',PDF_COLORS.paper);doc.roundedRect(12,55,w-24,44,8,8,'F');drawPdfLogo(doc,teamLogo,20,62,28,team.name);
    setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(22);doc.text(String(team.name||'Squadra'),55,74,{maxWidth:w-70});
    doc.setFont('helvetica','normal');doc.setFontSize(9);setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.text(`Presidente: ${team.president?.name||'Non inserito'}  ·  Allenatore: ${team.coach?.name||'Non inserito'}`,55,83,{maxWidth:w-70});
    const st=teamStatsForPdf(state,teamId);
    const chips=[['Punti',st.points],['PG',st.played],['GF',st.goalsFor],['GS',st.goalsAgainst],['DR',(st.diff>0?'+':'')+st.diff]];
    chips.forEach((c,i)=>{const x=20+i*34,y=106;setRgb(doc,'setFillColor',[255,248,226]);setRgb(doc,'setDrawColor',PDF_COLORS.line);doc.roundedRect(x,y,28,17,4,4,'FD');setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFontSize(6.8);doc.text(c[0],x+14,y+5,{align:'center'});setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(String(c[1]),x+14,y+12,{align:'center'});});
    if(doc.autoTable){
      doc.autoTable({startY:132,head:[['Composizione tecnica','Nome','Anno']],body:[['Presidente',team.president?.name||'Non inserito','-'],['Allenatore',team.coach?.name||'Non inserito','-'],...(team.players||[]).map(p=>['Calciatore',p.name,p.birthYear||'-'])],styles:{font:'helvetica',fontSize:8,cellPadding:2.4,textColor:PDF_COLORS.ink,lineColor:PDF_COLORS.line,lineWidth:.1},headStyles:{fillColor:PDF_COLORS.ink,textColor:PDF_COLORS.gold2,fontStyle:'bold'},alternateRowStyles:{fillColor:[255,249,231]},columnStyles:{0:{cellWidth:38,fontStyle:'bold'},1:{cellWidth:95},2:{halign:'center'}}});
      let y=(doc.lastAutoTable?.finalY||132)+10; if(y>215){doc.addPage();y=20;}
      const matches=nonKnockoutMatchesForTeam(state,teamId).map(m=>{const isHome=m.homeTeamId===teamId;const other=store.teamName(state,isHome?m.awayTeamId:m.homeTeamId,isHome?m.awayLabel:m.homeLabel);return {phase:store.PHASE_LABELS[m.phase]||m.phase,round:m.round||'-',where:isHome?'Casa':'Trasferta',opponent:other,date:UI.fmtDate(m),field:m.field||'Campo da definire',score:store.hasScore(state,m)?store.scoreText(state,m):'Da giocare'};});
      doc.autoTable({startY:y,head:[['Partite gironi/campionato','Avversaria','Data','Campo','Risultato']],body:matches.length?matches.map(m=>[`${m.round} · ${m.where}`,m.opponent,m.date,m.field,m.score]):[['Nessuna partita non a eliminazione diretta','-','-','-','-']],styles:{font:'helvetica',fontSize:7.4,cellPadding:2.2,textColor:PDF_COLORS.ink,lineColor:PDF_COLORS.line,lineWidth:.1},headStyles:{fillColor:PDF_COLORS.ink,textColor:PDF_COLORS.gold2,fontStyle:'bold'},alternateRowStyles:{fillColor:[255,249,231]},columnStyles:{0:{cellWidth:46},1:{cellWidth:45,fontStyle:'bold'},2:{cellWidth:42},3:{cellWidth:34},4:{cellWidth:25,halign:'center',fontStyle:'bold'}}});
    }
    addTeamPdfFooter(doc); doc.save(`${slug(state.rules?.name)}-${slug(team.name)}-scheda-squadra.pdf`);
  }

  let lastTeamTrigger=null;
  function teamRecord(teamId){
    const rows=store.selectors.calculateStandings(state);
    return rows.find(r=>r.teamId===teamId)||{played:0,points:0,goalsFor:0,goalsAgainst:0,diff:0};
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
  function closeTeamModal(){const modal=$('#teamModal');if(!modal)return;modal.classList.remove('open');document.body.classList.remove('modal-open');if(lastTeamTrigger&&document.contains(lastTeamTrigger))lastTeamTrigger.focus?.();}
  function teamDetailMarkup(team){
    const rec=teamRecord(team.id);
    const playerStats=store.selectors.playerStats(state).filter(p=>p.teamId===team.id);
    const topPlayers=playerStats.slice().sort((a,b)=>b.goals-a.goals||b.played-a.played||a.name.localeCompare(b.name)).slice(0,6);
    const president=store.selectors.presidentStats(state).find(p=>p.teamId===team.id);
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
      return `<li class="roster-li-with-num"><span class="roster-num-col">${numBadge}</span><span class="roster-name-col"><strong>${UI.esc(p.name)}</strong><span class="roster-meta">${p.birthYear?UI.esc(p.birthYear):'Anno n.d.'} · PG ${st.played} · Gol ${st.goals}</span></span></li>`;
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
        <div class="pro-team-title"><span class="pill">${rec.played?`PG ${rec.played}`:'Squadra'}</span><h2>${UI.esc(team.name)}</h2><p>${team.president?.name?`Presidente: ${UI.esc(team.president.name)}`:'Presidente non inserito'}${team.coach?.name?` · Allenatore: ${UI.esc(team.coach.name)}`:''}</p><div class="favorite-hero-action">${favoriteButton(team.id,'Segui')}</div></div>
      </div>
      <div class="team-sheet-kpis">
        <div><strong>${rec.points||0}</strong><span>Punti</span></div><div><strong>${rec.goalsFor||0}</strong><span>Gol fatti</span></div><div><strong>${rec.goalsAgainst||0}</strong><span>Gol subiti</span></div><div><strong>${rec.diff>0?'+':''}${rec.diff||0}</strong><span>Diff.</span></div>
      </div>
      <div class="team-sheet-grid">
        <section class="team-sheet-panel"><h3>Composizione tecnica</h3><div class="staff-cards"><div><span>Presidente</span><strong>${team.president?.name?UI.esc(team.president.name):'Non inserito'}</strong><small>${president?`PG ${president.played} · Gol ${president.goals}`:'Stats non disponibili'}</small></div><div><span>Allenatore</span><strong>${team.coach?.name?UI.esc(team.coach.name):'Non inserito'}</strong><small>Ruolo tecnico</small></div></div></section>
        <section class="team-sheet-panel"><h3>Top giocatori</h3>${topPlayers.length?topPlayers.map(p=>`<div class="team-leader-row"><strong>${UI.esc(p.name)}</strong><span>Gol ${p.goals} · PG ${p.played}</span></div>`).join(''):'<div class="empty small">Nessuna statistica.</div>'}</section>
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

  function renderSearch(){const q=($('#globalSearch').value||'').trim().toLowerCase();const box=$('#searchResults');if(!q){box.innerHTML='<div class="empty">Scrivi per cercare squadre, giocatori o partite.</div>';return;}const teams=state.teams.filter(t=>t.name.toLowerCase().includes(q)).map(t=>`<div class="team-row search-team-result" data-team-id="${UI.esc(t.id)}">${UI.logo(t)}<div><strong>${UI.esc(t.name)}</strong><p class="muted">${t.players.length} calciatori${t.president?.name?` · Presidente: ${UI.esc(t.president.name)}`:''}${t.coach?.name?` · Allenatore: ${UI.esc(t.coach.name)}`:''}</p></div><div class="row-actions">${favoriteButton(t.id,'Segui')}<button class="btn small" data-team-detail="${UI.esc(t.id)}" type="button">Scheda</button><button class="btn small primary" data-team-pdf="${UI.esc(t.id)}" type="button">PDF</button></div></div>`);const stats=store.selectors.playerStats(state);const players=stats.filter(p=>p.name.toLowerCase().includes(q)||p.teamName.toLowerCase().includes(q)).map(p=>`<div class="player-row"><div><strong>${UI.esc(p.name)}</strong><p class="muted">${UI.esc(p.teamName)}${p.birthYear?' · '+UI.esc(p.birthYear):''}</p></div><span class="pill">PG ${p.played} · Gol ${p.goals} · 🟨 ${p.yellow} · 🟥 ${p.red}</span></div>`);const presidents=state.rules.isKingsLeague?store.selectors.presidentStats(state).filter(p=>p.name.toLowerCase().includes(q)||p.teamName.toLowerCase().includes(q)).map(p=>`<div class="player-row"><div><strong>Pres. ${UI.esc(p.name)}</strong><p class="muted">${UI.esc(p.teamName)}</p></div><span class="pill">PG ${p.played} · Gol ${p.goals}</span></div>`):[];const matches=state.matches.filter(m=>`${store.teamName(state,m.homeTeamId,m.homeLabel)} ${store.teamName(state,m.awayTeamId,m.awayLabel)} ${m.round} ${m.referee} ${m.field}`.toLowerCase().includes(q)).map(m=>UI.matchCard(state,m,true));const articles=store.selectors.articles(state).filter(a=>`${a.title} ${a.body}`.toLowerCase().includes(q)).map(a=>UI.articleCard(a,false));box.innerHTML=[...teams,...players,...presidents,...matches,...articles].join('')||`<div class="empty">Nessun risultato per “${UI.esc(q)}”.</div>`;decorateFavoriteUI();}
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
  function drawTextFit(ctx,text,x,y,maxWidth,fontSize=42,weight='900',align='center',color='#fff'){ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;let size=fontSize;do{ctx.font=`${weight} ${size}px Arial, sans-serif`;if(ctx.measureText(text).width<=maxWidth||size<=18)break;size-=2;}while(size>18);ctx.fillText(text,x,y,maxWidth);}
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
      if(img){ctx.save();roundRectPath(ctx,x-64,y-64,128,128,24);ctx.clip();ctx.drawImage(img,x-64,y-64,128,128);ctx.restore();}
      else{ctx.fillStyle='#e6c760';ctx.font='900 42px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(name||'?').slice(0,2).toUpperCase(),x,y);ctx.textBaseline='alphabetic';}
    }
    drawLogo(homeLogo,300,375,home);drawLogo(awayLogo,1300,375,away);
    drawTextFit(ctx,home,300,535,430,62,'900');drawTextFit(ctx,away,1300,535,430,62,'900');
    roundRectPath(ctx,650,300,300,190,34);ctx.fillStyle='rgba(0,0,0,.36)';ctx.fill();ctx.strokeStyle='rgba(230,199,96,.66)';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=played?'#7ff0bc':'#ff4c55';ctx.font='900 26px Arial';ctx.textAlign='center';ctx.fillText(played?'GIOCATA':'DA GIOCARE',800,345);
    ctx.fillStyle='#fff';ctx.font='950 82px Arial';ctx.fillText(played?`${score.home} - ${score.away}`:'VS',800,430);
    const meta=[['CAMPO',m.field||'Da definire'],['ARBITRO',m.referee||'Da definire'],['DATA',UI.fmtDate(m)]];
    meta.forEach((it,i)=>{const x=130+i*450;roundRectPath(ctx,x,650,390,104,22);ctx.fillStyle='rgba(0,0,0,.42)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#e6c760';ctx.font='900 19px Arial';ctx.textAlign='left';ctx.fillText(it[0],x+28,690);ctx.fillStyle='#fff';ctx.font='850 28px Arial';ctx.fillText(it[1],x+28,725,330);});
    const goals=(m.goals||[]).map(g=>store.playerName(state,g.playerId)).filter(Boolean).slice(0,10).join(' · ')||'Nessun marcatore';
    roundRectPath(ctx,130,810,W-260,94,22);ctx.fillStyle='rgba(0,0,0,.34)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#e6c760';ctx.font='900 20px Arial';ctx.textAlign='left';ctx.fillText('MARCATORI',160,848);ctx.fillStyle='#fff';ctx.font='850 28px Arial';ctx.fillText(goals,160,884,W-320);
    return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob),'image/png',.98));
  }
  async function shareMatchImage(m,btn){
    const old=btn?.textContent; if(btn){btn.disabled=true;btn.textContent='Preparo immagine...';}
    try{
      const blob=await buildMatchShareImage(m); if(!blob)throw new Error('Immagine non generata');
      const file=new File([blob],`new-generation-${m.id||'partita'}.png`,{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file]});}
      else{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1200);}
    }catch(err){alert('Condivisione immagine non disponibile su questo dispositivo: ho scaricato la card partita.');try{const blob=await buildMatchShareImage(m);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`new-generation-${m.id||'partita'}.png`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1200);}catch(_){} }
    finally{if(btn){btn.disabled=false;btn.textContent=old;}}
  }
  function publicMatchDetailMarkup(m){
    const homeT=store.getTeam(state,m.homeTeamId), awayT=store.getTeam(state,m.awayTeamId);
    const home=store.teamName(state,m.homeTeamId,m.homeLabel), away=store.teamName(state,m.awayTeamId,m.awayLabel);
    const score=store.matchGoals(state,m);
    const isLive=m.status==='live';
    const played=store.hasScore(state,m)||m.status==='played';
    const showScore=played||isLive||(store.hasGoals&&store.hasGoals(state,m));
    const homeGoals=[], awayGoals=[], yellow=[], red=[];
    (m.goals||[]).forEach(g=>{const p=store.getParticipant(state,g.playerId);const row={icon:'⚽',kind:'goal',name:store.playerName(state,g.playerId),meta:Number(g.weight)===2?'Gol doppio Kings League':''};if(p?.team?.id===m.homeTeamId)homeGoals.push(row);else if(p?.team?.id===m.awayTeamId)awayGoals.push(row);else homeGoals.push(row);});
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
  function showMatch(id){const m=state.matches.find(x=>x.id===id);if(!m)return;$('#matchModalBody').innerHTML=publicMatchDetailMarkup(m);const modal=$('#matchModal');modal.classList.add('public-match-modal');modal.classList.add('open');document.body.classList.add('modal-open');setTimeout(()=>$('#closeModal')?.focus(),0);}
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
    modal.innerHTML=`<div class="modal-content article-modal-content"><div class="article-modal-toolbar"><div><span class="article-kicker">News completa</span><h2 id="articleModalTitle">Articolo</h2></div><button class="btn danger article-modal-close" id="closeArticleModal" type="button">Chiudi</button></div><div id="articleModalBody"></div></div>`;
    document.body.appendChild(modal);
    return modal;
  }
  function closeArticleModal(){const modal=$('#articleModal');if(!modal)return;modal.classList.remove('open');document.body.classList.remove('modal-open');if(lastArticleTrigger&&document.contains(lastArticleTrigger))lastArticleTrigger.focus?.();}
  function showArticle(id,trigger=null){const article=store.selectors.articles(state).find(x=>x.id===id);if(!article)return;lastArticleTrigger=trigger;const modal=ensureArticleModal();$('#articleModalTitle').textContent=article.title||'Articolo';$('#articleModalBody').innerHTML=UI.articleDetail(article);modal.classList.add('open');document.body.classList.add('modal-open');setTimeout(()=>$('#closeArticleModal')?.focus(),0);}
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

  function render(opts={}){
    // skipAlign=true quando lo state arriva già normalizzato (es. da Supabase via publishPublicState)
    if(!opts.skipAlign) store.alignState(state);
    try{UI.applySiteTheme(state);}catch(e){}
    sanitizeFavoriteTeam();
    // Differisco il save() su localStorage al prossimo idle (no block del thread).
    deferredSave();
    resetFiltersForNewState();
    persistPublicFilters();
    renderHome();renderTeams();renderPlayers();renderMatches();renderBracket();renderArticles();renderPhotos();renderSearch();
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
  document.addEventListener('ng:tab-changed',e=>{const tab=e.detail?.tab;if(PUBLIC_TABS.has(tab)&&!e.detail?.restored)safeSessionSet(PUBLIC_ACTIVE_TAB_KEY,tab);});
  $('#publicPhaseFilter').addEventListener('change',e=>{phaseFilter=e.target.value;persistPublicFilters();renderMatches();});$('#publicRoundFilter').addEventListener('change',e=>{roundFilter=e.target.value;persistPublicFilters();renderMatches();});$('#publicTeamFilter').addEventListener('change',e=>{teamFilter=e.target.value;persistPublicFilters();renderMatches();});$('#publicPlayerTeamFilter')?.addEventListener('change',e=>{playerTeamFilter=e.target.value;persistPublicFilters();renderPlayers();});document.addEventListener('change',e=>{if(e.target.id==='publicGroupStandingsFilter'){standingsGroup=e.target.value||'all';persistPublicFilters();renderHome();}});$('#globalSearch').addEventListener('input',()=>{persistPublicFilters();renderSearch();});document.addEventListener('click',async e=>{const filterOpener=e.target.closest('[data-open-match-filter]');if(filterOpener){e.preventDefault();openMatchFilterSheet(filterOpener.dataset.openMatchFilter);return;}const filterChoice=e.target.closest('[data-filter-type]');if(filterChoice){e.preventDefault();setMatchFilter(filterChoice.dataset.filterType,filterChoice.dataset.filterValue||'');return;}if(e.target.closest('[data-close-match-filter]')||e.target.id==='matchFilterSheet'){e.preventDefault();closeMatchFilterSheet();return;}if(e.target.closest('[data-clear-match-filters]')){e.preventDefault();phaseFilter='';roundFilter='';teamFilter='';statusFilter='';persistPublicFilters();renderMatches();return;}const presetBtn=e.target.closest('[data-match-preset]');if(presetBtn){e.preventDefault();statusFilter=presetBtn.dataset.matchPreset==='all'?'':presetBtn.dataset.matchPreset;persistPublicFilters();renderMatches();return;}const shareBtn=e.target.closest('[data-share-match]');if(shareBtn){e.preventDefault();const m=state.matches.find(x=>x.id===shareBtn.dataset.shareMatch);if(m){if(m.status==='live'){alert('La condivisione immagine è disponibile solo per partite concluse.');return;}await shareMatchImage(m,shareBtn);}return;}const favBtn=e.target.closest('[data-favorite-team]');if(favBtn){e.preventDefault();e.stopPropagation();const id=favBtn.dataset.favoriteTeam;if(isFavoriteTeam(id))clearFavoriteTeam();else setFavoriteTeam(id);return;}if(e.target.closest('[data-clear-favorite]')){e.preventDefault();clearFavoriteTeam();return;}if(e.target.closest('[data-open-teams-tab]')){e.preventDefault();document.querySelector('[data-tab="teams"]')?.click();return;}const favMatchBtn=e.target.closest('[data-filter-favorite-matches]');if(favMatchBtn){e.preventDefault();teamFilter=favMatchBtn.dataset.filterFavoriteMatches||favoriteTeamId;persistPublicFilters();document.querySelector('[data-tab="matches"]')?.click();renderMatches();return;}const teamTarget=e.target.closest('[data-team-detail]');if(teamTarget){e.preventDefault();showTeamDetail(teamTarget.dataset.teamDetail,teamTarget);return;}const pdfBtn=e.target.closest('[data-team-pdf]');if(pdfBtn){pdfBtn.disabled=true;const oldPdf=pdfBtn.textContent;pdfBtn.textContent='Genero PDF...';try{await downloadTeamPdf(pdfBtn.dataset.teamPdf);}catch(err){alert('Errore PDF squadra: '+(err.message||err));}finally{pdfBtn.disabled=false;pdfBtn.textContent=oldPdf;}return;}const articleTarget=e.target.closest('[data-article-open]');if(articleTarget && !e.target.closest('[data-edit-article],[data-delete-article]')){e.preventDefault();e.stopPropagation();showArticle(articleTarget.dataset.articleOpen||articleTarget.closest('[data-article-open]')?.dataset.articleOpen,articleTarget);return;}const card=e.target.closest('[data-match-detail]');if(card){e.preventDefault();showMatch(card.dataset.matchDetail);return;}if(e.target.id==='closeModal'||e.target.id==='matchModal'){const mm=$('#matchModal');mm.classList.remove('open');mm.classList.remove('public-match-modal');document.body.classList.remove('modal-open');}if(e.target.id==='closeArticleModal'||e.target.id==='articleModal')closeArticleModal();if(e.target.id==='closeTeamModal'||e.target.id==='teamModal')closeTeamModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeArticleModal();closeTeamModal();closeMatchFilterSheet();}if((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('[data-team-detail]')){e.preventDefault();showTeamDetail(e.target.dataset.teamDetail,e.target);return;}if((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('[data-article-open]')){e.preventDefault();showArticle(e.target.dataset.articleOpen,e.target);return;}const matchTarget=e.target?.closest?.('[data-match-detail]');if((e.key==='Enter'||e.key===' ')&&matchTarget){e.preventDefault();showMatch(matchTarget.dataset.matchDetail);}});

  document.addEventListener('error',e=>{const img=e.target?.closest?.('img.article-image');if(img)UI.replaceBrokenArticleImage(img);},true);
  document.addEventListener('load',e=>{
    const img=e.target?.closest?.('img.article-image');
    if(!img)return;
    img.closest('.article-media')?.classList.add('image-ready');
    const detailFrame=img.closest('.article-detail-frame');
    if(detailFrame && img.naturalWidth && img.naturalHeight){
      detailFrame.style.setProperty('--article-natural-w', img.naturalWidth + 'px');
      detailFrame.style.setProperty('--article-natural-h', img.naturalHeight + 'px');
      detailFrame.classList.add('natural-size-ready');
    }
  },true);

  function setupMobileNavigation(){
    if(document.querySelector('.mobile-bottom-nav')) return;
    const labels={home:'Panoramica',teams:'Squadre',players:'Giocatori',matches:'Partite',bracket:'Tabellone',articles:'Articoli',photos:'Foto',search:'Cerca'};
    const icons={home:'⌂',teams:'◎',players:'♙',matches:'⚽',bracket:'▥',articles:'✦',photos:'📷',search:'⌕'};
    const mainTabs=['home','teams','matches','search'];
    const moreTabs=['players','bracket','articles','photos'];
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
  showMatch = function(id){ openMatchModalId = id; _origShowMatch(id); };
  const _origShowTeamDetail = showTeamDetail;
  showTeamDetail = function(teamId, trigger=null){ openTeamModalId = teamId; _origShowTeamDetail(teamId, trigger); };
  let _lastMatchModalHtml='', _lastTeamModalHtml='';
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
  window.addEventListener('ng:cloudinary-photos-updated',()=>scheduleRender({skipAlign:true}));
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
    if(e.target.id==='closeModal'||e.target.id==='matchModal') openMatchModalId='';
    if(e.target.id==='closeTeamModal'||e.target.id==='teamModal') openTeamModalId='';
  });
  UI.bindTabs();setupMobileNavigation();restorePublicFilters();restorePublicTab();
  // Inizializzo lo snapshot dei punteggi live PRIMA del primo render, così le partite
  // già in corso al boot non triggerano notifiche fasulle.
  detectLiveScoreChanges(state);
  window.NexoraPhotos?.refreshAll?.().catch(()=>{});
  render();
})();
