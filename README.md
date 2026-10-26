# FORMA — Gym Journal 1.2 / AI Bridge ChatGPT Go

App personale **offline-first per Android**, installabile come PWA da sito statico HTTPS. Niente API OpenAI, backend, librerie esterne, abbonamenti nuovi, database cloud o account per FORMA. Si usa con ChatGPT Go tramite **copia/incolla manuale**: i dati non vengono inviati automaticamente.

## Stato attuale

- **Realizzato**: profilo, schede personalizzabili, registrazione delle serie/RIR, timer recupero, calendario, libreria offline, grafici e record, progressione settimanale, import/export backup JSON.
- **Nuovo in 1.2**: sezione Coach in barra inferiore; selezione 2/4/6 settimane; report di allenamento senza nome e cognome; peso corporeo e note opzionali; copia negli appunti o download TXT; apertura diretta del sito ChatGPT senza dati nell'URL; import di risposta JSON; anteprima diff e motivazioni; selezione delle modifiche e conferma prima dell'applicazione.
- **Non implementato**: collegamento OAuth/automatico a ChatGPT, API AI, invio automatico, backup cloud, accesso a Google Drive, sincronizzazione tra telefoni, notifiche native Android, APK.
- **Da collaudare sul dispositivo**: installazione da HTTPS, cache Service Worker offline, persistenza reale dopo chiusura Chrome/PWA, copia/incolla con ChatGPT Android, timer in background.

## Architettura

| File | Uso |
| --- | --- |
| `index.html` | Entrypoint PWA |
| `app.js` | Interfaccia completa, azioni, backup, collegamento Coach |
| `ai_bridge.js` | Funzioni pure: report, JSON validation, applicazione controllata |
| `planner.js` | Schede, progressione, carichi, RIR |
| `features.js` | Recupero, calendario, metriche |
| `catalog.js` | Libreria esercizi |
| `db.js` | Database locale IndexedDB |
| `styles.css` | Stili mobile-first |
| `sw.js` | Cache app-shell `forma-app-shell-v1-2` |
| `manifest.webmanifest` | Identità PWA `id: "./"`, icone/avvio |
| `icons/` | Icone locali |
| `.nojekyll` | Pubblicazione GitHub Pages |

**Compatibilità**: database invariato `forma-gym-local-v1`, object store `records`, key `app-state`, `schemaVersion:1`; backup `format:"forma-gym-backup"`, `version:1`. Le nuove informazioni del Coach sono facoltative in `settings.aiBridge`. La 1.2 importa backup 1.0 e 1.1.

## Pubblicazione da zero (utente senza installazioni precedenti)

1. Estrai il file ZIP del progetto 1.2.
2. Crea un repository **pubblico** su GitHub, ad es. `forma-palestra`.
3. Carica nella **radice** tutti i file dell'app e la cartella `icons/`, mantenendola con le immagini dentro. Non caricare solo lo ZIP. Il repository contiene **codice pubblico**, non dati personali.
4. GitHub **Settings > Pages > Deploy from a branch > main > / (root) > Save**.
5. Apri in Chrome Android il link HTTPS di GitHub Pages e scegli **Installa app** / **Aggiungi alla schermata Home** dal menu.
6. Completa il profilo e prova persistenza, modalità aereo e backup.

Ulteriori istruzioni nel file `GUIDA_ANDROID.txt`. Non occorre compilazione, npm o installare prima la 1.0/1.1. `file://` non consente il Service Worker.

## Flusso AI Bridge

- Il report contiene programmi e serie registrate (carichi, ripetizioni, RIR) delle ultime 2/4/6 settimane. **Nome e cognome del profilo esclusi sempre**. Peso e note sono esclusi per impostazione predefinita, ma possono essere attivati volontariamente. Eventuali nomi di esercizi personalizzati vanno comunque controllati.
- Con **Copia report** si copia il testo negli appunti. **Apri ChatGPT** apre `https://chatgpt.com/` senza parametri o dati; **Salva TXT** permette un passaggio alternativo.
- L'app non legge ChatGPT direttamente. L'utente incolla il report e copia il JSON di risposta in FORMA.
- FORMA accetta solo `forma-ai-proposal` versione 1, per la settimana più recente, con ID corrispondenti a esercizi realmente presenti. Non sono consentiti esercizi inventati, rimozioni o modifiche a esercizi con serie già registrate/sedute concluse; incremento di peso > 15% e passaggio da 0 kg a carico positivo non sono accettati, come un aumento di più di due serie.
- Vengono presentati i vecchi e nuovi valori con la motivazione; **le modifiche sono inizialmente deselezionate**, si possono applicare soltanto dopo selezione e conferma. Il sistema controlla nuovamente la validità prima di salvare.

Esempio **illustrativo** del formato (ID realmente utilizzabili solo se generati dal report del tuo telefono):

```json
{
  "format": "forma-ai-proposal",
  "version": 1,
  "weekStart": "2026-10-26",
  "summary": "Consolida i carichi, privilegia tecnica e recupero.",
  "warnings": ["Manca uno storico sufficiente per aumentare i carichi."],
  "changes": [
    {
      "dayId": "ID_GIORNO_REALE",
      "exerciseId": "ID_ESERCIZIO_REALE",
      "setsTarget": 4,
      "reason": "Aumento prudente del numero di serie su esercizio non ancora svolto."
    }
  ]
}
```

Se ChatGPT suggerisce solo un'analisi, è valido restituire `"changes": []`. Se l'AI fornisce una risposta non valida o dati inventati, chiedile di correggere il JSON con gli ID esatti del report.

## Offline, privacy e backup

La PWA salva solo in IndexedDB; il Service Worker mette in cache i file applicativi. Il coach può funzionare solo online dal lato ChatGPT, ma FORMA continua offline. Backup manuale `Profilo > Esporta backup JSON`, file non cifrato. Non caricare backup su GitHub pubblico. Quando incolli un report in ChatGPT, il suo contenuto viene elaborato dal servizio ChatGPT secondo le impostazioni del tuo account; nessun dato lascia il telefono finché non lo condividi tu.

## Test eseguiti

- `node tests/ai_bridge_test.mjs` -> PASS (report senza nome/cognome, validazione, controlli anticorruzione, applicazione atomica).
- `node tests/planner_test.mjs`, `features_test.mjs`, `rir_safety_test.mjs` -> PASS.
- Test Playwright con browser mobile **simulato** (navigazione al server locale bloccata dall'ambiente): PASS per copia report mock, import JSON, anteprima, applicazione, backup e ripristino di backup 1.0. Il test del Service Worker reale/HTTPS e della persistenza reale in IndexedDB da Android **non è ancora concluso**.

## Roadmap (non ancora realizzata)

1. Collaudo Android reale e pulizia di bug; miglioramenti accessibilità e appunti.
2. Backup Google Drive crittografato **opzionale** (richiede login Google e gestione OAuth; non compreso in 1.2).
3. Coach con riepiloghi più efficaci, cicli di 4–8 settimane e possibili linee guida per progressioni più prudenti.
4. Eventuale integrazione Health Connect tramite livello nativo Android, e libreria video.

ChatGPT Go **non include API**: una integrazione automatica via API avrebbe una fatturazione separata. Questa versione non utilizza API e non comporta costi aggiuntivi oltre ai servizi che l'utente utilizza già (presupponendo hosting gratuito disponibile).
