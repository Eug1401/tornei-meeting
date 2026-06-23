(function(){
  const store=window.NexoraStore, UI=window.NexoraUI;
  document.body.classList.add('admin-page');
  function state(){return store.load('admin');}
  function save(s){store.save('admin',s);} 
  function commit(fn){const s=state(); fn(s); store.alignState(s); save(s); return s;}
  function flash(el,text,type='ok'){const node=typeof el==='string'?UI.$(el):el;if(node)node.innerHTML=text?`<div class="message ${type}">${UI.esc(text)}</div>`:'';}
  // Label dell'admin corrente per i lock atomici. Prende email/nome dalla sessione Supabase
  // o un nick salvato in localStorage. Default 'Admin'.
  function adminLabel(){
    try{
      const stored = localStorage.getItem('ng-admin-label');
      if(stored) return stored;
      const sess = window.NG_SUPABASE_CLIENT?.auth?.getSession?.();
      // sess è una Promise - non possiamo aspettarla qui. Usiamo email cache se disponibile.
      const cached = window.NG_ADMIN_EMAIL_CACHE;
      if(cached) return cached.split('@')[0];
    }catch(_){}
    return 'Admin';
  }

  const PDF_COLORS={
    bg:[6,19,45],        // fondo header/strisce = blu scuro
    ink:[6,19,45],       // testo scuro su carta = blu scuro
    muted:[90,108,140],  // testo secondario = azzurro tenue
    gold:[255,122,24],   // accento = arancio
    gold2:[255,255,255], // testo chiaro su header scuro = bianco
    paper:[247,251,255], // superficie chiara pulita
    line:[255,122,24],   // linee/bordi = arancio
    red:[229,83,95],     // danger coerente col tema
    blue:[31,99,255]     // blu brand
  };
  function setRgb(doc,fn,c){doc[fn](...(Array.isArray(c)?c:[c,c,c]));}
  function today(){return new Date().toLocaleDateString('it-IT');}
  function slug(v){return String(v||'new-generation').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'new-generation';}
  function teamInitial(label){return String(label||'NG').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'NG';}
  function loadScriptOnce(src){return new Promise((resolve,reject)=>{if([...document.scripts].some(s=>s.src===src)){resolve();return;}const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Libreria non caricata: '+src));document.head.appendChild(s);});}
  async function ensurePdfTools(){if(!(window.jspdf&&window.jspdf.jsPDF))await loadScriptOnce('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js');if(!(window.jspdf&&window.jspdf.jsPDF))throw new Error('jsPDF non disponibile');if(!window.jspdf.jsPDF.API.autoTable)await loadScriptOnce('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js');}
  function imgToDataURL(src){return new Promise(resolve=>{if(!src){resolve('');return;}if(/^data:image\//.test(src)){resolve(src);return;}const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const c=document.createElement('canvas');const scale=Math.min(1,900/Math.max(img.naturalWidth||1,img.naturalHeight||1));c.width=Math.max(1,Math.round((img.naturalWidth||1)*scale));c.height=Math.max(1,Math.round((img.naturalHeight||1)*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/png'));}catch(e){resolve('');}};img.onerror=()=>resolve('');img.src=src;});}
  async function preloadTeamLogos(s){const out={};for(const t of (s.teams||[])){out[t.id]=await imgToDataURL(t.logo);}return out;}
  function drawPlaceholderLogo(doc,x,y,size,label){setRgb(doc,'setFillColor',PDF_COLORS.gold);setRgb(doc,'setDrawColor',PDF_COLORS.gold2);doc.roundedRect(x,y,size,size,4,4,'FD');setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(Math.max(7,size*.28));doc.text(teamInitial(label),x+size/2,y+size*.58,{align:'center'});}
  function drawLogo(doc,src,x,y,size,label){if(src){try{doc.addImage(src,'PNG',x,y,size,size,undefined,'FAST');return;}catch(e){}}drawPlaceholderLogo(doc,x,y,size,label);}
  async function createRecapDoc(s){
    await ensurePdfTools();
    const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation:'p',unit:'mm',format:'a4',compress:true});
    const logos=await preloadTeamLogos(s); const brand=await imgToDataURL('assets/brand/new-generation-logo-transparent.png');
    const mainPhase=store.mainStandingsPhase?store.mainStandingsPhase(s):(store.selectors.hasGroupStage(s)?'group':'league');
    const standings=store.selectors.calculateStandings(s,mainPhase).map((r,i)=>({...r,rank:i+1,diff:(r.diff>0?'+':'')+r.diff}));
    const scorers=store.selectors.scorers(s).slice(0,15).map((p,i)=>({...p,rank:i+1,player:p.name,team:p.teamName,year:p.birthYear||'-'}));
    const presidentScorers=(store.selectors.presidentScorers?store.selectors.presidentScorers(s):[]).map((p,i)=>({...p,rank:i+1,president:p.name,team:p.teamName}));
    const data=store.bracketData(s);
    const winner=findWinner(s,standings);
    function header(title,subtitle){const w=doc.internal.pageSize.getWidth();setRgb(doc,'setFillColor',PDF_COLORS.bg);doc.rect(0,0,w,50,'F');drawLogo(doc,brand,w/2-15,6,30,s.rules?.name||'NG');setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text(String(s.rules?.name||'New Generation'),w/2,40,{align:'center'});setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(title,14,66);setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(subtitle,14,72,{maxWidth:w-28});}
    function footer(){const pages=doc.internal.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();setRgb(doc,'setDrawColor',PDF_COLORS.gold);doc.setLineWidth(.25);doc.line(14,h-13,w-14,h-13);setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(`Recap torneo - ${today()}`,14,h-8);doc.text(`Pagina ${i}/${pages}`,w-14,h-8,{align:'right'});}}
    function tableTheme(){return {theme:'grid',styles:{font:'helvetica',fontSize:8,cellPadding:2,lineColor:[255,176,95],lineWidth:.12,textColor:PDF_COLORS.ink,overflow:'linebreak',valign:'middle'},headStyles:{fillColor:PDF_COLORS.ink,textColor:PDF_COLORS.gold2,fontStyle:'bold',fontSize:7.5,halign:'center'},alternateRowStyles:{fillColor:[247,251,255]},margin:{left:14,right:14},showHead:'everyPage'};}
    function didParseTeamCell(col){return function(d){if(d.section==='body'&&d.column.index===col){d.cell.styles.cellPadding={top:2,right:2,bottom:2,left:11};d.cell.styles.fontStyle='bold';}};}
    function didDrawTeamLogo(rows,col){return function(d){if(d.section==='body'&&d.column.index===col){const r=rows[d.row.index];if(r)drawLogo(d.doc,logos[r.teamId],d.cell.x+1.6,d.cell.y+1.3,6.4,r.name||r.team);}};}
    header('Recap ufficiale torneo','Documento riepilogativo prima del reset: classifiche, marcatori, tabellone finale e squadra vincente.');
    setRgb(doc,'setFillColor',[247,251,255]);setRgb(doc,'setDrawColor',PDF_COLORS.line);doc.roundedRect(14,80,182,44,5,5,'FD');drawLogo(doc,winner.logo,22,88,28,winner.name);setRgb(doc,'setTextColor',PDF_COLORS.gold);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('SQUADRA VINCENTE',58,93);setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFontSize(20);doc.text(winner.name,58,103,{maxWidth:125});setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(winner.note,58,113,{maxWidth:125});
    doc.autoTable({...tableTheme(),startY:133,columns:[{header:'#',dataKey:'rank'},{header:'Squadra',dataKey:'name'},{header:'Pt',dataKey:'points'},{header:'PG',dataKey:'played'},{header:'GF',dataKey:'goalsFor'},{header:'GS',dataKey:'goalsAgainst'},{header:'DR',dataKey:'diff'}],body:standings.length?standings:[{rank:'-',name:'Nessuna classifica disponibile',points:'-',played:'-',goalsFor:'-',goalsAgainst:'-',diff:'-',teamId:''}],columnStyles:{0:{halign:'center',cellWidth:10},1:{cellWidth:75},2:{halign:'center'},3:{halign:'center'},4:{halign:'center'},5:{halign:'center'},6:{halign:'center'}},didParseCell:didParseTeamCell(1),didDrawCell:didDrawTeamLogo(standings,1)});
    doc.addPage();header('Classifiche marcatori','Top 15 calciatori del torneo e, in modalità Kings League, classifica presidenti separata.');
    doc.autoTable({...tableTheme(),startY:82,columns:[{header:'#',dataKey:'rank'},{header:'Giocatore',dataKey:'player'},{header:'Anno',dataKey:'year'},{header:'Squadra',dataKey:'team'},{header:'Gol',dataKey:'goals'},{header:'PG',dataKey:'played'}],body:scorers.length?scorers:[{rank:'-',player:'Nessun marcatore disponibile',year:'-',team:'-',goals:'-',played:'-',teamId:''}],columnStyles:{0:{halign:'center',cellWidth:10},1:{cellWidth:58,fontStyle:'bold'},2:{halign:'center',cellWidth:18},3:{cellWidth:58},4:{halign:'center',fontStyle:'bold'},5:{halign:'center'}},didParseCell:function(d){if(d.section==='body'&&d.column.index===3)d.cell.styles.cellPadding={top:2,right:2,bottom:2,left:11};},didDrawCell:function(d){if(d.section==='body'&&d.column.index===3){const r=scorers[d.row.index];if(r)drawLogo(d.doc,logos[r.teamId],d.cell.x+1.6,d.cell.y+1.3,6.4,r.team);}}});
    const presY=Math.min((doc.lastAutoTable?.finalY||82)+14,215);
    setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text('Classifica presidenti',14,presY);
    doc.autoTable({...tableTheme(),startY:presY+6,columns:[{header:'#',dataKey:'rank'},{header:'Presidente',dataKey:'president'},{header:'Squadra',dataKey:'team'},{header:'Gol',dataKey:'goals'}],body:presidentScorers.length?presidentScorers:[{rank:'-',president:'Nessun gol presidente disponibile',team:'-',goals:'-',teamId:''}],columnStyles:{0:{halign:'center',cellWidth:10},1:{cellWidth:70,fontStyle:'bold'},2:{cellWidth:70},3:{halign:'center',fontStyle:'bold'}},didParseCell:function(d){if(d.section==='body'&&d.column.index===2)d.cell.styles.cellPadding={top:2,right:2,bottom:2,left:11};},didDrawCell:function(d){if(d.section==='body'&&d.column.index===2){const r=presidentScorers[d.row.index];if(r)drawLogo(d.doc,logos[r.teamId],d.cell.x+1.6,d.cell.y+1.3,6.4,r.team);}}});
    doc.addPage('a4','landscape');drawBracketRecap(doc,s,logos,brand,data);
    footer(); return doc;
  }
  function findWinner(s,standings){
    const final=findTournamentFinalMatch(s);
    if(final){
      const id=store.winnerId(s,final);
      if(id){const t=store.getTeam(s,id);if(t)return {name:t.name,logo:t.logo||'',note:`Campione: vincente della finale${final.bracketName?` (${final.bracketName})`:''}`};}
      return {name:'Vincitore da definire',logo:'',note:'La finale non ha ancora un risultato valido.'};
    }
    return {name:'Vincitore da definire',logo:'',note:'Nessuna finale disponibile nel tabellone: placeholder automatico.'};
  }
  function findTournamentFinalMatch(s){
    const matches=(s.matches||[]).filter(m=>m&&(m.bracketName||['knockout','playoff'].includes(m.phase)));
    if(!matches.length)return null;
    const finals=matches.filter(m=>String(m.bracketRound||m.round||'').toLowerCase().includes('finale'));
    const primary=finals.find(m=>['Fase finale','Tabellone principale','Tabellone'].includes(m.bracketName))||finals.find(m=>m.phase==='knockout')||finals[0];
    if(primary)return primary;
    return matches.slice().sort((a,b)=>(b.roundIndex-a.roundIndex)||(b.bracketRoundIndex-a.bracketRoundIndex)||(b.bracketMatchIndex-a.bracketMatchIndex))[0]||null;
  }
  function recapSourceLabel(m,side,fallback){
    const src=side==='home'?m.sourceHome:m.sourceAway;
    if(src&&src.startsWith('winner:')){const parts=src.split(':');return `Vincente ${parts.slice(1,-2).join(':')} ${parts[parts.length-2]}.${parts[parts.length-1]}`;}
    if(src&&src.startsWith('group:')){const parts=src.split(':');const pos=parts.pop();return `${pos}ª ${parts.slice(1).join(':')}`;}
    if(src&&src.startsWith('league:'))return `${src.split(':')[1]}ª classificata`;
    if(src&&src.startsWith('bracketwinner:'))return `Vincente ${src.split(':').slice(1).join(':')}`;
    return fallback||'Da definire';
  }
  function drawTeamLine(doc,s,logos,m,side,x,y,w){const id=side==='home'?m.homeTeamId:m.awayTeamId;const raw=side==='home'?m.homeLabel:m.awayLabel;const name=id?store.teamName(s,id,raw):recapSourceLabel(m,side,raw||'Da definire');const sc=store.matchGoals(s,m);const score=store.hasScore(s,m)?(side==='home'?sc.home:sc.away):'';drawLogo(doc,logos[id],x+1.4,y+1,5.8,name);setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.text(String(name),x+8.8,y+5.2,{maxWidth:w-17});if(score!==''){setRgb(doc,'setFillColor',PDF_COLORS.gold);doc.circle(x+w-4.2,y+4.0,3.2,'F');setRgb(doc,'setTextColor',PDF_COLORS.ink);doc.setFontSize(7);doc.text(String(score),x+w-4.2,y+5.0,{align:'center'});} }
  function drawBracketRecap(doc,s,logos,brand,data){const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();setRgb(doc,'setFillColor',PDF_COLORS.bg);doc.rect(0,0,w,38,'F');drawLogo(doc,brand,w/2-11,4,22,s.rules?.name||'NG');setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text('Tabellone finale',w/2,32,{align:'center'});if(!data.available){setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFontSize(12);doc.text(data.message||'Nessun tabellone disponibile.',w/2,h/2,{align:'center'});return;}const bracket=data.brackets.find(b=>['Fase finale','Tabellone principale','Tabellone'].includes(b.name))||data.brackets[0];const rounds=bracket.rounds||[];const left=10,right=10,top=50,bottom=18,gap=6;const colW=Math.min(88,(w-left-right-gap*(rounds.length-1))/Math.max(1,rounds.length));const startX=(w-(colW*rounds.length+gap*(rounds.length-1)))/2;const yMap=[];rounds.forEach((round,ri)=>{const x=startX+ri*(colW+gap);setRgb(doc,'setFillColor',PDF_COLORS.ink);doc.roundedRect(x,top-10,colW,7.5,2,2,'F');setRgb(doc,'setTextColor',PDF_COLORS.gold2);doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.text(String(round.name),x+colW/2,top-4.9,{align:'center',maxWidth:colW-2});const count=Math.max(round.matches.length,1);const cardH=Math.max(20,Math.min(30,(h-top-bottom-(count-1)*7)/count));const available=h-top-bottom-cardH;const ys=[];round.matches.forEach((m,mi)=>{const y=top+(count===1?available/2:(available*mi/(count-1)));ys.push(y);setRgb(doc,'setFillColor',[247,251,255]);setRgb(doc,'setDrawColor',PDF_COLORS.line);doc.setLineWidth(.22);doc.roundedRect(x,y,colW,cardH,3.5,3.5,'FD');setRgb(doc,'setTextColor',PDF_COLORS.muted);doc.setFont('helvetica','normal');doc.setFontSize(5.6);doc.text(`${m.bracketName||bracket.name} · ${round.name} ${m.bracketMatchIndex||mi+1} · ${m.field||'Campo da definire'}`,x+2.2,y+4.3,{maxWidth:colW-4});drawTeamLine(doc,s,logos,m,'home',x+2,y+7.0,colW-4);drawTeamLine(doc,s,logos,m,'away',x+2,y+15.2,colW-4);});yMap[ri]=ys;});for(let ri=0;ri<rounds.length-1;ri++){const x1=startX+ri*(colW+gap)+colW;const x2=startX+(ri+1)*(colW+gap);(rounds[ri].matches||[]).forEach((m,mi)=>{const target=Math.floor(mi/2);const y1=(yMap[ri][mi]||0)+12;const y2=(yMap[ri+1][target]||0)+12;const mid=x1+gap/2;setRgb(doc,'setDrawColor',PDF_COLORS.gold);doc.setLineWidth(.32);doc.line(x1,y1,mid,y1);doc.line(mid,y1,mid,y2);doc.line(mid,y2,x2,y2);});}}
  async function downloadRecapPdf(s){const doc=await createRecapDoc(store.normalizeState(s));doc.save(`${slug(s.rules?.name||'new-generation')}-recap-torneo.pdf`);}  
  function stableStringify(value){
    if(value===null||typeof value!=='object')return JSON.stringify(value);
    if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableStringify(value[k])).join(',')+'}';
  }
  function checksumText(text){
    let h=2166136261;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function backupPayload(s,source='manual'){
    const clean=store.normalizeState(s);
    const derived=store.derivedSnapshot?store.derivedSnapshot(clean):null;
    const archiveId=`snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
    const stateText=stableStringify(clean);
    return {
      app:'new-generation',
      type:'tournament-state-snapshot',
      version:2,
      snapshotVersion:2,
      archiveId,
      exportedAt:new Date().toISOString(),
      source,
      checksum:checksumText(stateText),
      meta:{
        tournamentName:clean.rules?.name||'New Generation',
        format:store.FORMAT_LABELS?.[clean.rules?.format]||clean.rules?.format||'',
        teams:(clean.teams||[]).length,
        players:(clean.teams||[]).reduce((sum,t)=>sum+(t.players||[]).length,0),
        matches:(clean.matches||[]).length,
        articles:(clean.articles||[]).length,
        mode:clean.rules?.format||''
      },
      configuration:{rules:clean.rules,site:clean.site},
      statistics:derived?.stats||{},
      standings:derived?.standings||[],
      groups:derived?.groups||[],
      scorers:derived?.scorers||[],
      phases:derived?.phases||[],
      state:clean
    };
  }
  function downloadJsonFile(payload,filename){
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1200);
  }
  function downloadStateBackup(s,source='manual'){
    const payload=backupPayload(s,source);
    downloadJsonFile(payload,`${slug(payload.meta.tournamentName)}-snapshot-torneo-${new Date().toISOString().slice(0,10)}.json`);
    return payload;
  }
  function parseBackupPayload(raw){
    let payload;
    try{payload=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){throw new Error('File JSON non leggibile.');}
    if(!payload||typeof payload!=='object')throw new Error('Backup non valido.');
    const candidate=(payload.type==='tournament-state-backup'||payload.type==='tournament-state-snapshot')?payload.state:payload.state||payload;
    if(!candidate||typeof candidate!=='object')throw new Error('Il file non contiene uno stato torneo.');
    const normalized=store.normalizeState(candidate);
    return {payload, state:normalized};
  }
  function importStateBackup(payload,{reload=true}={}){
    const parsed=parseBackupPayload(payload);
    const current=state();
    const msg=`Confermi il ripristino del backup?\n\nTorneo nel file: ${parsed.state.rules?.name||'New Generation'}\nSquadre: ${(parsed.state.teams||[]).length}\nPartite: ${(parsed.state.matches||[]).length}\n\nLo stato attuale (${(current.teams||[]).length} squadre, ${(current.matches||[]).length} partite) verrà sostituito.`;
    if(!confirm(msg))return false;
    save(parsed.state);
    if(reload)setTimeout(()=>location.reload(),400);
    return true;
  }
  function resetStorageAndState(){
    try{Object.keys(localStorage).filter(k=>k.startsWith('new-generation-admin-state')||k.startsWith('new-generation-public-state')||k.startsWith('nexora-admin-state')||k.startsWith('nexora-public-state')).forEach(k=>localStorage.removeItem(k));}catch(e){}
    save(store.emptyState());
    location.reload();
  }
  let resetInFlight=false;
  function openResetDialog(){
    let dlg=document.getElementById('resetTournamentDialog');
    if(!dlg){
      dlg=document.createElement('div');dlg.id='resetTournamentDialog';dlg.className='ng-modal-backdrop';
      dlg.innerHTML=`<div class="ng-modal card pad reset-modal" role="dialog" aria-modal="true" aria-labelledby="resetDialogTitle">
        <span class="pill danger-pill">Azione irreversibile</span>
        <h2 id="resetDialogTitle">Reset torneo</h2>
        <p class="muted">Il reset cancella torneo, squadre, giocatori, referti, articoli, calendari e cache pubbliche. Prima dell'azzeramento vengono generati snapshot JSON e PDF finale.</p>
        <div class="reset-export-panel">
          <label class="check-card forced-card"><input id="resetExportBackup" type="checkbox" checked disabled><span><strong>Scarica snapshot completo JSON</strong><small>Contiene stato, metadati, statistiche e checksum; può essere ricaricato dall'interfaccia di ripristino.</small></span></label>
          <label class="check-card forced-card"><input id="resetExportRecap" type="checkbox" checked disabled><span><strong>Scarica PDF finale prima del reset</strong><small>Obbligatorio: viene generato con lo stato attuale prima di cancellare i dati.</small></span></label>
        </div>
        <label class="check-card confirm-card"><input id="resetConfirmCheck" type="checkbox"><span><strong>Confermo di voler azzerare il torneo</strong><small>Ho capito che l'operazione sostituisce lo stato attuale con un torneo vuoto.</small></span></label>
        <div id="resetDialogMsg"></div>
        <div class="reset-choice-grid"><button class="btn danger" id="resetExecuteBtn" type="button" disabled>Conferma ed esegui reset</button><button class="btn" id="cancelResetBtn" type="button">Annulla</button></div>
      </div>`;
      document.body.appendChild(dlg);
      const confirmCheck=dlg.querySelector('#resetConfirmCheck');
      const execBtn=dlg.querySelector('#resetExecuteBtn');
      confirmCheck.addEventListener('change',()=>{execBtn.disabled=!confirmCheck.checked;});
      dlg.querySelector('#cancelResetBtn').addEventListener('click',()=>dlg.classList.remove('show'));
      dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.classList.remove('show');});
      execBtn.addEventListener('click',async()=>{
        if(!confirmCheck.checked)return;
        if(resetInFlight)return;
        const msg=dlg.querySelector('#resetDialogMsg');
        const current=state();
        try{
          resetInFlight=true;
          execBtn.disabled=true;
          msg.innerHTML='<div class="message">Preparo snapshot JSON e PDF finale prima del reset...</div>';
          const snapshot=downloadStateBackup(current,'reset-flow');
          await downloadRecapPdf(current);
          await new Promise(resolve=>setTimeout(resolve,1500));
          msg.innerHTML=`<div class="message ok">Snapshot ${UI.esc(snapshot.archiveId)} e PDF finale avviati. Reset in corso...</div>`;
          setTimeout(resetStorageAndState,900);
        }catch(err){
          console.error(err);
          resetInFlight=false;
          execBtn.disabled=false;
          msg.innerHTML=`<div class="message error">Operazione interrotta: ${UI.esc(err.message||err)}</div>`;
        }
      });
    }
    const msg=dlg.querySelector('#resetDialogMsg'); if(msg)msg.innerHTML='';
    const chk=dlg.querySelector('#resetConfirmCheck'); if(chk)chk.checked=false;
    const exec=dlg.querySelector('#resetExecuteBtn'); if(exec)exec.disabled=true;
    resetInFlight=false;
    dlg.classList.add('show');
  }

  function tournamentNameValidation(value){
    const name=String(value||'').trim().replace(/\s+/g,' ');
    if(name.length<3)return {ok:false,message:'Il nome torneo deve avere almeno 3 caratteri.'};
    if(name.length>80)return {ok:false,message:'Il nome torneo non può superare 80 caratteri.'};
    if(/[\u0000-\u001f\u007f]/.test(name))return {ok:false,message:'Il nome torneo contiene caratteri non validi.'};
    return {ok:true,name};
  }
  function syncTournamentTitleDisplay(saved){
    try{UI.applySiteTheme(saved||state());}catch(_){ }
  }
  function installTournamentNameEditor(){
    const title=UI.$('[data-brand-title]');
    if(!title||title.dataset.inlineTournamentName==='ready')return;
    title.dataset.inlineTournamentName='ready';
    const holder=title.parentElement;
    if(!holder)return;
    const row=document.createElement('div');
    row.className='tournament-title-row';
    holder.insertBefore(row,title);
    row.appendChild(title);
    const edit=document.createElement('button');
    edit.className='btn small tournament-name-edit-btn';
    edit.type='button';
    edit.textContent='Modifica nome';
    edit.setAttribute('aria-label','Modifica nome torneo');
    row.appendChild(edit);
    const form=document.createElement('form');
    form.className='tournament-title-form';
    form.hidden=true;
    form.innerHTML='<label class="sr-only" for="inlineTournamentNameInput">Nome torneo</label><input id="inlineTournamentNameInput" maxlength="80" autocomplete="off"><button class="btn small primary" type="submit">Salva</button><button class="btn small" type="button" data-cancel-title-edit>Annulla</button><div class="title-edit-message" aria-live="polite"></div>';
    holder.insertBefore(form,row.nextSibling);
    const input=form.querySelector('input');
    const msg=form.querySelector('.title-edit-message');
    function authReady(){
      const cfg=window.NEW_GENERATION_SUPABASE||{};
      if(!(cfg.ENABLED&&cfg.URL&&cfg.ANON_KEY))return true;
      return Boolean(window.NG_ADMIN_EMAIL_CACHE)&&!document.getElementById('ngLoginOverlay');
    }
    function refreshVisibility(){edit.hidden=!authReady();}
    function closeEdit(){form.hidden=true;title.hidden=false;refreshVisibility();msg.textContent='';}
    function openEdit(){syncTournamentTitleDisplay();const s=state();input.value=String(s.rules?.name||UI.siteTitle?.(s)||'New Generation');title.hidden=true;edit.hidden=true;form.hidden=false;msg.textContent='';setTimeout(()=>{input.focus();input.select();},0);}
    edit.addEventListener('click',openEdit);
    form.querySelector('[data-cancel-title-edit]').addEventListener('click',closeEdit);
    input.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeEdit();}});
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const valid=tournamentNameValidation(input.value);
      if(!valid.ok){msg.textContent=valid.message;input.focus();return;}
      const saved=commit(s=>{s.rules.name=valid.name;s.site=s.site||{};s.site.title=valid.name;s.rules.updatedAt=new Date().toISOString();s.rules.updatedBy=adminLabel();});
      syncTournamentTitleDisplay(saved);
      closeEdit();
      window.dispatchEvent(new CustomEvent('ng:tournament-name-updated',{detail:{name:valid.name,state:saved}}));
    });
    window.addEventListener('ng:admin-state-loaded',()=>{syncTournamentTitleDisplay();refreshVisibility();});
    window.addEventListener('ng:remote-save-status',refreshVisibility);
    const visibilityTimer=setInterval(refreshVisibility,500);
    setTimeout(()=>clearInterval(visibilityTimer),6000);
    setTimeout(refreshVisibility,300);
    setTimeout(refreshVisibility,1200);
    syncTournamentTitleDisplay();
    refreshVisibility();
  }
  function initGlobalActions(){try{UI.applySiteTheme(state());}catch(e){}installTournamentNameEditor();const reset=UI.$('#resetAllBtn');if(reset)reset.addEventListener('click',openResetDialog);}
  function renderStats(id){const box=UI.$(id); if(box) box.innerHTML=UI.statsGrid(store.selectors.stats(state()));}
  function teamOptions(s, selected=''){return UI.teamOptions(s, selected);}
  function renderTeamsList(container){
    const s=state(), box=UI.$(container);
    if(!box)return;
    if(!s.teams.length){box.innerHTML='<div class="empty">Nessuna squadra inserita.</div>';return;}
    box.innerHTML=`<div class="section-toolbar danger-toolbar"><div><strong>Staff squadre</strong><small>Pulisce presidente e allenatore. Se in Kings il presidente era marcatore, quei gol vengono rimossi dal referto.</small></div><button class="btn danger" type="button" data-clear-all-staff> Pulisci presidenti e allenatori</button></div><div class="team-disclosure-list admin-disclosure-list">${s.teams.map((t,i)=>`<details class="ng-disclosure admin-team-disclosure">
      <summary class="ng-disclosure-summary">
        <span class="disclosure-main">${UI.logo(t,false)}<span><strong>${UI.esc(t.name)}</strong><small>${t.players.length} calciatori${t.president?.name?` · Presidente: ${UI.esc(t.president.name)}`:''}${t.coach?.name?` · Allenatore: ${UI.esc(t.coach.name)}`:''}</small></span></span>
        <span class="disclosure-action">Gestisci</span>
      </summary>
      <div class="ng-disclosure-body">
        <div class="team-profile-meta compact-meta">
          <span><strong>Presidente</strong>${UI.esc(t.president?.name||'Non inserito')}</span>
          <span><strong>Allenatore</strong>${UI.esc(t.coach?.name||'Non inserito')}</span>
          <span><strong>Roster</strong>${t.players.length} calciatori</span>
        </div>
        <form class="team-edit-form form-grid margin-top" data-team-id="${t.id}">
          <div><label>Nome</label><input name="name" value="${UI.esc(t.name)}" required></div>
          <div><label>Presidente</label><input name="presidentName" value="${UI.esc(t.president?.name||'')}" placeholder="Cognome Nome"></div>
          <div><label>Allenatore</label><input name="coachName" value="${UI.esc(t.coach?.name||'')}" placeholder="Cognome Nome"></div>
          <div class="field-full"><label>Sostituisci logo dal dispositivo</label><input name="logoFile" type="file" accept="image/*"></div>
          <div class="field-full row-actions"><button class="btn primary" type="submit">Salva modifica</button><button class="btn ghost" type="button" data-clear-team-staff="${t.id}">Pulisci staff</button><button class="btn danger" type="button" data-delete-team="${t.id}">Elimina squadra</button></div>
        </form>
      </div>
    </details>`).join('')}</div>`;
  }
  function renderRoster(teamId, container){
    const s=state(), box=UI.$(container);
    if(!box)return;
    if(!teamId){box.innerHTML='<div class="empty">Seleziona una squadra per visualizzare il roster.</div>';return;}
    const t=store.getTeam(s,teamId);
    if(!t){box.innerHTML='<div class="empty">Squadra non trovata.</div>';return;}
    const staff=`<div class="team-profile-meta"><span><strong>Presidente</strong>${UI.esc(t.president?.name||'Non inserito')}</span><span><strong>Allenatore</strong>${UI.esc(t.coach?.name||'Non inserito')}</span><span><strong>Roster</strong>${(t.players||[]).length} calciatori</span></div>`;
    if(!t.players.length){box.innerHTML=staff+'<div class="empty margin-top">Roster giocatori vuoto per questa squadra.</div>';return;}
    // Ordina per numero (vuoti in fondo) per leggibilità
    const players=[...t.players].sort((a,b)=>{
      const an=a.number===''||a.number==null?9999:Number(a.number);
      const bn=b.number===''||b.number==null?9999:Number(b.number);
      if(an!==bn)return an-bn;
      return String(a.name||'').localeCompare(String(b.name||''),'it');
    });
    box.innerHTML=staff+`<div class="team-disclosure-list admin-player-list margin-top">${players.map(p=>{
      const numBadge=p.number!==''&&p.number!=null
        ? `<span class="jersey-number small" title="Numero maglia">${UI.esc(String(p.number))}</span>`
        : `<span class="jersey-number small empty" title="Numero non assegnato">—</span>`;
      return `<details class="ng-disclosure player-disclosure">
      <summary class="ng-disclosure-summary">
        <span class="disclosure-main">${numBadge}<span class="person-avatar">${UI.esc(String(p.name||'?').trim().charAt(0).toUpperCase()||'?')}</span><span><strong>${UI.esc(p.name)}</strong><small>${p.birthYear?`Anno nascita: ${UI.esc(p.birthYear)}`:'Anno nascita non inserito'}</small></span></span>
        <span class="disclosure-action">Modifica</span>
      </summary>
      <div class="ng-disclosure-body">
        <form class="player-edit-form form-grid" data-team-id="${t.id}" data-player-id="${p.id}">
          <div class="jersey-number-field"><label>Numero maglia</label><input name="number" type="number" min="0" max="999" inputmode="numeric" value="${UI.esc(p.number!==''&&p.number!=null?String(p.number):'')}" placeholder="Es. 10"></div>
          <div><label>Cognome e nome</label><input name="name" value="${UI.esc(p.name)}" required></div>
          <div><label>Anno di nascita</label><input name="birthYear" type="number" min="1900" max="2100" value="${UI.esc(p.birthYear||'')}"></div>
          <div class="field-full row-actions"><button class="btn primary" type="submit">Salva modifica</button><button class="btn danger" type="button" data-delete-player="${p.id}" data-team-id="${t.id}">Elimina calciatore</button></div>
        </form>
      </div>
    </details>`;}).join('')}</div>`;
  }
  function filteredMatches(s, teamFilter='', roundFilter=''){return s.matches.filter(m=>(!teamFilter||m.homeTeamId===teamFilter||m.awayTeamId===teamFilter)&&(!roundFilter||m.round===roundFilter));}
  function renderMatchFilters(teamSel, roundSel, matchSel, selectedId='', teamFilter='', roundFilter=''){
    const s=state(); const tEl=UI.$(teamSel), rEl=UI.$(roundSel), mEl=UI.$(matchSel); if(tEl)tEl.innerHTML='<option value="">Tutte le squadre</option>'+s.teams.map(t=>`<option value="${t.id}" ${t.id===teamFilter?'selected':''}>${UI.esc(t.name)}</option>`).join(''); if(rEl){const rounds=store.selectors.rounds(s);rEl.innerHTML='<option value="">Tutte le giornate/turni</option>'+rounds.map(r=>`<option value="${UI.esc(r)}" ${r===roundFilter?'selected':''}>${UI.esc(r)}</option>`).join('');} if(mEl){const list=filteredMatches(s,teamFilter,roundFilter);mEl.innerHTML=list.length?list.map(m=>`<option value="${m.id}" ${m.id===selectedId?'selected':''}>${UI.esc(m.round)} · ${UI.esc(store.teamName(s,m.homeTeamId,m.homeLabel))} vs ${UI.esc(store.teamName(s,m.awayTeamId,m.awayLabel))}</option>`).join(''):'<option value="">Nessuna partita</option>';}
  }
  function openPrint(type){window.open(`print.html?type=${encodeURIComponent(type)}`,'_blank');}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-toggle-form]'); if(b)b.closest('.team-row,.player-row,.event-row')?.querySelector('form')?.toggleAttribute('hidden');});
  window.NexoraAdmin={state,save,commit,flash,adminLabel,initGlobalActions,renderStats,teamOptions,renderTeamsList,renderRoster,filteredMatches,renderMatchFilters,openPrint,downloadRecapPdf,downloadStateBackup,parseBackupPayload,importStateBackup};
  document.addEventListener('DOMContentLoaded',initGlobalActions);
})();
