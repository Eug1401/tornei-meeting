(function(){
 const store=NexoraStore, UI=NexoraUI, A=NexoraAdmin;
 let playerTeamFilter='', standingsGroup='all';
 const BRAND_LOGO='assets/brand/new-generation-logo-transparent.png';
 // Palette PDF tema Coppa del Mondo (blu/arancio). Le chiavi storiche restano
 // per compatibilità ma puntano ai colori del tema: header blu scuro, accenti
 // arancio, testo chiaro leggibile su fondo scuro, superfici chiare pulite.
 const PDF_COLORS={
   ink:[6,19,45],          // blu scuro: fondo header + testo scuro su carta
   muted:[90,108,140],     // azzurro tenue per sottotitoli/testo secondario
   gold:[255,122,24],      // accento principale = arancio
   gold2:[255,255,255],    // testo/elementi chiari su header scuro = bianco
   cream:[247,251,255],    // testo chiarissimo su scuro
   line:[255,122,24],      // linee/bordi = arancio
   soft:[233,241,251],     // superficie chiara (righe tabella, box)
   blue:[31,99,255],       // blu brand (per accenti secondari)
   accentSoft:[255,176,95] // arancio chiaro
 };
 const imageCache=new Map();
 function teamFilterOptions(s,selected){return '<option value="">Tutte le squadre</option>'+s.teams.map(t=>`<option value="${t.id}" ${t.id===selected?'selected':''}>${UI.esc(t.name)}</option>`).join('');}
 function filteredPlayerStats(s){const rows=store.selectors.playerStats(s);return playerTeamFilter?rows.filter(p=>p.teamId===playerTeamFilter):rows.filter(p=>p.goals>0).slice(0,15);}
 function standingsRowsForMainTable(s,opts){return s.rules?.format==='league_knockout'?store.selectors.calculateStandings(s,'league',opts):store.selectors.calculateStandings(s,undefined,opts);}
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
   UI.$('#adminStandings').innerHTML=store.selectors.hasGroupStage(s)?UI.groupStandingsTables(s,standingsGroup):UI.standingsTable(standingsRowsForMainTable(s),s);
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
 // Rende il logo su canvas QUADRATO con letterbox + padding.
 // L'immagine mantiene le proporzioni originali e non tocca mai il bordo.
 function dataUrlFromImageContained(src, boxSize){
   boxSize = boxSize || 400;
   if(!src) return Promise.resolve(null);
   var cacheKey = "__c__" + src + "__" + boxSize;
   if(imageCache.has(cacheKey)) return imageCache.get(cacheKey);
   var p = new Promise(function(resolve){
     function render(img){
       try{
         var c = document.createElement("canvas");
         c.width = boxSize; c.height = boxSize;
         var ctx = c.getContext("2d");
         ctx.clearRect(0,0,boxSize,boxSize);
         // Padding 8% su ogni lato: logo distante dal bordo del riquadro
         var pad = Math.round(boxSize * 0.08);
         var inner = boxSize - pad * 2;
         var nw = img.naturalWidth || img.width || 1;
         var nh = img.naturalHeight || img.height || 1;
         var ar = nw / nh;
         var dw = ar >= 1 ? inner : inner * ar;
         var dh = ar >= 1 ? inner / ar : inner;
         var ox = pad + (inner - dw) / 2;
         var oy = pad + (inner - dh) / 2;
         ctx.drawImage(img, ox, oy, dw, dh);
         resolve(c.toDataURL("image/png"));
       } catch(e){ resolve(null); }
     }
     if(!src){ resolve(null); return; }
     var img = new Image();
     img.crossOrigin = "anonymous";
     img.onload = function(){ render(img); };
     img.onerror = function(){ resolve(null); };
     img.src = src;
   });
   imageCache.set(cacheKey, p);
   return p;
 }
 async function preloadTeamLogos(s){const out={};await Promise.all(s.teams.map(async t=>{out[t.id]=await dataUrlFromImageContained(t.logo,120);}));return out;}
 function teamInitial(name){return String(name||'?').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'NG';}
 function drawPlaceholderLogo(doc,x,y,size,label){setRgb(doc,'setFillColor',PDF_COLORS.soft);setRgb(doc,'setDrawColor',PDF_COLORS.line);doc.roundedRect(x,y,size,size,2.2,2.2,'FD');setRgb(doc,'setTextColor',PDF_COLORS.gold);doc.setFont('helvetica','bold');doc.setFontSize(Math.max(5,size*.45));doc.text(teamInitial(label),x+size/2,y+size*.62,{align:'center'});}
 function drawLogo(doc,src,x,y,size,label){
   if(src){
     try{ doc.addImage(src,"PNG",x,y,size,size,undefined,"FAST"); return; }catch(e){
     try{ doc.addImage(src,"JPEG",x,y,size,size,undefined,"FAST"); return; }catch(_){}}
   }
   drawPlaceholderLogo(doc,x,y,size,label);
 }
 async function baseDoc(s,title,subtitle,orientation='p'){
   const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation,unit:'mm',format:'a4',compress:true});
   const logo=await dataUrlFromImage(BRAND_LOGO); drawHeader(doc,s,title,subtitle,logo); return {doc,logo};
 }
 function drawHeader(doc,s,title,subtitle,logo){
   const w=doc.internal.pageSize.getWidth();
   setRgb(doc,'setFillColor',[6,19,45]);doc.rect(0,0,w,48,'F');
   setRgb(doc,'setFillColor',[6,19,45]);doc.rect(0,48,w,3,'F');
   drawLogo(doc,logo,w/2-12,6.5,24,s.rules?.name||'NG');
   setRgb(doc,'setTextColor',PDF_COLORS.cream);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text(String(s.rules?.name||'New Generation'),w/2,34,{align:'center'});
   setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFontSize(10);doc.text(String(title||'Report ufficiale'),w/2,40.5,{align:'center'});
   setRgb(doc,'setTextColor',[255,176,95]);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.text(String(subtitle||''),w/2,45.3,{align:'center'});
 }
 function addFooter(doc,s){
   const pages=doc.internal.getNumberOfPages();
   for(let i=1;i<=pages;i++){doc.setPage(i);const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();setRgb(doc,'setDrawColor',[255,122,24]);doc.setLineWidth(.2);doc.line(12,h-12,w-12,h-12);setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text(`${s.rules?.name||'New Generation'} · generato ${today()}`,12,h-7);doc.text(`Pagina ${i}/${pages}`,w-12,h-7,{align:'right'});}
 }
 function tableTheme(){return {theme:'grid',styles:{font:'helvetica',fontSize:8,cellPadding:2.1,lineColor:[255,176,95],lineWidth:.12,textColor:PDF_COLORS.ink,overflow:'linebreak',valign:'middle'},headStyles:{fillColor:PDF_COLORS.ink,textColor:PDF_COLORS.gold2,fontStyle:'bold',fontSize:7.5,halign:'center'},alternateRowStyles:{fillColor:[247,251,255]},margin:{left:12,right:12},showHead:'everyPage'};}
 function didDrawTeamLogo(logos,teamsByRow,colIndex=1){return function(data){if(data.section!=='body'||data.column.index!==colIndex)return;const row=teamsByRow[data.row.index];if(!row)return;drawLogo(data.doc,logos[row.teamId],data.cell.x+1.6,data.cell.y+1.4,6.2,row.name||row.teamName||row.team);};}
 function didParseTeamCell(colIndex=1){return function(data){if(data.section==='body'&&data.column.index===colIndex){data.cell.styles.cellPadding={top:2.1,right:2.1,bottom:2.1,left:10};data.cell.styles.fontStyle='bold';}};}
 function standingsRows(s,phase){return phase?store.selectors.calculateStandings(s,phase):standingsRowsForMainTable(s);}
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
 function bracketTeamName(s,m,side){const id=side==='home'?m.homeTeamId:m.awayTeamId;const label=side==='home'?m.homeLabel:m.awayLabel;return store.teamName(s,id,label||'Da definire');}
 function bracketTeamId(m,side){return side==='home'?m.homeTeamId:m.awayTeamId;}
 function isWinnerSide(s,m,side){const wid=store.winnerId(s,m);const id=bracketTeamId(m,side);return Boolean(wid&&id&&wid===id);}
 function drawBracketTeamRow(doc,s,logos,m,side,x,y,w,rowH){
   const id=bracketTeamId(m,side), name=bracketTeamName(s,m,side), win=isWinnerSide(s,m,side);
   const sc=store.matchGoals(s,m); const score=store.hasScore(s,m)?(side==='home'?sc.home:sc.away):'';
   setRgb(doc,'setFillColor',win?[255,246,235]:[255,255,255]);
   setRgb(doc,'setDrawColor',win?PDF_COLORS.gold:[219,229,244]);
   doc.roundedRect(x,y,w,rowH,2.2,2.2,'FD');
   if(win){setRgb(doc,'setFillColor',PDF_COLORS.gold);doc.roundedRect(x,y,2.2,rowH,2,2,'F');}
   drawLogo(doc,logos[id],x+3,y+1.6,7,name);
   setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica',win?'bold':'normal');doc.setFontSize(7.2);
   doc.text(String(name).slice(0,28),x+12,y+6.4,{maxWidth:w-21});
   if(score!==''){
     setRgb(doc,'setFillColor',win?PDF_COLORS.gold:PDF_COLORS.ink);
     setRgb(doc,'setTextColor',win?PDF_COLORS.ink:PDF_COLORS.gold2);
     doc.roundedRect(x+w-9.5,y+1.6,7.6,rowH-3.2,1.8,1.8,'F');
     doc.setFont('helvetica','bold');doc.setFontSize(7.6);doc.text(String(score),x+w-5.7,y+6.4,{align:'center'});
   }
 }
 function drawBracketCard(doc,s,logos,m,roundName,x,y,w,h){
   const done=store.hasScore(s,m)||m.status==='played';
   setRgb(doc,'setFillColor',[255,255,255]);
   setRgb(doc,'setDrawColor',[255,176,95]);
   doc.setLineWidth(.25);doc.roundedRect(x,y,w,h,4,4,'FD');
   setRgb(doc,'setFillColor',[6,19,45]);doc.roundedRect(x,y,w,7.2,4,4,'F');
   setRgb(doc,'setFillColor',PDF_COLORS.gold);doc.rect(x,y+5.5,w,1.7,'F');
   setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFont('helvetica','bold');doc.setFontSize(5.8);
   const meta=`${m.round||roundName}${m.field?' · '+m.field:''}`;
   doc.text(String(meta).slice(0,44),x+2.5,y+5,{maxWidth:w-5});
   drawBracketTeamRow(doc,s,logos,m,'home',x+2,y+9,w-4,9.8);
   drawBracketTeamRow(doc,s,logos,m,'away',x+2,y+20,w-4,9.8);
   const p=store.normalizePenalties?store.normalizePenalties(m.penalties):m.penalties;
   if(p&&store.hasScore(s,m)){
     setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFont('helvetica','normal');doc.setFontSize(5.4);
     doc.text(`d.c.r. ${p.home}-${p.away}`,x+w-3,y+h-2.7,{align:'right'});
   }
   setRgb(doc,'setFillColor',done?[229,255,238]:[241,246,255]);
   setRgb(doc,'setTextColor',done?[20,112,55]:PDF_COLORS.blue);
   doc.roundedRect(x+2,y+h-5.2,18,3.6,1.7,1.7,'F');doc.setFont('helvetica','bold');doc.setFontSize(4.8);doc.text(done?'GIOCATA':'DA GIOCARE',x+11,y+h-2.6,{align:'center'});
 }
 function drawBracketPage(doc,s,logos,bracket,logo,addNewPage=true){
   if(addNewPage)doc.addPage('a4','landscape');
   drawHeader(doc,s,`Tabellone · ${bracket.name}`,'Percorso finale con accoppiamenti, risultati e avanzamento verso la finale.',logo);
   const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
   const left=10,right=10,top=56,bottom=15;
   const rounds=bracket.rounds||[];
   const gap=Math.max(5,Math.min(9,26/Math.max(1,rounds.length)));
   const colW=(w-left-right-gap*(rounds.length-1))/Math.max(1,rounds.length);
   // Sfondo sportivo leggero: bande blu/arancio senza appesantire il PDF.
   setRgb(doc,'setFillColor',[247,251,255]);doc.rect(0,51,w,h-51,'F');
   setRgb(doc,'setFillColor',[238,245,255]);doc.rect(left,top-4,w-left-right,h-top-bottom+6,'F');
   setRgb(doc,'setFillColor',[255,122,24]);doc.rect(left,top-4,2.2,h-top-bottom+6,'F');
   setRgb(doc,'setFillColor',[31,99,255]);doc.rect(w-right-2.2,top-4,2.2,h-top-bottom+6,'F');
   const positions=[];
   rounds.forEach((round,ri)=>{
     const x=left+ri*(colW+gap);
     const count=Math.max(round.matches.length,1);
     const available=h-top-bottom-10;
     const innerGap=count>1?Math.min(6,Math.max(3,(available-28*count)/(count-1))):0;
     const cardH=Math.max(28,Math.min(34,(available-innerGap*(count-1))/count));
     const totalH=count*cardH+(count-1)*innerGap;
     const startY=top+9+Math.max(0,(available-totalH)/2);
     positions[ri]=round.matches.map((m,mi)=>({x,y:startY+mi*(cardH+innerGap),w:colW,h:cardH,mid:startY+mi*(cardH+innerGap)+cardH/2,match:m,roundName:round.name}));
   });
   // Connettori tabellone: linee a gomito pulite tra un turno e il successivo.
   setRgb(doc,'setDrawColor',PDF_COLORS.gold);doc.setLineWidth(.45);
   for(let ri=0;ri<positions.length-1;ri++){
     const curr=positions[ri],next=positions[ri+1];
     next.forEach((n,j)=>{
       const a=curr[j*2],b=curr[j*2+1];
       const xStart=(a?a.x+a.w:(b?b.x+b.w:0));
       const xMid=xStart+gap*.52;
       if(a){doc.line(a.x+a.w,a.mid,xMid,a.mid);}
       if(b){doc.line(b.x+b.w,b.mid,xMid,b.mid);}
       if(a&&b)doc.line(xMid,a.mid,xMid,b.mid);
       const yTo=n.mid;
       doc.line(xMid,yTo,n.x,yTo);
     });
   }
   // Colonne e card.
   rounds.forEach((round,ri)=>{
     const x=left+ri*(colW+gap);
     setRgb(doc,'setFillColor',PDF_COLORS.ink);doc.roundedRect(x,top-3,colW,8,2.2,2.2,'F');
     setRgb(doc,'setFillColor',PDF_COLORS.gold);doc.roundedRect(x,top+3.3,colW,1.7,0.8,0.8,'F');
     setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFont('helvetica','bold');doc.setFontSize(7.4);
     doc.text(String(round.name),x+colW/2,top+2.2,{align:'center',maxWidth:colW-3});
     (positions[ri]||[]).forEach(pos=>drawBracketCard(doc,s,logos,pos.match,pos.roundName,pos.x,pos.y,pos.w,pos.h));
   });
   // Box finale/nota sportiva.
   const last=positions[positions.length-1]?.[0];
   if(last){
     setRgb(doc,'setFillColor',[6,19,45]);setRgb(doc,'setDrawColor',PDF_COLORS.gold);doc.roundedRect(last.x,last.y+last.h+3,last.w,9,3,3,'FD');
     setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFont('helvetica','bold');doc.setFontSize(5.6);doc.text('Percorso verso il titolo',last.x+last.w/2,last.y+last.h+8.6,{align:'center'});
   }
 }

 function drawDenseBracketPages(doc,s,logos,bracket,logo,addNewPage=true){
   if(addNewPage)doc.addPage('a4','landscape');
   const rounds=bracket.rounds||[];
   let pageStarted=false;
   function newPage(title){if(pageStarted)doc.addPage('a4','landscape');pageStarted=true;drawHeader(doc,s,title,'Tabellone fase finale in layout sportivo anti-sovrapposizione: turni separati, card leggibili, colori blu/arancio.',logo);}
   newPage(`Tabellone · ${bracket.name}`);
   const w=doc.internal.pageSize.getWidth();
   const left=12, topStart=58, colGap=8, cardGap=6;
   const cardW=(w-left*2-colGap)/2;
   let y=topStart;
   rounds.forEach((round,ri)=>{
     const cards=round.matches||[];
     const needed=12+Math.ceil(Math.max(cards.length,1)/2)*(32+cardGap)+6;
     if(y+needed>188){newPage(`Tabellone · ${bracket.name}`);y=topStart;}
     setRgb(doc,'setFillColor',PDF_COLORS.ink);setRgb(doc,'setDrawColor',PDF_COLORS.gold);doc.roundedRect(left,y,w-left*2,9,3,3,'FD');
     setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFont('helvetica','bold');doc.setFontSize(8.6);doc.text(String(round.name),left+4,y+6.2,{maxWidth:w-left*2-8});
     y+=13;
     if(!cards.length){setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('Nessuna partita in questo turno.',left,y+6);y+=18;return;}
     cards.forEach((m,mi)=>{
       const col=mi%2,row=Math.floor(mi/2);const x=left+col*(cardW+colGap);const cy=y+row*(32+cardGap);
       drawBracketCard(doc,s,logos,m,round.name,x,cy,cardW,32);
     });
     y+=Math.ceil(cards.length/2)*(32+cardGap)+8;
   });
 }
 async function pdfBracket(){
   const s=currentPdfState(), logos=await preloadTeamLogos(s); const {doc,logo}=await baseDoc(s,'Tabellone fase finale','Grafica tabellone con squadre, placeholder e risultati.','l');
   const data=store.bracketData(s);
   if(!data.available){doc.autoTable({...tableTheme(),startY:58,head:[['Info']],body:[[data.message||'Nessun tabellone disponibile.']]});}
   else {data.brackets.forEach((b,i)=>{const maxMatches=Math.max(...(b.rounds||[]).map(r=>(r.matches||[]).length),0); if(maxMatches>4)drawDenseBracketPages(doc,s,logos,b,logo,i>0); else drawBracketPage(doc,s,logos,b,logo,i>0);});}
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
