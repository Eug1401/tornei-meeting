# Progetto configurato per il nuovo Supabase

## Configurazione applicata

- Project ref: `fvcuganqopmshdpysoxi`
- Project URL usato dal client: `https://fvcuganqopmshdpysoxi.supabase.co`
- REST API risultante: `https://fvcuganqopmshdpysoxi.supabase.co/rest/v1/`
- Publishable key configurata in `assets/js/supabase-config.js`
- Tabella prevista: `public.app_state`, riga `id = 'main'`

Il client Supabase deve ricevere il Project URL base, senza `/rest/v1/`: la libreria costruisce automaticamente gli endpoint REST, Auth e Realtime.

## Immagini supportate

Restano supportate:

- le immagini principali degli articoli;
- i loghi delle squadre;
- il logo e la personalizzazione grafica del torneo.

Queste immagini sono gestite direttamente dallo stato applicativo.

## Cosa non serve aggiungere

Non inserire nel frontend una secret key o una service-role key. La publishable key è pubblica e sufficiente per inizializzare il client; i salvataggi amministrativi sono autorizzati dalla sessione dell'utente Supabase Auth e dalle policy RLS di `SUPABASE_SETUP.sql`.

## Controlli finali nel dashboard Supabase

1. La tabella `public.app_state` deve contenere la riga `id = main`.
2. RLS deve essere attiva e le policy di `SUPABASE_SETUP.sql` devono risultare presenti.
3. `app_state` deve essere inclusa nella publication `supabase_realtime`.
4. L'utente admin deve poter accedere con email e password.
5. Se usi le policy incluse, disabilita le registrazioni pubbliche: qualunque utente autenticato è considerato admin.

## Verifiche locali eseguite

- Codice e file della vecchia galleria squadre rimossi.
- Sintassi JavaScript valida.
- Riferimenti locali HTML validi.
- Suite logiche e matrice varianti superate.
- Avvio Realtime admin corretto anche dopo il recupero di modifiche locali pendenti.
