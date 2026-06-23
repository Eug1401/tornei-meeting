# Tornei Meeting · Coppa del Mondo

Applicazione web statica per gestire torneo, squadre, giocatori, calendario, referti, articoli, classifiche e report PDF.

## Avvio

- `index.html`: area pubblica in sola lettura.
- `admin.html`: dashboard amministrativa con login Supabase.
- `assets/js/supabase-config.js`: configurazione del progetto Supabase.
- `SUPABASE_SETUP.sql`: tabella `app_state`, RLS, riga iniziale e Realtime.

Il progetto è già configurato per `fvcuganqopmshdpysoxi` con la publishable key fornita.

## Immagini

Sono supportati i loghi delle squadre, il logo del torneo e le immagini degli articoli. Non è presente una galleria separata delle squadre e non sono richieste Edge Functions o credenziali per servizi immagini esterni.

## Sicurezza admin

Le policy incluse consentono la scrittura a ogni utente Supabase con ruolo `authenticated`. Per usare un solo amministratore, disabilita le registrazioni pubbliche oppure restringi le policy a uno specifico `auth.uid()`.

Vedi `NUOVO_SUPABASE.md` e `SUPABASE_GUIDA.txt` per il controllo finale.
