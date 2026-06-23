const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const publicJs=fs.readFileSync(path.join(root,'assets/js/public.js'),'utf8');
const uiJs=fs.readFileSync(path.join(root,'assets/js/ui.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/css/styles.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const checks=[];
function check(name,condition,detail=''){
  checks.push({name,ok:Boolean(condition),detail:condition?'':detail});
  if(!condition) process.exitCode=1;
}
function has(text,needle){return text.includes(needle);}

check('Persistenza per torneo',has(publicJs,"meeting-tournament-public-favorite-team-v2")&&has(publicJs,'favoriteTournamentIdentity()')&&has(publicJs,'localStorage.setItem(key,favoriteTeamId)'),'Chiave persistente o identità torneo assente');
check('Una sola selezione dalla Home',has(publicJs,'data-favorite-select')&&has(publicJs,'#favoriteTeamHome')&&has(publicJs,'Scegli la squadra da seguire'),'Selettore Home assente');
check('Cambio e rimozione gestiti',has(publicJs,"e.target.matches?.('[data-favorite-select]')")&&has(publicJs,'data-clear-favorite')&&has(publicJs,'clearFavoriteTeam()'),'Cambio/rimozione non completi');
check('Dashboard Home completa',has(publicJs,'Prossime partite')&&has(publicJs,'Ultimi risultati')&&has(publicJs,'Apri scheda completa')&&has(publicJs,'favorite-kpis'),'Contenuti richiesti mancanti');
check('Nessun filtro automatico della preferita',!has(publicJs,'data-filter-favorite-matches')&&!has(publicJs,'filterFavoriteMatches'),'La preferita influenza ancora i filtri');
check('Nessun controllo preferita in Squadre/Ricerca',!has(publicJs,'data-favorite-team')&&!has(publicJs,'favorite-team-btn')&&!has(uiJs,'data-favorite-team'),'Controlli preferita fuori Home');
check('Decorazione limitata alla classifica',has(publicJs,'#publicStandings tr[data-team-id=')&&has(publicJs,"row.classList.add('favorite-standing-row')"),'Highlight classifica non circoscritto');
check('Decorazione limitata alla lista Partite',has(publicJs,"document.querySelectorAll('#publicMatches .public-fixture-card[data-match-detail]')")&&has(publicJs,"card.classList.add('favorite-match-card')"),'Highlight partite non circoscritto');
check('Nessun highlight su tabellone o ricerca',!has(publicJs,"#publicBracket .favorite")&&!has(publicJs,"#searchResults .favorite")&&!has(publicJs,'is-favorite-team')&&!has(publicJs,'is-favorite-match'),'Highlight fuori scope');
check('Aggiornamento locale delle sole viste richieste',has(publicJs,'function refreshFavoriteViews()')&&has(publicJs,'renderFavoriteHome();')&&has(publicJs,'decorateFavoriteUI();')&&!/function setFavoriteTeam[\s\S]{0,450}render\(\{force:true\}\)/.test(publicJs),'Cambio preferita ridisegna l’intero sito');
check('Partite live escluse dagli ultimi risultati',has(publicJs,"m?.status!=='live'&&isMatchPlayed(m)"),'Gli ultimi risultati possono includere live');
check('Classifica senza nuove colonne',has(css,'#publicStandings tr.favorite-standing-row td')&&has(css,'box-shadow:inset 4px 0')&&!has(publicJs,'favorite-inline-badge'),'Struttura classifica alterata');
check('Partite evidenziate senza markup duplicato',has(css,'#publicMatches .favorite-match-card')&&has(css,'box-shadow:inset 5px 0'),'Stile partite preferite assente');
check('Export social 1080×1350',has(publicJs,'const W=1080,H=1350')&&has(publicJs,'PROSSIMA PARTITA')&&has(publicJs,'RISULTATO FINALE'),'Formato/status export non completi');
check('Export robusto per nomi lunghi',has(publicJs,'canvasLines')&&has(publicJs,'drawCenteredTextBlock')&&has(publicJs,'maxLines:3'),'Gestione nomi lunghi assente');
check('Export con colori social ufficiali',has(publicJs,"'#ff7a18'")&&has(publicJs,"'#1f63ff'")&&has(publicJs,"'#06132d'"),'Palette social assente');
check('Export include dati essenziali',has(publicJs,'DATA E ORA')&&has(publicJs,"['CAMPO'")&&has(publicJs,"['ARBITRO'")&&has(publicJs,"footerTitle=played?'MARCATORI':'COMPETIZIONE'"),'Metadati export incompleti');
check('Scheda partita con linguaggio visuale condiviso',has(publicJs,'match-visual-language')&&has(publicJs,'public-match-brandline')&&has(publicJs,'public-match-kickoff')&&has(publicJs,'public-team-role'),'Markup dettaglio non aggiornato');
check('Scheda partita responsive',has(css,'@media(max-width:720px)')&&has(css,'@media(max-width:520px)')&&has(css,'.public-scoreboard{grid-template-columns:1fr!important'),'Breakpoint dettaglio assenti');
check('Nomi lunghi leggibili nella scheda',has(css,'-webkit-line-clamp:3')&&has(css,'overflow-wrap:anywhere'),'Protezione overflow nomi assente');
check('Accessibilità di selezione e stato',has(publicJs,'aria-label="Seleziona la squadra preferita"')&&has(publicJs,'role="status"')&&has(css,':focus-visible'),'Attributi accessibili incompleti');
check('Cache busting aggiornato',/v17(?:0-favorite-match-refresh|1-favorite-team-list|2-match-detail-score)/.test(index),'Versione asset non aggiornata');

const passed=checks.filter(x=>x.ok).length;
const report={version:'v170',generatedAt:new Date().toISOString(),passed,total:checks.length,ok:passed===checks.length,checks};
fs.writeFileSync(path.join(__dirname,'report_v170.json'),JSON.stringify(report,null,2));
checks.forEach(c=>console.log(`${c.ok?'PASS':'FAIL'} | ${c.name}${c.detail?' | '+c.detail:''}`));
console.log(`\n${passed}/${checks.length} controlli superati`);
