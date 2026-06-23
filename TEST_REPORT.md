# Test Report

Data verifica: 2026-06-23.

## Ambiente

- App statica HTML/CSS/JavaScript.
- Backend applicativo assente; Supabase solo lato client.
- Verifiche locali con runtime Node/Codex.

## Suite

| Suite | Scopo | Esito |
| --- | --- | --- |
| `TESTS_V132/run_tournament_mode_v132.js` | Regressione sulla modalità Classifica unica + eliminazione diretta e BYE | Pass: 14, Fail: 0 |
| `TESTS_V140/run_revision_v140.js` | Due modalità ammesse, rimozione simulazione, reset snapshot, UI regole | Pass: 18, Fail: 0 |
| `TESTS_V150/run_kings_share_calendar_v150.js` | Regressione calendario, export e rimozione vecchie modalità | Pass: 13, Fail: 0 |
| `TESTS_V160/run_prompt4_calendar_bracket_favorite_v160.js` | Calendario, tabellone e perimetro aggiornato della preferita | Pass: 31, Fail: 0 |
| `TESTS_V170/run_favorite_match_visual_v170.js` | Squadra preferita, export social e dettaglio partita responsive | Pass: 22, Fail: 0 |
| `TESTS_V171/run_favorite_team_list_v171.js` | Indicatore preferita nella sezione Squadre, cambio/rimozione e responsive | Pass: 11, Fail: 0 |
| `TESTS_V172/run_match_detail_export_v172.js` | Contenimento risultato, stemmi trasparenti ed export partita adattivo | Pass: 10, Fail: 0 |

## Controlli Manuali

- UI regole: il selettore espone solo `league_knockout` e `groups_knockout`.
- Header admin: il pulsante `Simula` non è più presente.
- Sync Supabase: rimossa la ripubblicazione speciale basata su `_simulationUpdatedAt`.
- Reset: snapshot JSON e PDF finale sono obbligatori nel dialog.
- Browser Chromium: selezione/cambio/rimozione preferita, indicatore nella sezione Squadre, responsive 430 px e desktop 1440 px.
- Export partita: PNG reale 1080×1350, circa 1,2 MB, senza errori o overflow con nomi lunghi.

- Export partita v172: rendering Canvas verificato con risultato a due cifre (`2–12`), senza tagli o compressione anomala.

## Limiti

Non sono state eseguite modifiche backend perché non esiste un backend server nel progetto.
