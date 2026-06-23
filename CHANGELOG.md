# Changelog

## 2026-06-23 · Dettaglio partita responsive v175

### Modificato

- La scoreboard della modale usa sempre tre colonne simmetriche: squadra di casa, risultato e squadra ospite.
- Il risultato resta su una sola riga e supporta punteggi a due cifre come `10 - 1`, `12 - 10` e `20 - 15`.
- Sotto i 520 px stemmi e risultato non vengono più impilati, ma rimangono sulla stessa riga con dimensioni responsive.
- Il corpo della modale è l’unica area scorrevole; toolbar e pulsante `Chiudi` restano sempre accessibili.
- Card informative, pannelli marcatori e testi lunghi usano griglie auto-fit e wrapping senza troncamenti.
- Aggiunta protezione contro lo scroll orizzontale della pagina.

### Non modificato

- La logica e il formato dell’export immagine sono rimasti invariati.

### Verificato

- Chromium reale a 320, 375, 430, 768 e 1280 px.
- Tre punteggi per ogni viewport: `10 - 1`, `12 - 10`, `20 - 15`.
- Suite statica: 15/15 controlli superati.
- Suite browser: 15/15 combinazioni superate senza overflow o disallineamenti.

## 2026-06-23 · Risultato centrato e auto-fit v173

### Modificato

- Il risultato del dettaglio partita usa ora due celle simmetriche: punteggio casa allineato verso il centro, separatore bloccato esattamente al centro e punteggio ospite allineato verso il centro.
- Aggiunto un auto-fit runtime basato sulle dimensioni reali del riquadro, con ricalcolo su resize, cambio orientamento e aggiornamenti live.
- L'export social applica lo stesso criterio di centratura sul separatore e riduce automaticamente la dimensione dei punteggi lunghi.

### Verificato

- `10–1`, `100–2` e un caso estremo `123456–2`: separatore con scostamento 0 px dal centro e nessun overflow.
- Suite `TESTS_V173/run_centered_score_fit_v173.js`: 12/12 controlli superati.


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

## v172 - Risultato dettaglio ed export partita
- Corretto il blocco risultato nella scheda partita: cifre sempre contenute, anche con punteggi a più cifre.
- Rimossi sfondo, bordo e padding artificiali dagli stemmi nel dettaglio partita; i file trasparenti ora vengono mostrati senza riquadro.
- Aggiornato l'export social con stemmi senza fondale aggiunto e risultato disegnato in celle separate, ridimensionato automaticamente.
- Allineato il linguaggio visivo dell'export alla scheda dettaglio su desktop e mobile.
