# Tornei Meeting · Meeting Tournament

Applicazione web statica per gestire un torneo con squadre, giocatori, calendario, referti, articoli, classifiche, tabellone finale, schede squadra e PDF.

## Avvio

Non ci sono dipendenze npm da installare. Avvio locale consigliato:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Pagine principali:

- `index.html`: sito pubblico.
- `admin.html`: dashboard amministrativa.
- `admin-rules.html`: nome torneo, regole e calendario.
- `admin-reports.html`: report e PDF.
- `admin-articles.html`: gestione articoli.

## Backend

Non è presente un backend applicativo separato. Le sezioni del prompt relative a controller, endpoint server, ORM o validazioni backend custom non sono state eseguite perché il progetto usa solo HTML/CSS/JavaScript statici e Supabase client.

La persistenza online, se configurata, passa da:

- `assets/js/supabase-config.js`
- `assets/js/supabase-sync.js`
- `SUPABASE_SETUP.sql`

## Modalità Torneo Supportate

Sono supportate solo due modalità:

- `league_knockout`: Classifica unica + eliminazione diretta.
- `groups_knockout`: Gironi + eliminazione diretta.

Le modalità standalone rimosse non sono esposte nella UI e vengono respinte dalla validazione di generazione.

## Funzioni Chiave

- Modifica inline del nome torneo dall'header admin, con salvataggio su `rules.name` e `site.title`.
- Generazione calendario con fasi qualificanti e tabellone finale.
- Tabellone con BYE deterministici quando le qualificate non sono 2, 4, 8, 16 o 32.
- Articoli pubblici con create/edit/delete, immagine principale compressa e validazioni su testo/file.
- Schede squadra pubbliche con statistiche per fase.
- Squadra preferita persistente, con riepilogo in Home, evidenziazione in classifica e Partite e indicatore nella sezione Squadre.
- Export social della singola partita e dettaglio partita responsive con palette ufficiale, risultato centrato sul separatore e auto-fit anti-overflow.
- Reset con snapshot JSON versionato e PDF finale prima dell'azzeramento.
- Sincronizzazione Supabase lato client, se configurata.

## Documentazione

- `PDF_EXPORTS.md`: inventario e regole dei PDF.
- `RESET_AND_SNAPSHOT.md`: flusso reset, snapshot e ripristino.
- `REMOVED_FEATURES.md`: funzionalità rimosse.
- `TEST_REPORT.md`: verifiche eseguite.
- `MODIFIED_FILES.md`: riepilogo file modificati.

## Test

Suite locali:

```bash
node TESTS_V132/run_tournament_mode_v132.js
node TESTS_V140/run_revision_v140.js
node TESTS_V150/run_kings_share_calendar_v150.js
node TESTS_V160/run_prompt4_calendar_bracket_favorite_v160.js
node TESTS_V170/run_favorite_match_visual_v170.js
node TESTS_V171/run_favorite_team_list_v171.js
node TESTS_V172/run_match_detail_export_v172.js
node TESTS_V173/run_centered_score_fit_v173.js
```

`TESTS_V128` e `TESTS_V130` sono stati rimossi perché coprivano modalità e combinazioni non più supportate.
