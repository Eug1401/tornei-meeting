# Changelog

## 2026-06-23 · Preferita visibile nelle Squadre v171

### Aggiunto

- Evidenziazione della squadra preferita anche nella sezione Squadre.
- Bordo arancio/blu coerente con la piattaforma e dicitura `★ Preferita · Apri scheda` nell'azione già esistente.
- Suite `TESTS_V171/run_favorite_team_list_v171.js` e verifica Chromium desktop/mobile.

### Verificato

- Selezione iniziale, cambio squadra e rimozione della preferenza.
- Nessuna modifica ai nomi, ai loghi o alla struttura delle schede squadra.
- Nessun overflow a 430 px e ripristino completo dell'azione precedente.

## 2026-06-23 · Squadra preferita e visual partita v170

### Aggiunto

- Selettore persistente della squadra preferita nella Home, con stati vuoto, selezionato, cambio e rimozione.
- Scheda Home dedicata con dati principali, prossime partite, ultimi risultati e collegamento alla scheda squadra.
- Evidenziazione non invasiva della preferita esclusivamente in classifica e nella sezione Partite.
- Suite `TESTS_V170/run_favorite_match_visual_v170.js` e verifica browser responsive.

### Modificato

- Export PNG della singola partita ridisegnato in formato social 1080×1350 con palette arancio/blu, loghi, nomi lunghi adattivi, risultato/orario e metadati.
- Scheda dettaglio partita riallineata allo stesso linguaggio visivo, con layout responsive desktop/mobile.
- Componente condiviso delle squadre reso indipendente dalla preferenza, così la funzione non compare in sezioni non richieste.
- Test v160 aggiornati al nuovo perimetro più restrittivo della squadra preferita.

### Verificato

- Persistenza locale per torneo, nessuna selezione, selezione, cambio e rimozione.
- Assenza di controlli o highlight in Squadre, Ricerca, Tabellone e dettaglio partita.
- Export PNG reale, overflow e leggibilità con nomi squadra lunghi.

## 2026-06-23 · Revisione torneo, PDF, articoli, reset

### Aggiunto

- Editor inline del nome torneo nell'header admin.
- Snapshot JSON v2 con `archiveId`, `snapshotVersion`, metadati, statistiche derivate e checksum.
- Suite `TESTS_V140/run_revision_v140.js`.
- Documentazione `PDF_EXPORTS.md`, `RESET_AND_SNAPSHOT.md`, `REMOVED_FEATURES.md`.

### Modificato

- Modalità supportate ridotte a `league_knockout` e `groups_knockout`.
- Default nuovo torneo impostato su `league_knockout`.
- Classifica unica + eliminazione diretta semplificata a una sola fase finale configurabile.
- Reset reso più esplicito: snapshot JSON e PDF finale sono obbligatori prima dell'azzeramento.
- Gestione articoli rinforzata con validazioni testo/file e guardia anti doppio submit.
- Layout header admin aggiornato dopo la rimozione del comando di simulazione.

### Rimosso

- Comando e logica di simulazione torneo.
- Modalità standalone `league` e `knockout` dalla UI e dalla generazione.
- UI per fasce KO aggiuntive e Supercoppa.
- Helper PDF testuale inutilizzato `createTextPdf`.
- Test/report storici riferiti a modalità rimosse.
