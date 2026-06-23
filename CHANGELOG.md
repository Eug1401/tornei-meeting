# Changelog

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
