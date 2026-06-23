# File Modificati

| File | Modifica |
| --- | --- |
| `assets/js/store.js` | Whitelist di due modalità, default `league_knockout`, rifiuto dei vecchi formati, rimozione generazione standalone e fasi extra. |
| `assets/js/admin-rules.js` | UI regole allineata a due modalità e a una sola fase finale per classifica unica. |
| `admin-rules.html` | Selettore formato ridotto e rimosse fasce KO/Supercoppa. |
| `admin*.html` | Rimosso pulsante globale `Simula`. |
| `assets/js/admin-common.js` | Rimosso blocco simulazione, aggiunto editor inline nome torneo, snapshot v2 e reset obbligatorio con PDF. |
| `assets/js/supabase-sync.js` | Rimossa logica speciale di sincronizzazione simulazione. |
| `assets/js/admin-articles.js` | Validazioni articoli, limite immagine, guardia doppio submit e conferma eliminazione più chiara. |
| `assets/js/ui.js` | Rimosso helper PDF testuale inutilizzato. |
| `assets/css/styles.css` | Stili per editor nome torneo e header admin senza simulazione. |
| `TESTS_V140/run_revision_v140.js` | Nuovi test di revisione. |
| `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `TEST_REPORT.md` | Documentazione aggiornata. |
| `PDF_EXPORTS.md`, `RESET_AND_SNAPSHOT.md`, `REMOVED_FEATURES.md` | Nuovi documenti richiesti dal prompt. |

## File Rimossi

- `TESTS_V128/*`
- `TESTS_V130/*`
- `TEST_REPORT_V125.txt` ... `TEST_REPORT_V131_ADMIN_REPORTS_RESET.txt`
- `VERSIONE_AGGIORNATA_V129.md`
- `VERSIONE_AGGIORNATA_V130.md`
- `PATCH_V121_OWN_GOALS_BRACKET.txt`
- `PATCH_V123_UI_REFRESH.txt`
- `REPORT_PART_1_TOURNAMENT.md`
- `REPORT_PART_2_UI_UX.md`
- `REPORT_PART_3_LIVE_DATA.md`


## Aggiornamento v170 · Squadra preferita e partita

| File | Modifica |
| --- | --- |
| `assets/js/public.js` | Preferenza persistente e circoscritta, dashboard Home, highlight classifica/Partite, nuovo export social e nuovo dettaglio partita. |
| `assets/js/ui.js` | Rimosso il controllo preferita dal componente condiviso delle squadre. |
| `assets/css/styles.css` | Stili responsive per dashboard preferita, highlight non invasivi e visual partita arancio/blu. |
| `index.html` | Cache busting asset v170. |
| `TESTS_V160/run_prompt4_calendar_bracket_favorite_v160.js` | Aspettative aggiornate al nuovo perimetro della preferita. |
| `TESTS_V170/*` | Suite e report dedicati alla nuova funzionalità. |


## Aggiornamento v171 · Preferita nella sezione Squadre

| File | Modifica |
| --- | --- |
| `assets/js/public.js` | Decorazione dinamica della scheda preferita, ripristino al cambio/rimozione e etichetta accessibile. |
| `assets/css/styles.css` | Bordo e azione preferita responsive, circoscritti a `#publicTeams`. |
| `index.html` | Cache busting asset v171. |
| `TESTS_V170/run_favorite_match_visual_v170.js` | Cache busting compatibile con la versione corrente. |
| `TESTS_V171/*` | Suite e report browser dedicati alla nuova indicazione. |


## Aggiornamento v172 · Risultato e stemmi partita

| File | Modifica |
| --- | --- |
| `assets/js/public.js` | Risultato adattivo nel dettaglio, nuovo disegno del punteggio export e stemmi esportati senza riquadro artificiale. |
| `assets/css/styles.css` | Griglia anti-overflow per punteggi a una, due o più cifre e stemmi trasparenti nel dettaglio. |
| `index.html` | Cache busting asset v172. |
| `TESTS_V170/*`, `TESTS_V171/*` | Compatibilità delle suite precedenti con la nuova versione asset. |
| `TESTS_V172/*` | Suite dedicata al dettaglio e all'export partita. |
| `CHANGELOG.md`, `TEST_REPORT.md`, `README.md` | Documentazione aggiornata. |


## Aggiornamento v173 · Risultato centrato e anti-overflow

| File | Modifica |
| --- | --- |
| `assets/js/public.js` | Auto-fit del punteggio su misure reali, ricalcolo con `ResizeObserver`, riallineamento casa/separatore/ospite e export centrato. |
| `assets/css/styles.css` | Celle simmetriche, allineamento interno dei punteggi, dimensioni responsive e fallback anti-overflow. |
| `index.html` | Cache busting asset v173. |
| `TESTS_V170/*`, `TESTS_V171/*`, `TESTS_V172/*` | Compatibilità cache ed export con la versione corrente. |
| `TESTS_V173/*` | Suite statica e report Chromium dedicati alla centratura e all'auto-fit. |
| `CHANGELOG.md`, `TEST_REPORT.md`, `README.md` | Documentazione aggiornata. |


## Aggiornamento v175 · Dettaglio partita responsive

| File | Modifica |
| --- | --- |
| `assets/css/styles.css` | Override finale responsive per scoreboard a tre colonne, punteggi multi-cifra, scroll interno della modale, card informative e testi lunghi. |
| `index.html` | Cache busting asset `v175-match-detail-responsive`. |
| `TESTS_V175/*` | Suite statica, test Chromium multi-viewport e relativi report. |
| `CHANGELOG.md`, `TEST_REPORT.md`, `VERSIONE_AGGIORNATA_V175.md` | Documentazione della correzione e delle verifiche. |

La logica JavaScript di `assets/js/public.js`, inclusa l’esportazione immagine, non è stata modificata.
