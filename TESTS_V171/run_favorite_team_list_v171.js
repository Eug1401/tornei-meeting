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
  if(!condition)process.exitCode=1;
}
function has(text,needle){return text.includes(needle);}

check('Indicatore nella sezione Squadre',has(publicJs,"favoriteTeamCard.classList.add('favorite-team-card')")&&has(publicJs,"action.textContent='★ Preferita · Apri scheda'"),'Indicatore visivo assente');
check('Nessun nuovo controllo di selezione in Squadre',!has(publicJs,'data-favorite-team')&&!has(publicJs,'favorite-team-btn')&&!has(uiJs,'data-favorite-team'),'La sezione Squadre contiene controlli duplicati');
check('Nome e struttura squadra non modificati',has(uiJs,'<strong>${esc(t.name)}</strong>')&&has(uiJs,'<span class="disclosure-actions"><span class="disclosure-action">Apri scheda</span></span>'),'Il componente condiviso delle squadre è stato alterato');
check('Cambio preferita ripristina la squadra precedente',has(publicJs,"marker.textContent=marker.dataset.favoriteBaseText")&&has(publicJs,"marker.classList.remove('favorite-team-marker')"),'Ripristino indicatore incompleto');
check('Rimozione preferita elimina lo stato visivo',has(publicJs,"el.classList.remove('favorite-standing-row','favorite-match-card','favorite-team-card')"),'Pulizia classe preferita assente');
check('Accessibilità del riepilogo squadra',has(publicJs,"summary.setAttribute('aria-label'")&&has(publicJs,'squadra preferita. Apri la scheda'),'Etichetta accessibile assente');
check('Evidenziazione limitata al contenitore Squadre',has(css,'body.public-page #publicTeams .team-disclosure.favorite-team-card')&&has(css,'body.public-page #publicTeams .favorite-team-marker'),'Stili non correttamente circoscritti');
check('Layout mobile protetto',has(css,'@media(max-width:760px)')&&has(css,'#publicTeams .favorite-team-marker')&&has(css,'min-height:46px!important'),'Regole mobile assenti');
check('Palette coerente con il sito',has(css,'inset 5px 0 0 #ff7a18')&&has(css,'rgba(31,99,255,.16)'),'Palette indicatore non coerente');
check('Aggiornamento immediato al cambio',has(publicJs,'function refreshFavoriteViews()')&&has(publicJs,'decorateFavoriteUI();'),'Cambio preferita non aggiorna la sezione Squadre');
check('Cache busting v171',has(index,'v171-favorite-team-list'),'Versione asset non aggiornata');

const passed=checks.filter(x=>x.ok).length;
const report={version:'v171',generatedAt:new Date().toISOString(),passed,total:checks.length,ok:passed===checks.length,checks};
fs.writeFileSync(path.join(__dirname,'report_v171.json'),JSON.stringify(report,null,2));
checks.forEach(c=>console.log(`${c.ok?'PASS':'FAIL'} | ${c.name}${c.detail?' | '+c.detail:''}`));
console.log(`\n${passed}/${checks.length} controlli superati`);
