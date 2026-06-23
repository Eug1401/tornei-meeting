# File Modificati

| File | Modifica |
| --- | --- |
| `assets/js/store.js` | Whitelist di due modalità, default `league_knockout`, rifiuto dei vecchi formati, rimozione generazione standalone e fasi extra. |
| `assets/js/admin-rules.js` | UI regole allineata a due modalità e a una sola fase finale per classifica unica. |
| `admin-rules.html` | Selettore formato ridotto e rimosse fasce KO/Supercoppa. |
| `admin*.html` | Rimosso pulsante globale `Simula`. |
| `assets/js/admin-common.js` | Rimosso blocco simulazione, aggiunto editor inline nome torneo, snapshot v2 e reset obbligatorio con PDF. |
| `assets/js/supabase-sync.js` | Rimossa logica speciale di sincronizzazione simulazione. |
| `assets/js/admin-articles.js` | Validazioni articoli, limite immagine, guardia doppio submit e conferma eliminazione più chiara. |
| `assets/js/ui.js` | Rimosso helper PDF testuale inutilizzato. |
| `assets/css/styles.css` | Stili per editor nome torneo e header admin senza simulazione. |
| `TESTS_V140/run_revision_v140.js` | Nuovi test di revisione. |
| `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `TEST_REPORT.md` | Documentazione aggiornata. |
| `PDF_EXPORTS.md`, `RESET_AND_SNAPSHOT.md`, `REMOVED_FEATURES.md` | Nuovi documenti richiesti dal prompt. |

## File Rimossi

- `TESTS_V128/*`
- `TESTS_V130/*`
- `TEST_REPORT_V125.txt` ... `TEST_REPORT_V131_ADMIN_REPORTS_RESET.txt`
- `VERSIONE_AGGIORNATA_V129.md`
- `VERSIONE_AGGIORNATA_V130.md`
- `PATCH_V121_OWN_GOALS_BRACKET.txt`
- `PATCH_V123_UI_REFRESH.txt`
- `REPORT_PART_1_TOURNAMENT.md`
- `REPORT_PART_2_UI_UX.md`
- `REPORT_PART_3_LIVE_DATA.md`
