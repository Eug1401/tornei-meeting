# Audit progetto

## Verifiche completate

- Confermata l'assenza della galleria squadre nei menu pubblico e admin.
- Rimossi pagina nascosta, script, worker, stili, documentazione e funzione server della vecchia galleria.
- Nessun riferimento residuo al vecchio servizio immagini.
- URL e publishable key del nuovo progetto coerenti in tutte le pagine.
- Nessun riferimento a vecchi host Supabase o chiavi precedenti.
- Nessun collegamento locale HTML mancante.
- Nessun ID HTML duplicato.
- Sintassi JavaScript valida.
- CSS bilanciato e analizzato senza errori.
- Test logici V130: 6.871 casi superati.
- Test modalità torneo V132: 14 casi superati.
- Matrice varianti calendario: 16.395 casi superati.
- Corretto l'avvio di Realtime/polling dopo il recupero di modifiche admin locali pendenti.
- Verificata UI admin regole per "Classifica unica + eliminazione diretta" su desktop e viewport mobile 390px.

## Punto da decidere

`admin-customize.html` è una pagina funzionante per logo, nome e colori, ma compare nel menu soltanto quando si apre direttamente quella pagina. Non è stata modificata perché può essere una scelta intenzionale; per renderla normalmente accessibile va aggiunta la voce `Personalizza` agli altri menu admin.

## Controlli esterni ancora necessari

- Verificare nel dashboard Supabase che `app_state/main` esista.
- Verificare RLS e publication Realtime.
- Disabilitare signup pubblico oppure limitare le policy di scrittura all'UUID admin.
- Provare login e un salvataggio dal sito pubblicato: l'ambiente di audit locale non può autenticarsi al progetto remoto.
