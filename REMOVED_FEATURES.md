# Removed Features

## Rimosse

- Simulazione torneo lato admin.
- Modalità standalone `league`.
- Modalità standalone `knockout`.
- Fasce KO multiple nella modalità classifica unica.
- Supercoppa automatica.
- Helper `createTextPdf`.
- Test storici V128/V130 e report V12x/V13x non compatibili con le modalità finali.

## Motivo

Il prompt richiede un sistema con sole due modalità:

- Gironi + eliminazione diretta.
- Classifica unica + eliminazione diretta.

Le funzioni laterali sono state rimosse per ridurre stati ambigui, percorsi non verificati e UI obsolete.
