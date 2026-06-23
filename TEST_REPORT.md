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

## Controlli Manuali

- UI regole: il selettore espone solo `league_knockout` e `groups_knockout`.
- Header admin: il pulsante `Simula` non è più presente.
- Sync Supabase: rimossa la ripubblicazione speciale basata su `_simulationUpdatedAt`.
- Reset: snapshot JSON e PDF finale sono obbligatori nel dialog.

## Limiti

Non sono state eseguite modifiche backend perché non esiste un backend server nel progetto.
