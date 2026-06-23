const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const publicJs=fs.readFileSync(path.join(root,'assets/js/public.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/css/styles.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const checks=[];
function check(name,condition,detail=''){checks.push({name,ok:Boolean(condition),detail:condition?'':detail});if(!condition)process.exitCode=1;}
function has(text,needle){return text.includes(needle);}
check('Separatore ancorato al centro',has(css,'.public-score-number.is-home')&&has(css,'text-align:right!important')&&has(css,'.public-score-number.is-away')&&has(css,'text-align:left!important'),'I due punteggi non sono ancorati simmetricamente al separatore');
check('Tre celle simmetriche',has(css,'grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important'),'La griglia del risultato non è simmetrica');
check('Auto-fit runtime presente',has(publicJs,'function fitPublicMatchScore')&&has(publicJs,'home.scrollWidth<=home.clientWidth+1')&&has(publicJs,'away.scrollWidth<=away.clientWidth+1'),'Manca il ridimensionamento basato sulle dimensioni reali');
check('Auto-fit osserva il resize',has(publicJs,'function watchPublicMatchScore')&&has(publicJs,"'ResizeObserver' in window")&&has(publicJs,"window.addEventListener('resize'"),'Il risultato non viene ricalcolato dopo resize/orientamento');
check('Markup misurabile e accessibile',has(publicJs,'data-score-fit')&&has(publicJs,'data-score-home')&&has(publicJs,'data-score-away')&&has(publicJs,'aria-label="Risultato'),'Attributi del risultato incompleti');
check('Cifre ereditano la dimensione calcolata',has(css,'span.public-score-number')&&has(css,'font-size:1em!important'),'Vecchi stili possono ancora ignorare l’auto-fit');
check('Overflow bloccato come fallback',has(css,'.public-score-center{')&&has(css,'overflow:hidden!important')&&has(css,'text-overflow:clip!important'),'Manca la protezione finale anti-sforamento');
check('Refresh live ricalcola il risultato',has(publicJs,'body.innerHTML=html;_lastMatchModalHtml=html;watchPublicMatchScore(body);'),'Gli aggiornamenti live non riapplicano il fit');
check('Export centrato sul separatore',has(publicJs,"ctx.textAlign='right';ctx.fillText(home,cx-innerGap")&&has(publicJs,"ctx.textAlign='left';ctx.fillText(away,cx+innerGap")&&has(publicJs,"ctx.textAlign='center';ctx.fillText('–',cx"),'Export non allineato al dettaglio');
check('Export adattivo fino a punteggi lunghi',has(publicJs,'while(size>16)')&&has(publicJs,'Math.max(ctx.measureText(home).width,ctx.measureText(away).width)<=cellW'),'Export senza riduzione dimensionale reale');
check('Responsive desktop e mobile',has(css,'minmax(170px,210px)')&&has(css,'minmax(96px,124px)')&&has(css,'width:min(100%,240px)!important'),'Dimensioni responsive del risultato incomplete');
check('Cache busting v173',has(index,'v173-centered-score-fit'),'Asset non versionati');
const passed=checks.filter(x=>x.ok).length;
const report={version:'v173',generatedAt:new Date().toISOString(),passed,total:checks.length,ok:passed===checks.length,checks};
fs.writeFileSync(path.join(__dirname,'report_v173.json'),JSON.stringify(report,null,2));
checks.forEach(c=>console.log(`${c.ok?'PASS':'FAIL'} | ${c.name}${c.detail?' | '+c.detail:''}`));
console.log(`\n${passed}/${checks.length} controlli superati`);
