# Versione V129 — Nome torneo libero, marcatori multipli e mobile admin stabile

## Modifiche principali

- Il nome torneo può essere salvato in qualsiasi momento dalla pagina Regole, anche se il calendario non è ancora generabile o le squadre non sono complete.
- Il titolo mostrato in alto segue il nome torneo quando il titolo grafico personalizzato è quello predefinito.
- Nella scelta marcatori è stato aggiunto il selettore `Numero gol` da 1 a 5.
- L'inserimento marcatori multipli crea più eventi gol distinti, preservando la logica esistente di classifica e referti.
- Gli autogol restano sempre peso 1 e continuano a non entrare nella classifica marcatori.
- Su mobile le schermate operative Admin/Giocatori e Admin/Partite non si chiudono più toccando per errore lo sfondo.
- Su mobile le schermate operative sono full-screen, con toolbar sticky, controlli più grandi e scroll più stabile quando si apre la tastiera.
- Cache busting aggiornato a `v129-mobile-goals`.

## Test

Report incluso: `TEST_REPORT_V129_MOBILE_GOALS.txt`.

Risultato: 6523 controlli/assert superati, 0 falliti.
