# v104 — Sistema Foto riscritto da zero

## Architettura nuova (semplice e robusta)

Ogni foto su Supabase Storage = **2 asset distinti** con ruoli chiari:

| Asset | Cos'è | Peso tipico | Quando si usa |
|---|---|---|---|
| **preview** | JPEG 1600px @ 85% | 200-400KB | Visualizzazione (griglia + lightbox) |
| **original** | File intatto se ≤9.5MB, altrimenti 4000px @ 95% | 1-9.5MB | Download (singolo + ZIP) |

## Convenzione path su Supabase

```
<teamId>/<timestamp>_<random>_<nome>.preview.jpg   ← visualizzazione
<teamId>/<timestamp>_<random>_<nome>.original.<ext> ← download
```

Vantaggio: con un solo `path` base nello state, ricostruisco entrambi gli URL via convenzione. **Niente più 3 path diversi** che generavano ambiguità nei sistemi precedenti.

## Metadati state minimi

```javascript
state.teamPhotos[teamId] = [
  {
    path: 'teamA/1700_abcd_foto',  // base, senza estensione finale
    originalExt: 'jpg',             // estensione dell'originale
    name: 'foto.jpg',
    size: 350000,                   // peso preview
    originalSize: 4500000,          // peso originale
    ts: 1700000000
  }
]
```

`listTeamPhotos()` deriva al volo `previewUrl`, `originalUrl`, `url`, `thumbUrl` (gli ultimi 2 sono alias per retrocompat).

## Cosa cambia nell'esperienza utente

### Prima (v103)
- Griglia caricava l'originale completo (1-3MB per foto) → bandwidth alto
- Asimmetria tra griglia/lightbox/download generava bug
- Messaggio "Recupero dati..." infinito se l'originale era lento

### Adesso (v104)
- **Griglia carica la preview**: 200-400KB per foto, ~5x meno bandwidth della v103
- **Apertura immediata**: la preview è il file LIGHTBOX usa, quindi se carica una carica l'altra (zero asimmetrie)
- **Download HD garantito**: file originale byte-per-byte intatto se ≤9.5MB
- **ZIP qualità top**: STORE (no recompress), ogni file dentro è identico all'originale

## Retrocompatibilità garantita

Lo schema v104 convive con quelli precedenti:

| Schema | Caricato in | listTeamPhotos lo gestisce? | deleteTeamPhoto lo gestisce? |
|---|---|---|---|
| v104 (preview+original via convenzione) | Da v104 | ✓ | ✓ |
| v98 (thumb/ + original/ subfolder) | v98-v103 | ✓ (usa thumbPath + originalPath) | ✓ |
| v96-v97 (web/ + original/) | v96-v97 | ✓ (fallback) | ✓ |
| v90-v95 (singolo file) | v90-v95 | ✓ (usa path) | ✓ |

Le foto esistenti continuano a funzionare. Solo le foto nuove usano lo schema v104.

## File riscritti

| File | Modifiche |
|---|---|
| `assets/js/photos.js` | **Riscritto da zero** (~430 righe) |
| `assets/js/photos-worker.js` | **Riscritto** (~50 righe), aggiornata quality default 0.85 |
| `assets/js/store.js` | `normalizeTeamPhotos` persiste `originalExt` |
| `assets/js/admin-photos.js` | Commit salva `originalExt` invece di `thumbPath`/`originalPath` |
| HTML cache-buster | `v103-fast` → `v104-rebuilt` |

## Test (come richiesto: "fatti bene")

Il file `test_v104_real.js` non fa solo grep di stringhe: **carica davvero `photos.js` come modulo, mocka Supabase client, esegue le funzioni** e verifica:

1. `publicUrl()` genera URL corretti
2. `listTeamPhotos()` con schema v104 → previewUrl e originalUrl derivati correttamente da convenzione
3. `listTeamPhotos()` con schema v98 → fallback a thumbPath/originalPath
4. `listTeamPhotos()` con schema v90 → fallback a singolo path
5. `deleteTeamPhoto()` con oggetto v104 → include `.preview.jpg` + `.original.<ext>` + safety extensions
6. `deleteTeamPhoto()` con stringa v98 → derivazione corretta
7. Edge cases (null state, teamId vuoto, ecc.)
8. Render usage (griglia usa thumbUrl, download usa originalUrl, lightbox progressive)
9. Worker quality/maxDim corretti

**Risultati**:
- test_v104_real: **49/49 PASS**
- Tutti i test storici: **786/786 PASS**
- **TOTALE: 835/835 PASS**, zero regressioni

## Niente da fare su Supabase

Stesso bucket della v90. Le foto nuove usano la convenzione `.preview.jpg` / `.original.<ext>` direttamente nel nome file (no sotto-cartelle), quindi anche la lista nel dashboard Supabase è più pulita.
