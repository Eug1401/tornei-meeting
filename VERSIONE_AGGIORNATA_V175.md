# Versione aggiornata v175

Questa versione corregge la UI della modale **Dettaglio partita** su desktop e mobile.

## Risultato

- Scoreboard a tre colonne simmetriche.
- Risultato sempre centrato geometricamente tra i due stemmi.
- Supporto verificato per `10 - 1`, `12 - 10` e `20 - 15`.
- Nessun ritorno a capo, taglio o overflow del punteggio.

## Mobile

- Stemma casa, risultato e stemma ospite restano sulla stessa riga anche a 320 px.
- Stemmi, padding, font e spazi usano `clamp()` e griglie responsive.
- Nomi squadra e testi lunghi vanno a capo senza essere troncati.
- La modale occupa l’altezza disponibile e scorre solo nel contenuto, lasciando `Chiudi` accessibile.
- Nessuno scroll orizzontale indesiderato.

## Informazioni secondarie

- Campo, arbitro e competizione usano una griglia `auto-fit` a una o due colonne sui dispositivi stretti.
- Pannelli marcatori e cartellini diventano a colonna singola su mobile.

## Export immagine

La logica JavaScript e il formato 1080×1350 dell’export non sono stati modificati.

## Test

- `TESTS_V175/run_match_detail_responsive_v175.js`: 15/15 PASS.
- `TESTS_V175/run_browser_v175.py`: 15/15 PASS.
