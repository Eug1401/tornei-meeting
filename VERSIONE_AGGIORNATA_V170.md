# Versione aggiornata v170

## Squadra preferita

La selezione è disponibile soltanto nella Home. La preferenza viene salvata in `localStorage` con una chiave distinta per torneo. La squadra scelta alimenta la scheda riepilogativa Home e viene evidenziata, senza modificare il markup dei nomi, esclusivamente nella classifica e nella lista Partite.

Non sono presenti controlli, badge o comportamenti dedicati in Squadre, Ricerca, Tabellone o dettaglio partita.

## Visual partita

L’export della singola partita usa un canvas 1080×1350 con palette ufficiale arancio, blu e blu notte. I nomi vengono adattati su più righe e ridimensionati per evitare tagli. Sono inclusi loghi, stato, risultato/orario, data, competizione, campo e arbitro.

La scheda dettaglio utilizza lo stesso linguaggio visivo ed è stata verificata a 1440 px e 430 px.

## Verifiche

```bash
node TESTS_V132/run_tournament_mode_v132.js
node TESTS_V140/run_revision_v140.js
node TESTS_V150/run_kings_share_calendar_v150.js
node TESTS_V160/run_prompt4_calendar_bracket_favorite_v160.js
node TESTS_V170/run_favorite_match_visual_v170.js
```

Esito delle suite sopra: tutte superate.
