# Versione aggiornata v171

## Preferita nella sezione Squadre

Dopo la selezione dalla Home, la squadra preferita è ora immediatamente riconoscibile anche nella sezione **Squadre**. La relativa scheda mantiene nome, logo, staff e struttura originali, ma riceve un bordo arancio/blu e l'azione esistente diventa `★ Preferita · Apri scheda`.

La sezione Squadre non introduce un secondo selettore: scelta, cambio e rimozione continuano a essere gestiti dalla Home. Al cambio della preferenza, la vecchia scheda viene ripristinata e il marcatore passa alla nuova squadra; alla rimozione sparisce completamente.

## Accessibilità e responsive

Il riepilogo della squadra riceve un'etichetta accessibile che comunica lo stato di preferita. Il layout è stato verificato a 1440×1000 e 430×900 senza overflow e senza alterare l'allineamento dei nomi.

## Verifiche

```bash
node TESTS_V160/run_prompt4_calendar_bracket_favorite_v160.js
node TESTS_V170/run_favorite_match_visual_v170.js
node TESTS_V171/run_favorite_team_list_v171.js
```

Tutte le suite indicate sono superate.
