# Architettura

Il progetto è una web app statica.

## Moduli

- `assets/js/store.js`: stato, normalizzazione, validazioni, calendario, classifiche, tabellone e snapshot derivati.
- `assets/js/ui.js`: rendering condiviso e componenti HTML.
- `assets/js/admin-common.js`: azioni globali admin, editor nome torneo, reset, snapshot e recap PDF.
- `assets/js/admin-rules.js`: regole torneo e generazione calendario.
- `assets/js/admin-reports.js`: PDF e report admin.
- `assets/js/admin-articles.js`: gestione articoli.
- `assets/js/public.js`: sito pubblico, schede squadra, articoli, ricerca, tabellone e notifiche live.
- `assets/js/supabase-sync.js`: salvataggio e sincronizzazione client-side.

## Backend

Non esiste un backend server custom. Supabase viene usato come storage JSON e realtime tramite client browser. Per questo motivo non sono stati modificati endpoint, DTO, controller o middleware server.

## Stato

Lo stato principale e' un JSON con:

- `rules`
- `site`
- `teams`
- `matches`
- `articles`
- `calendarSignature`

## Modalità

Valori persistenti ammessi:

- `league_knockout`
- `groups_knockout`

I vecchi valori standalone vengono respinti dalla validazione quando richiesti per una nuova generazione calendario.
