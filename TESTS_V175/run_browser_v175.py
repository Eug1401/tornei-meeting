from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json, os

ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT)
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
server=ThreadingHTTPServer(('127.0.0.1',0),QuietHandler)
Thread(target=server.serve_forever,daemon=True).start()
port=server.server_address[1]

BASE='''<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="http://127.0.0.1:%PORT%/assets/css/styles.css?v=v175-browser"></head><body class="public-page modal-open"><div class="modal public-match-modal open"><div class="modal-content public-match-modal-content"><div class="section-title match-modal-toolbar"><div class="match-modal-heading"><h2>Associazione Sportiva Casa Molto Lunga vs Polisportiva Ospite dal Nome Lunghissimo</h2></div><button class="btn danger match-modal-close">Chiudi</button></div><div id="matchModalBody"><article class="public-match-detail-card"><section class="public-match-hero match-visual-language"><div class="public-match-brandline"><span>Meeting Tournament</span><strong>Competizione internazionale con denominazione molto lunga</strong></div><div class="public-match-hero-top"><span class="pill">Fase a gironi · Girone lunghissimo · Giornata 12</span><span class="score-badge match-status-badge is-played">Giocata</span></div><div class="public-scoreboard"><div class="public-score-team public-score-home"><div class="team-logo-fallback"></div><span class="public-team-role">Casa</span><strong>Associazione Sportiva Casa Molto Lunga</strong></div><div class="public-score-center is-played is-score-wide"><small>Risultato</small><div class="public-score-value"><span class="public-score-number is-home">%HOME%</span><em>–</em><span class="public-score-number is-away">%AWAY%</span></div></div><div class="public-score-team public-score-away"><div class="team-logo-fallback"></div><span class="public-team-role">Ospite</span><strong>Polisportiva Ospite dal Nome Lunghissimo</strong></div></div><div class="public-match-kickoff"><small>Data e ora</small><strong>23 giugno 2026, 21:30</strong></div><div class="public-match-meta-grid"><span><small>Campo</small><strong>Centro Sportivo Comunale con denominazione estesa</strong></span><span><small>Arbitro</small><strong>Nome Cognome Molto Lungo</strong></span><span><small>Competizione</small><strong>Coppa del Mondo Meeting Tournament</strong></span></div></section><section class="public-match-panels">%PANELS%</section><div class="public-match-actions"><button class="btn primary">Condividi immagine</button></div></article></div></div></div></body></html>'''
PANELS=''.join('<div class="public-match-panel"><div class="panel-title"><span>⚽</span><h3>Marcatori della squadra con nome molto lungo</h3></div>'+''.join(f'<div class="public-match-event-item"><span class="event-dot">⚽</span><div><strong>Giocatore con nome e cognome particolarmente lunghi numero {j}</strong><small>Informazione secondaria molto lunga</small></div></div>' for j in range(1,5))+'</div>' for _ in range(4))
viewports=[(320,640),(375,700),(430,760),(768,800),(1280,900)]
scores=[('10','1'),('12','10'),('20','15')]
entries=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width,height in viewports:
        for home_score,away_score in scores:
            page=browser.new_page(viewport={'width':width,'height':height})
            html=BASE.replace('%PORT%',str(port)).replace('%HOME%',home_score).replace('%AWAY%',away_score).replace('%PANELS%',PANELS)
            page.set_content(html,wait_until='networkidle')
            page.wait_for_timeout(80)
            result=page.evaluate('''() => {
              const q=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
              const r=el=>{const x=el.getBoundingClientRect();return {x:x.x,y:x.y,w:x.width,h:x.height,right:x.right,bottom:x.bottom,cx:x.x+x.width/2}};
              const board=r(q('.public-scoreboard')), home=r(q('.public-score-home')), center=r(q('.public-score-center')), away=r(q('.public-score-away'));
              const value=q('.public-score-value'), nums=all('.public-score-number'), modalBody=q('#matchModalBody'), close=r(q('.match-modal-close'));
              const overflowNodes=all('#matchModalBody *').filter(el=>el.scrollWidth>el.clientWidth+1);
              const logos=all('.public-score-team .team-logo,.public-score-team .team-logo-fallback').map(r);
              return {
                documentWidth:document.documentElement.scrollWidth,
                board,home,center,away,
                sameRow:Math.abs(home.y-center.y)<1&&Math.abs(away.y-center.y)<1,
                centerOffset:Math.abs(center.cx-board.cx),
                scoreFits:value.scrollWidth<=value.clientWidth+1&&nums.every(n=>n.scrollWidth<=n.clientWidth+1),
                scoreNoWrap:getComputedStyle(value).whiteSpace==='nowrap',
                horizontalOverflow:overflowNodes.length,
                bodyScrollable:modalBody.scrollHeight>modalBody.clientHeight&&getComputedStyle(modalBody).overflowY==='auto',
                closeVisible:close.y>=-1&&close.bottom<=innerHeight+1,
                logosUniform:logos.length===2&&Math.abs(logos[0].w-logos[1].w)<.5&&Math.abs(logos[0].h-logos[1].h)<.5,
                fontSize:getComputedStyle(value).fontSize
              };
            }''')
            result.update({'viewport':f'{width}x{height}','score':f'{home_score} - {away_score}'})
            result['ok']=(result['documentWidth']<=width and result['sameRow'] and result['centerOffset']<=1 and result['scoreFits'] and result['scoreNoWrap'] and result['horizontalOverflow']==0 and result['bodyScrollable'] and result['closeVisible'] and result['logosUniform'])
            entries.append(result)
            page.close()
    browser.close()
server.shutdown()
report={'version':'v175','environment':'Chromium headless con CSS reale','viewports':[f'{w}x{h}' for w,h in viewports],'scores':['10 - 1','12 - 10','20 - 15'],'passed':sum(1 for e in entries if e['ok']),'total':len(entries),'ok':all(e['ok'] for e in entries),'cases':entries}
(ROOT/'TESTS_V175'/'browser_report_v175.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'passed':report['passed'],'total':report['total'],'ok':report['ok']},indent=2))
