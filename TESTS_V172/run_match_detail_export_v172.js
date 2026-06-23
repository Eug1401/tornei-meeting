const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const publicJs=fs.readFileSync(path.join(root,'assets/js/public.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/css/styles.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const checks=[];
function check(name,condition,detail=''){checks.push({name,ok:Boolean(condition),detail:condition?'':detail});if(!condition)process.exitCode=1;}
function has(text,needle){return text.includes(needle);}
check('Markup risultato dedicato',has(publicJs,'class="public-score-value"')&&has(publicJs,'scoreWidthCls'),'Manca il contenitore sicuro del risultato');
check('Punteggi a più cifre gestiti',has(publicJs,"is-score-wide")&&has(publicJs,"is-score-extra-wide")&&has(css,'.public-score-center.is-score-wide>.public-score-value span'),'Classi responsive dei punteggi assenti');
check('Nessuna larghezza minima ereditata sulle cifre',has(css,'.public-score-center>.public-score-value span')&&has(css,'min-width:0!important'),'Le cifre possono ancora forzare il riquadro');
check('Contenitore risultato protetto',has(css,'.public-score-center>.public-score-value')&&has(css,'grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important')&&has(css,'max-width:100%!important'),'Griglia risultato non protetta');
check('Stemmi dettaglio senza sfondo artificiale',has(css,'.public-score-team img.team-logo')&&has(css,'background:transparent!important')&&has(css,'padding:0!important')&&has(css,'border:0!important'),'Sfondo artificiale ancora presente');
check('Export stemmi trasparenti',has(publicJs,"ctx.drawImage(img,cx-dw/2,cy-dh/2,dw,dh)")&&!has(publicJs,"roundRectPath(ctx,cx-size/2,cy-size/2,size,size,36);ctx.fillStyle='#ffffff'"),'Export applica ancora un riquadro bianco');
check('Export risultato separato e adattivo',has(publicJs,'function drawShareResult')&&has(publicJs,'function drawShareResult')&&has(publicJs,"ctx.textAlign='right';ctx.fillText(home,cx-innerGap")&&has(publicJs,"ctx.textAlign='left';ctx.fillText(away,cx+innerGap"),'Risultato export non adattivo');
check('Export mantiene formato social',has(publicJs,'const W=1080,H=1350')&&has(publicJs,'drawShareResult(ctx,{played,isLive,score,time:m.time})'),'Formato o collegamento export errato');
check('Responsive mobile',has(css,'@media(max-width:720px)')&&has(css,'@media(max-width:520px)')&&has(css,'.public-score-center.is-score-extra-wide>.public-score-value span'),'Regole mobile incomplete');
check('Cache busting v172',has(index,'v172-match-detail-score')||has(index,'v173-centered-score-fit'),'Asset non versionati');
const passed=checks.filter(x=>x.ok).length;
const report={version:'v172',generatedAt:new Date().toISOString(),passed,total:checks.length,ok:passed===checks.length,checks};
fs.writeFileSync(path.join(__dirname,'report_v172.json'),JSON.stringify(report,null,2));
checks.forEach(c=>console.log(`${c.ok?'PASS':'FAIL'} | ${c.name}${c.detail?' | '+c.detail:''}`));
console.log(`\n${passed}/${checks.length} controlli superati`);
