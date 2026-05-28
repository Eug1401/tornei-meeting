(function(){
 const store=NexoraStore, UI=NexoraUI, A=NexoraAdmin;
 let playerTeamFilter='', standingsGroup='all';
 const BRAND_LOGO='assets/brand/new-generation-logo-transparent.png';
 const PDF_COLORS={ink:[24,16,6], muted:[108,91,54], gold:[185,130,24], gold2:[244,219,120], cream:[255,248,231], line:[221,177,73], soft:[255,246,218]};
 const imageCache=new Map();
 function teamFilterOptions(s,selected){return '<option value="">Tutte le squadre</option>'+s.teams.map(t=>`<option value="${t.id}" ${t.id===selected?'selected':''}>${UI.esc(t.name)}</option>`).join('');}
 function filteredPlayerStats(s){const rows=store.selectors.playerStats(s);return playerTeamFilter?rows.filter(p=>p.teamId===playerTeamFilter):rows.filter(p=>p.goals>0).slice(0,15);}
 function reportAvailability(s){
   const matchCount=(s.matches||[]).length;
   const teamCount=(s.teams||[]).length;
   const scorers=store.selectors.scorers(s).length;
   const hasGroups=store.selectors.hasGroupStage(s);
   const bracket=store.bracketData(s);
   return {
     standings:{enabled:teamCount>0,detail:teamCount?`${teamCount} squadre`:'Aggiungi squadre'},
     scorers:{enabled:teamCount>0,detail:scorers?`${Math.min(scorers,15)} marcatori`:'Nessun gol: PDF vuoto'},
     groups:{enabled:hasGroups,detail:hasGroups?'Classifiche gironi':'Non previsto dal format'},
     calendar:{enabled:matchCount>0,detail:matchCount?`${matchCount} partite`:'Genera il calendario'},
     bracket:{enabled:Boolean(bracket.available),detail:bracket.available?'Tabellone disponibile':(bracket.message||'Non previsto dal format')}
   };
 }
 function renderReportButtons(s){
   const availability=reportAvailability(s);
   Object.entries(availability).forEach(([kind,meta])=>{
     const btn=document.querySelector(`[data-report-kind="${kind}"]`);
     if(!btn)return;
     btn.disabled=!meta.enabled;
     btn.title=meta.detail;
     const small=btn.querySelector('small');
     if(small)small.textContent=meta.detail;
   });
 }
 function render(){
   const s=A.state();
   renderReportButtons(s);
   UI.$('#adminStats').innerHTML=UI.statsGrid(store.selectors.stats(s));
   const standingsMenu=UI.$('#adminStandingsMenu');
   if(standingsMenu)standingsMenu.innerHTML=store.selectors.hasGroupStage(s)?UI.groupStandingsSelector(s,standingsGroup,'adminGroupStandingsFilter'):'';
   UI.$('#adminStandings').innerHTML=store.selectors.hasGroupStage(s)?UI.groupStandingsTables(s,standingsGroup):UI.standingsTable(store.selectors.calculateStandings(s),s);
   const filter=UI.$('#adminPlayerTeamFilter');
   if(filter){filter.innerHTML=teamFilterOptions(s,playerTeamFilter);if(playerTeamFilter&&!s.teams.some(t=>t.id===playerTeamFilter))playerTeamFilter='';}
   UI.$('#adminPlayers').innerHTML=UI.playerStatsTable(filteredPlayerStats(s))+(s.rules.isKingsLeague?'<div class="mini-section-title margin-top"><h3>Presidenti marcatori</h3></div>'+UI.presidentStatsTable(store.selectors.presidentScorers(s).slice(0,15)):'');
   UI.$('#adminCalendar').innerHTML=UI.matchList(s);
   UI.$('#adminBracket').innerHTML=UI.bracketMarkup(s);
 }
 document.addEventListener('DOMContentLoaded',render);
 UI.$('#adminPlayerTeamFilter')?.addEventListener('change',e=>{playerTeamFilter=e.target.value;render();});document.addEventListener('change',e=>{if(e.target.id==='adminGroupStandingsFilter'){standingsGroup=e.target.value||'all';render();}});

 function slug(s){return String(s||'report').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,60)||'report';}
 function today(){return new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short'}).format(new Date());}
 function pdfName(s,type){return `${slug(s.rules?.name||'new-generation')}-${type}-${new Date().toISOString().slice(0,10)}.pdf`;}
 function setRgb(doc,method,rgb){doc[method](rgb[0],rgb[1],rgb[2]);}
 function toolsReady(){return window.jspdf&&window.jspdf.jsPDF;}
 function toast(msg,type='ok'){const box=UI.$('#pdfStatus'); if(box)box.innerHTML=`<div class="message ${type}">${UI.esc(msg)}</div>`;}

 function currentPdfState(){
   const s=A.state();
   const repair=store.repairState(s);
   A.save(s);
   const report=store.integrityReport(s);
   const blocking=(report.details||[]).filter(i=>i.severity==='error');
   if(blocking.length){throw new Error('Dati non coerenti per generare il PDF: '+blocking.slice(0,3).map(i=>i.message).join(' · '));}
   if(repair.changed){toast('Dati riallineati con le ultime modifiche. Download in corso…');render();}
   return s;
 }
 function dataUrlFromImage(src){
   if(!src)return Promise.resolve(null);
   if(imageCache.has(src))return imageCache.get(src);
   const p=new Promise(resolve=>{
     if(/^data:image\//i.test(src)){resolve(src);return;}
     const img=new Image(); img.crossOrigin='anonymous';
     img.onload=()=>{try{const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);resolve(c.toDataURL('image/png'));}catch(e){resolve(null);}};
     img.onerror=()=>resolve(null); img.src=src;
   });
   imageCache.set(src,p); return p;
 }
 async function preloadTeamLogos(s){const out={};await Promise.all(s.teams.map(async t=>{out[t.id]=await dataUrlFromImage(t.logo);}));return out;}
 function teamInitial(name){return String(name||'?').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'NG';}
 function drawPlaceholderLogo(doc,x,y,size,label){setRgb(doc,'setFillColor',PDF_COLORS.soft);setRgb(doc,'setDrawColor',PDF_COLORS.line);doc.roundedRect(x,y,size,size,2.2,2.2,'FD');setRgb(doc,'setTextColor',PDF_COLORS.gold);doc.setFont('helvetica','bold');doc.setFontSize(Math.max(5,size*.45));doc.text(teamInitial(label),x+size/2,y+size*.62,{align:'center'});}
 function drawLogo(doc,src,x,y,size,label){if(src){try{doc.addImage(src,'PNG',x,y,size,size,undefined,'FAST');return;}catch(e){try{doc.addImage(src,'JPEG',x,y,size,size,undefined,'FAST');return;}catch(_){}}}drawPlaceholderLogo(doc,x,y,size,label);}
 async function baseDoc(s,title,subtitle,orientation='p'){
   const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation,unit:'mm',format:'a4',compress:true});
   const logo=await dataUrlFromImage(BRAND_LOGO); drawHeader(doc,s,title,subtitle,logo); return {doc,logo};
 }
 function drawHeader(doc,s,title,subtitle,logo){
   const w=doc.internal.pageSize.getWidth();
   setRgb(doc,'setFillColor',[7,6,4]);doc.rect(0,0,w,48,'F');
   setRgb(doc,'setFillColor',[32,24,10]);doc.rect(0,48,w,3,'F');
   drawLogo(doc,logo,w/2-12,6.5,24,s.rules?.name||'NG');
   setRgb(doc,'setTextColor',PDF_COLORS.cream);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text(String(s.rules?.name||'New Generation'),w/2,34,{align:'center'});
   setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFontSize(10);doc.text(String(title||'Report ufficiale'),w/2,40.5,{align:'center'});
   setRgb(doc,'setTextColor',[210,190,140]);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.text(String(subtitle||''),w/2,45.3,{align:'center'});
 }
 function addFooter(doc,s){
   const pages=doc.internal.getNumberOfPages();
   for(let i=1;i<=pages;i++){doc.setPage(i);const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();setRgb(doc,'setDrawColor',[225,184,80]);doc.setLineWidth(.2);doc.line(12,h-12,w-12,h-12);setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text(`${s.rules?.name||'New Generation'} · generato ${today()}`,12,h-7);doc.text(`Pagina ${i}/${pages}`,w-12,h-7,{align:'right'});}
 }
 function tableTheme(){return {theme:'grid',styles:{font:'helvetica',fontSize:8,cellPadding:2.1,lineColor:[232,210,150],lineWidth:.12,textColor:PDF_COLORS.ink,overflow:'linebreak',valign:'middle'},headStyles:{fillColor:PDF_COLORS.ink,textColor:PDF_COLORS.gold2,fontStyle:'bold',fontSize:7.5,halign:'center'},alternateRowStyles:{fillColor:[255,252,241]},margin:{left:12,right:12},showHead:'everyPage'};}
 function didDrawTeamLogo(logos,teamsByRow,colIndex=1){return function(data){if(data.section!=='body'||data.column.index!==colIndex)return;const row=teamsByRow[data.row.index];if(!row)return;drawLogo(data.doc,logos[row.teamId],data.cell.x+1.6,data.cell.y+1.4,6.2,row.name||row.teamName||row.team);};}
 function didParseTeamCell(colIndex=1){return function(data){if(data.section==='body'&&data.column.index===colIndex){data.cell.styles.cellPadding={top:2.1,right:2.1,bottom:2.1,left:10};data.cell.styles.fontStyle='bold';}};}
 function standingsRows(s,phase){return store.selectors.calculateStandings(s,phase);}
 async function pdfStandings(){
   const s=currentPdfState(), logos=await preloadTeamLogos(s); const {doc}=await baseDoc(s,'Classifica generale','Loghi squadre, punti e differenza reti aggiornati ai risultati caricati.','p');
   const rows=standingsRows(s).map((r,i)=>({...r,rank:i+1}));
   doc.autoTable({...tableTheme(),startY:58,columns:[{header:'#',dataKey:'rank'},{header:'Squadra',dataKey:'name'},{header:'Pt',dataKey:'points'},{header:'PG',dataKey:'played'},{header:'GF',dataKey:'goalsFor'},{header:'GS',dataKey:'goalsAgainst'},{header:'DR',dataKey:'diff'}],body:rows.map(r=>({...r,diff:(r.diff>0?'+':'')+r.diff})),columnStyles:{0:{halign:'center',cellWidth:10},1:{cellWidth:78},2:{halign:'center'},3:{halign:'center'},4:{halign:'center'},5:{halign:'center'},6:{halign:'center'}},didParseCell:didParseTeamCell(1),didDrawCell:didDrawTeamLogo(logos,rows,1)});
   addFooter(doc,s); doc.save(pdfName(s,'classifica'));
 }
 async function pdfScorers(){
   const s=currentPdfState(), logos=await preloadTeamLogos(s); const {doc}=await baseDoc(s,'Classifica marcatori · Top 15','Calciatori e, in modalità Kings League, classifica presidenti separata nello stesso PDF.','p');
   const rows=store.selectors.scorers(s).slice(0,15).map((p,i)=>({...p,rank:i+1,player:p.name,team:p.teamName,year:p.birthYear||'-'}));
   doc.autoTable({...tableTheme(),startY:58,columns:[{header:'#',dataKey:'rank'},{header:'Calciatore',dataKey:'player'},{header:'Anno',dataKey:'year'},{header:'Squadra',dataKey:'team'},{header:'Gol',dataKey:'goals'},{header:'PG',dataKey:'played'},{header:'Gialli',dataKey:'yellow'},{header:'Rossi',dataKey:'red'}],body:rows.length?rows:[{rank:'-',player:'Nessun marcatore disponibile',year:'-',team:'-',goals:'-',played:'-',yellow:'-',red:'-',teamId:''}],columnStyles:{0:{halign:'center',cellWidth:10},1:{cellWidth:52,fontStyle:'bold'},2:{halign:'center',cellWidth:18},3:{cellWidth:54},4:{halign:'center',fontStyle:'bold'},5:{halign:'center'},6:{halign:'center'},7:{halign:'center'}},didParseCell:function(data){if(data.section==='body'&&data.column.index===3){data.cell.styles.cellPadding={top:2.1,right:2.1,bottom:2.1,left:10};}},didDrawCell:function(data){if(data.section==='body'&&data.column.index===3){const r=rows[data.row.index];if(r)drawLogo(data.doc,logos[r.teamId],data.cell.x+1.6,data.cell.y+1.4,6.2,r.teamName);}}});
   if(s.rules?.isKingsLeague){
     let y=(doc.lastAutoTable?.finalY||58)+12;
     const pres=store.selectors.presidentScorers(s).map((p,i)=>({...p,rank:i+1,president:p.name,team:p.teamName}));
     if(y>235){doc.addPage();y=58;}
     setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('Classifica marcatori presidenti',12,y);
     doc.autoTable({...tableTheme(),startY:y+4,columns:[{header:'#',dataKey:'rank'},{header:'Presidente',dataKey:'president'},{header:'Squadra',dataKey:'team'},{header:'Gol',dataKey:'goals'},{header:'PG',dataKey:'played'}],body:pres.length?pres:[{rank:'-',president:'Nessun gol presidente disponibile',team:'-',goals:'-',played:'-',teamId:''}],columnStyles:{0:{halign:'center',cellWidth:10},1:{cellWidth:62,fontStyle:'bold'},2:{cellWidth:62},3:{halign:'center',fontStyle:'bold'},4:{halign:'center'}},didParseCell:function(data){if(data.section==='body'&&data.column.index===2){data.cell.styles.cellPadding={top:2.1,right:2.1,bottom:2.1,left:10};}},didDrawCell:function(data){if(data.section==='body'&&data.column.index===2){const r=pres[data.row.index];if(r)drawLogo(data.doc,logos[r.teamId],data.cell.x+1.6,data.cell.y+1.4,6.2,r.teamName);}}});
   }
   addFooter(doc,s); doc.save(pdfName(s,'marcatori-top-15'));
 }
 async function pdfGroups(){
   const s=currentPdfState(), logos=await preloadTeamLogos(s); const {doc,logo}=await baseDoc(s,'Classifiche gironi','Una classifica dedicata per ogni girone, con loghi e stato del girone.','p');
   const groups=store.selectors.groupedStandings(s);
   if(!groups.length){doc.autoTable({...tableTheme(),startY:58,head:[['Info']],body:[['Questo torneo non contiene gironi.']]});}
   let y=58;
   groups.forEach((g,idx)=>{if(idx>0&&y>205){doc.addPage();drawHeader(doc,s,'Classifiche gironi','Una classifica dedicata per ogni girone.',logo);y=58;}setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(`${g.name} · ${g.completed?'completato':'in corso'}`,12,y);y+=5;const rows=g.rows.map((r,i)=>({...r,rank:i+1}));doc.autoTable({...tableTheme(),startY:y,columns:[{header:'#',dataKey:'rank'},{header:'Squadra',dataKey:'name'},{header:'Pt',dataKey:'points'},{header:'PG',dataKey:'played'},{header:'GF',dataKey:'goalsFor'},{header:'GS',dataKey:'goalsAgainst'},{header:'DR',dataKey:'diff'}],body:rows.map(r=>({...r,diff:(r.diff>0?'+':'')+r.diff})),columnStyles:{0:{halign:'center',cellWidth:10},1:{cellWidth:78},2:{halign:'center'},3:{halign:'center'},4:{halign:'center'},5:{halign:'center'},6:{halign:'center'}},didParseCell:didParseTeamCell(1),didDrawCell:didDrawTeamLogo(logos,rows,1)});y=doc.lastAutoTable.finalY+12;});
   addFooter(doc,s); doc.save(pdfName(s,'classifiche-gironi'));
 }
 function calendarRows(s){const matches=[...s.matches].sort((a,b)=>(a.roundIndex-b.roundIndex)||String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||'')));return matches.map(m=>{const sc=store.matchGoals(s,m);const played=store.hasScore(s,m);return {phase:store.PHASE_LABELS[m.phase]||m.phase||'-',round:m.round||'-',home:store.teamName(s,m.homeTeamId,m.homeLabel),away:store.teamName(s,m.awayTeamId,m.awayLabel),homeTeamId:m.homeTeamId,awayTeamId:m.awayTeamId,field:m.field||'Campo da definire',date:UI.fmtDate(m),score:played?store.scoreText(s,m):'-',status:played?'Giocata':'Da giocare'};});}
 async function pdfCalendar(){
   const s=currentPdfState(), logos=await preloadTeamLogos(s); const {doc}=await baseDoc(s,'Calendario completo','Partite aggiornate con risultati caricati, campi, date e stato.','l');
   const rows=calendarRows(s);
   doc.autoTable({...tableTheme(),startY:58,columns:[{header:'Fase',dataKey:'phase'},{header:'Giornata/turno',dataKey:'round'},{header:'Casa',dataKey:'home'},{header:'Ospite',dataKey:'away'},{header:'Campo',dataKey:'field'},{header:'Data e ora',dataKey:'date'},{header:'Risultato',dataKey:'score'},{header:'Stato',dataKey:'status'}],body:rows.length?rows:[{phase:'-',round:'-',home:'Nessuna partita disponibile',away:'-',field:'-',date:'-',score:'-',status:'-'}],columnStyles:{0:{cellWidth:28},1:{cellWidth:34},2:{cellWidth:46},3:{cellWidth:46},4:{cellWidth:35},5:{cellWidth:43},6:{cellWidth:26,halign:'center',fontStyle:'bold'},7:{cellWidth:24,halign:'center'}},didParseCell:function(data){if(data.section==='body'&&(data.column.index===2||data.column.index===3)){data.cell.styles.cellPadding={top:2,right:2,bottom:2,left:10};data.cell.styles.fontStyle='bold';}},didDrawCell:function(data){if(data.section!=='body')return;const r=rows[data.row.index];if(!r)return;if(data.column.index===2)drawLogo(data.doc,logos[r.homeTeamId],data.cell.x+1.4,data.cell.y+1.3,6,r.home);if(data.column.index===3)drawLogo(data.doc,logos[r.awayTeamId],data.cell.x+1.4,data.cell.y+1.3,6,r.away);}});
   addFooter(doc,s); doc.save(pdfName(s,'calendario-completo'));
 }
 function drawTeamLine(doc,s,logos,m,side,x,y,w){const id=side==='home'?m.homeTeamId:m.awayTeamId;const label=side==='home'?m.homeLabel:m.awayLabel;const name=store.teamName(s,id,label||'Da definire');const sc=store.matchGoals(s,m);const score=store.hasScore(s,m)?(side==='home'?sc.home:sc.away):'';drawLogo(doc,logos[id],x+1.5,y+1,5.7,name);setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.text(String(name).slice(0,24),x+9,y+5.1,{maxWidth:w-16});if(score!==''){doc.setFontSize(7);doc.text(String(score),x+w-3,y+5.1,{align:'right'});} }
 function drawBracketPage(doc,s,logos,bracket,logo,addNewPage=true){if(addNewPage)doc.addPage('a4','landscape');drawHeader(doc,s,`Tabellone · ${bracket.name}`,'Grafica del tabellone con squadre, placeholder e risultati dal calendario.',logo);const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();const left=12,right=12,top=58,bottom=20;const rounds=bracket.rounds;const gap=5;const colW=(w-left-right-gap*(rounds.length-1))/Math.max(1,rounds.length);rounds.forEach((round,ri)=>{const x=left+ri*(colW+gap);setRgb(doc,'setFillColor',PDF_COLORS.ink);doc.roundedRect(x,top-8,colW,6,1.8,1.8,'F');setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text(String(round.name),x+colW/2,top-4,{align:'center',maxWidth:colW-2});const count=Math.max(round.matches.length,1);const cardH=Math.max(15,Math.min(26,(h-top-bottom-(count-1)*5)/count));const usable=h-top-bottom-cardH;round.matches.forEach((m,mi)=>{const y=top+(count===1?usable/2:(usable*mi/(count-1))) ;setRgb(doc,'setFillColor',[255,252,241]);setRgb(doc,'setDrawColor',PDF_COLORS.line);doc.roundedRect(x,y,colW,cardH,3,3,'FD');setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.text(`${m.round||round.name} · ${m.field||'Campo da definire'}`,x+2,y+4);drawTeamLine(doc,s,logos,m,'home',x+2,y+5,colW-4);drawTeamLine(doc,s,logos,m,'away',x+2,y+12,colW-4);if(ri<rounds.length-1){setRgb(doc,'setDrawColor',PDF_COLORS.gold);doc.setLineWidth(.25);const yMid=y+cardH/2;doc.line(x+colW,yMid,x+colW+gap*.65,yMid);}});});}
 async function pdfBracket(){
   const s=currentPdfState(), logos=await preloadTeamLogos(s); const {doc,logo}=await baseDoc(s,'Tabellone fase finale','Grafica tabellone con squadre, placeholder e risultati.','l');
   const data=store.bracketData(s);
   if(!data.available){doc.autoTable({...tableTheme(),startY:58,head:[['Info']],body:[[data.message||'Nessun tabellone disponibile.']]});}
   else {data.brackets.forEach((b,i)=>drawBracketPage(doc,s,logos,b,logo,i>0));}
   addFooter(doc,s); doc.save(pdfName(s,'tabellone-fase-finale'));
 }
 async function runPdf(kind){
   try{if(!toolsReady()){toast('Librerie PDF non disponibili. Controlla la connessione e ricarica la pagina.','error');return;}toast('Genero il PDF e avvio il download…');
     if(kind==='standings')await pdfStandings(); else if(kind==='scorers')await pdfScorers(); else if(kind==='groups')await pdfGroups(); else if(kind==='bracket')await pdfBracket(); else await pdfCalendar();
     toast('Download PDF avviato.');
   }catch(err){console.error(err);toast('Non sono riuscito a generare il PDF: '+(err.message||err),'error');}
 }
 document.addEventListener('click',e=>{
   const btn=e.target.closest('[data-report-kind]');
   if(!btn)return;
   e.preventDefault();
   if(btn.disabled)return;
   runPdf(btn.dataset.reportKind||'calendar');
 });
 window.NexoraAdminRefresh=function(){try{render();}catch(_){}};
 window.addEventListener('ng:admin-state-loaded',()=>window.NexoraAdminRefresh());
})();
