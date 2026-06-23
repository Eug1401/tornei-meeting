(function(){
  const store=NexoraStore, UI=NexoraUI;
  const state=store.load('admin');
  const params=new URLSearchParams(location.search);
  const type=params.get('type')||'calendar';

  function today(){
    return new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short'}).format(new Date());
  }

  function reportHeader(title, subtitle){
    const r=state.rules || {};
    return `
      <section class="pdf-hero">
        <div class="pdf-brand-row">
          <div class="brand">
            <div class="logo"><span></span></div>
            <div>
              <h1>${UI.esc(title)}</h1>
              <p>${UI.esc(subtitle)}</p>
            </div>
          </div>
          <div class="pdf-meta">
            <span>${UI.esc(r.name || 'New Generation')}</span>
            <small>Generato: ${UI.esc(today())}</small>
          </div>
        </div>
        <div class="pdf-info-grid">
          <span><strong>Formato</strong>${UI.esc(store.FORMAT_LABELS[r.format] || r.format || '-')}</span>
          <span><strong>Squadre</strong>${state.teams.length}</span>
          <span><strong>Partite</strong>${state.matches.length}</span>
          <span><strong>Campi</strong>${UI.esc(r.fieldCount || '-')}</span>
        </div>
      </section>`;
  }

  function standingsRowsTable(rows){
    return `<table class="pdf-table compact standings-report-table">
      <thead><tr><th>#</th><th>Squadra</th><th>Pt</th><th>PG</th><th>GF</th><th>GS</th><th>DR</th></tr></thead>
      <tbody>${rows.map((r,i)=>`
        <tr>
          <td><span class="pdf-rank">${i+1}</span></td>
          <td><strong>${UI.esc(r.name)}</strong></td>
          <td><strong>${r.points}</strong></td>
          <td>${r.played}</td>
          <td>${r.goalsFor}</td>
          <td>${r.goalsAgainst}</td>
          <td>${r.diff>0?'+':''}${r.diff}</td>
        </tr>`).join('') || '<tr><td colspan="7">Nessuna squadra disponibile.</td></tr>'}</tbody>
    </table>`;
  }

  function compactStandingsTable(){
    const grouped=store.selectors.hasGroupStage(state)?store.selectors.groupedStandings(state):[];
    if(grouped.length){
      return grouped.map(g=>`
        <section class="pdf-card">
          <div class="pdf-section-title">
            <h2>Classifica ${UI.esc(g.name)}</h2>
            <p>Punti, partite giocate, gol fatti, gol subiti e differenza reti. Stato: ${g.completed?'girone completato':'in corso'}.</p>
          </div>
          ${standingsRowsTable(g.rows)}
        </section>`).join('');
    }
    const rows=state.rules?.format==='league_knockout'?store.selectors.calculateStandings(state,'league'):store.selectors.calculateStandings(state);
    return `
      <section class="pdf-card">
        <div class="pdf-section-title">
          <h2>${state.rules?.format==='league_knockout'?'Classifica unica':'Classifica squadre'}</h2>
          <p>Punti, partite giocate, gol fatti, gol subiti e differenza reti. Nei format con playoff la classifica resta separata dalla fase a eliminazione diretta.</p>
        </div>
        ${standingsRowsTable(rows)}
      </section>`;
  }

  function compactCalendarTable(){
    const matches=[...state.matches].sort((a,b)=>(a.roundIndex-b.roundIndex)||String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||'')));
    const pause=store.oneDayCalendarPauseEvent?store.oneDayCalendarPauseEvent(state.rules):null;
    const rows=matches.map(m=>({type:'match',date:m.date||'',time:m.time||'',match:m}));
    if(pause&&matches.some(m=>m.date===pause.date))rows.push({type:'pause',date:pause.date,time:pause.time,event:pause});
    rows.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.time).localeCompare(String(b.time))||(a.type==='pause'?-1:1));
    return `
      <section class="pdf-card">
        <div class="pdf-section-title">
          <h2>Calendario partite</h2>
          <p>Documento sintetico: squadre, campo, data e risultato/stato.</p>
        </div>
        <table class="pdf-table compact calendar-report-table">
          <thead>
            <tr><th>Fase / giornata</th><th>Partita</th><th>Campo</th><th>Data</th><th>Stato</th></tr>
          </thead>
          <tbody>
            ${rows.map(row=>{
              if(row.type==='pause')return `<tr><td><span class="pdf-pill">Pausa</span><br><small>Torneo giornaliero</small></td><td><strong>${UI.esc(row.event.label)}</strong></td><td>-</td><td>${UI.esc(row.event.date)} ${UI.esc(row.event.time)}</td><td><span class="pdf-status todo">${UI.esc(row.event.duration)} min</span></td></tr>`;
              const m=row.match;
              const home=store.teamName(state,m.homeTeamId,m.homeLabel);
              const away=store.teamName(state,m.awayTeamId,m.awayLabel);
              const goals=store.matchGoals(state,m);
              const hasScore=store.hasScore(state,m);
              const status=hasScore ? store.scoreText(state,m) : 'Da giocare';
              const phase=store.PHASE_LABELS[m.phase] || m.phase || '-';
              return `<tr>
                <td><span class="pdf-pill">${UI.esc(phase)}</span><br><small>${UI.esc(m.round || '-')}</small></td>
                <td><strong>${UI.esc(home)}</strong><span class="muted"> vs </span><strong>${UI.esc(away)}</strong></td>
                <td>${UI.esc(m.field || 'Campo da definire')}</td>
                <td>${UI.esc(UI.fmtDate(m))}</td>
                <td><span class="pdf-status ${hasScore?'done':'todo'}">${UI.esc(status)}</span></td>
              </tr>`;
            }).join('') || '<tr><td colspan="5">Nessuna partita disponibile.</td></tr>'}
          </tbody>
        </table>
      </section>`;
  }


  function compactBracketReport(){
    const data=store.bracketData(state);
    if(!data.available){return `<section class="pdf-card"><h2>Tabellone</h2><div class="empty">${UI.esc(data.message)}</div></section>`;}
    return data.brackets.map(bracket=>`
      <section class="pdf-card bracket-report-card">
        <div class="pdf-section-title"><h2>${UI.esc(bracket.name)}</h2><p>Tabellone essenziale con squadre, placeholder e risultato se disponibile.</p></div>
        ${bracket.rounds.map(round=>`
          <h3 class="pdf-round-title">${UI.esc(round.name)}</h3>
          <table class="pdf-table compact bracket-report-table">
            <thead><tr><th>#</th><th>Casa / lato A</th><th>Ospite / lato B</th><th>Risultato</th><th>Stato</th></tr></thead>
            <tbody>
              ${round.matches.map((m,i)=>{
                const home=store.teamName(state,m.homeTeamId,m.homeLabel);
                const away=store.teamName(state,m.awayTeamId,m.awayLabel);
                const sc=store.matchGoals(state,m);
                // Le partite Live non hanno punteggio in stampa: appaiono come "Da giocare"
                const done = m.status==='played' || (m.status!=='live' && sc.home+sc.away>0);
                return `<tr><td>${i+1}</td><td><strong>${UI.esc(home)}</strong></td><td><strong>${UI.esc(away)}</strong></td><td>${done?UI.esc(store.scoreText(state,m)):'-'}</td><td><span class="pdf-status ${done?'done':'todo'}">${done?'Giocata':'Da giocare'}</span></td></tr>`;
              }).join('')}
            </tbody>
          </table>`).join('')}
      </section>`).join('');
  }

  function render(){
    const root=UI.$('#printRoot');
    root.innerHTML = type==='standings'
      ? reportHeader(`Classifica · ${state.rules.name}`,'Report essenziale ufficiale New Generation') + compactStandingsTable()
      : type==='bracket'
        ? reportHeader(`Tabellone · ${state.rules.name}`,'Report essenziale ufficiale New Generation') + compactBracketReport()
        : reportHeader(`Calendario · ${state.rules.name}`,'Report essenziale ufficiale New Generation') + compactCalendarTable();
    setTimeout(()=>window.print(),450);
  }

  render();
})();
