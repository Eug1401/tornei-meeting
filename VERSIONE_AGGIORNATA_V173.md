# Versione aggiornata v173

## Correzione risultato dettaglio partita

- Punteggio casa allineato a destra della metà centrale.
- Separatore fissato esattamente al centro del riquadro.
- Punteggio ospite allineato a sinistra della metà centrale.
- Ridimensionamento automatico basato sullo spazio realmente disponibile.
- Ricalcolo su apertura modale, resize, cambio orientamento e aggiornamenti live.
- Protezione finale contro qualsiasi fuoriuscita dal riquadro.

## Export

Il punteggio dell'immagine social usa lo stesso schema: casa verso il centro, separatore centrale, ospite verso il centro e font adattivo.

## Verifiche

- Suite v132: 14/14
- Suite v140: 18/18
- Suite v150: 13/13
- Suite v160: 31/31
- Suite v170: 22/22
- Suite v171: 11/11
- Suite v172: 10/10
- Suite v173: 12/12
- Chromium: nessun overflow per `10–1`, `100–2`, `123456–2`; separatore sempre centrato.
