# Rimozione Kings League

La modalità Kings League è stata rimossa dal progetto.

## Cosa e stato rimosso

- Toggle admin `Modalita Kings League`.
- Flag persistito `rules.isKingsLeague`.
- Gol con peso 2 e UI `Peso gol`.
- Presidenti selezionabili come marcatori.
- Classifiche e PDF dei presidenti marcatori.
- API/store legacy: `getParticipant`, `getPresident`, `isPresidentId`, selector president scorer.

## Compatibilita dati

Gli stati legacy vengono normalizzati in lettura:

- il vecchio flag viene scartato;
- i gol sono validi solo se assegnati a calciatori in campo o ad autogol validi;
- i campi di staff `president` e `coach` restano dati anagrafici della squadra, senza impatto sul referto.

## Modalita rimaste

- `league_knockout`: Classifica unica + eliminazione diretta.
- `groups_knockout`: Gironi + eliminazione diretta.

