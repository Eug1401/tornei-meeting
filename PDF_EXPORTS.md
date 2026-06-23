# PDF Exports

## PDF Disponibili

- Classifica generale.
- Marcatori.
- Gironi.
- Calendario.
- Tabellone fase finale.
- Recap finale generato dal reset.
- PDF scheda squadra dal sito pubblico.

## Regole

- I PDF usano nome torneo, logo, colori e dati correnti dello stato normalizzato.
- Il tabellone supporta 2, 4, 8, 16 e 32 partecipanti e usa BYE deterministici per numeri intermedi.
- Se una fase non è completa, i PDF mantengono placeholder leggibili come `1ª classificata`, `1ª Girone A` o `Vincente ...`.
- I nomi lunghi vengono mandati a capo o abbreviati tramite layout tabellare.

## Note

La generazione PDF avviene nel browser con `jsPDF` e `jspdf-autotable`. Non esiste un servizio PDF backend.
