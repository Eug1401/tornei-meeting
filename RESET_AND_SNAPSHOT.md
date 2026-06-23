# Reset And Snapshot

## Flusso Reset

1. L'admin apre `Reset`.
2. Il dialog richiede conferma esplicita.
3. Prima dell'azzeramento vengono avviati due download obbligatori:
   - snapshot JSON v2;
   - PDF recap finale.
4. Solo dopo la generazione dei file il browser azzera localStorage e salva lo stato vuoto.

## Snapshot JSON v2

Il payload contiene:

- `type: tournament-state-snapshot`
- `snapshotVersion: 2`
- `archiveId`
- `checksum`
- `meta`
- `configuration`
- `statistics`
- `standings`
- `groups`
- `scorers`
- `phases`
- `state`

## Limite Browser

Il browser può avviare il download ma non può verificare in modo affidabile che il file sia stato effettivamente scritto sul disco dell'utente. Per questo il flusso garantisce la generazione e l'avvio del download prima del reset.

## Ripristino

La dashboard admin accetta snapshot e backup legacy JSON tramite l'area di ripristino. Il contenuto viene normalizzato prima del salvataggio.
