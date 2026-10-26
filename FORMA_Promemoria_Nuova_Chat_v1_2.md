# FORMA Gym Journal — promemoria per riprendere il progetto (1.2)

**Data:** 26 ottobre 2026  
**Stato reale:** FORMA 1.2 sviluppata; test unitari e test interfaccia con browser mobile simulato superati. **L'utente non ha ancora pubblicato/installato l'app su Android.** Il primo collaudo reale deve ancora essere fatto.

## Contesto e preferenze

- App personale per gestire allenamenti in palestra, usata su **uno smartphone Android**.
- L'utente vuole mantenere **offline** le funzioni fondamentali e i **dati locali**, senza account FORMA, né pagare altro oltre al proprio abbonamento **ChatGPT Go**.
- ChatGPT Go **non include le API**; il progetto non deve introdurre una spesa API. La nuova versione usa un **bridge manuale** verso ChatGPT (copia/incolla), NON un'integrazione programmabile.
- Backup cloud Google Drive in passato discusso ma **non ancora implementato**; resta possibile miglioramento opzionale futuro, previa valutazione OAuth, sicurezza e tempo di sviluppo.

## File da allegare in una futura chat

1. `FORMA_Gym_Android_PWA_v1_2.zip` — codice statico completo, da pubblicare su hosting HTTPS.
2. `FORMA_Dossier_Progetto_v1_2.docx` — dossier completo da leggere prima di intervenire.
3. Questo file `.md` — sintesi per ricostruire il progetto.
4. Backup personale `FORMA-backup-AAAA-MM-GG.json` **solo se necessario per debugging**, trattandolo come dato privato. Evitare di condividerlo con repository pubblici.

## Versioni e funzioni

- **1.0**: profilo, peso, focus, schede 1–6 giorni, esercizi editabili, serie/ripetizioni/kg, storico, pianificazione nuova settimana, backup JSON.
- **1.1**: timer recupero con pausa e +15 s, serie rapide, calendario intelligente, libreria offline di 27 esercizi, record e grafici, RIR/progressione più prudente.
- **1.2**: tab **Coach** nel menu; report da 2/4/6 settimane; nome e cognome sempre esclusi; peso e note opzionali e deselezionati per default; copia appunti/TXT; pulsante per aprire `https://chatgpt.com/` senza trasmettere dati nell'URL; campo per incollare una risposta JSON; validazione di schema/ID; anteprima delle differenze; selezione esplicita; conferma prima di applicare.

## Architettura concreta

- **PWA HTML/CSS/JavaScript puro**: non React, non dipendenze npm, non build.
- `index.html`, `app.js`, `ai_bridge.js`, `planner.js`, `features.js`, `catalog.js`, `db.js`, `styles.css`, `manifest.webmanifest`, `sw.js`, `icons/`, `.nojekyll`.
- **IndexedDB invariato:** `forma-gym-local-v1`, object store `records`, chiave `app-state`. Stato `schemaVersion: 1`.
- **Backup invariato:** `format: "forma-gym-backup"`, `version: 1`, `appVersion: "1.2"` per i nuovi export; importazione compatibile con backup 1.0/1.1.
- **Service Worker:** cache `forma-app-shell-v1-2` include `ai_bridge.js`; caches vecchie eliminate all'attivazione.
- **Nessun servizio API**: non vengono fatti fetch automatici per dati degli allenamenti; la PWA può essere pubblicata su GitHub Pages (repository pubblico di solo codice).

## Protocollo manuale dell'AI Bridge

1. FORMA compone un testo contenente storico e scheda modificabile, con ID reali di giornata/esercizio.
2. L'utente copia/incolla il report in ChatGPT Go (non automaticamente).
3. ChatGPT restituisce JSON con chiavi `format`, `version`, `weekStart`, `summary`, `warnings`, `changes`.
4. Ogni elemento di `changes` ha `dayId`, `exerciseId`, `reason` e una o più chiavi tra `targetWeight`, `setsTarget`, `repMin`, `repMax`.
5. FORMA accetta soltanto esercizi esistenti nella **settimana più recente**, che **non abbiano serie già registrate**; vieta aumenti di peso >15%, passaggio da 0 kg a carico positivo, aumento di più di 2 serie; limite 25 modifiche; niente aggiunte/rimozioni di esercizi.
6. Anteprima con valore precedente e proposto; modifiche inizialmente **non selezionate**; conferma esplicita. Revalidazione subito prima dell'applicazione. Lo storico rimane invariato.
7. Se la settimana corrente contiene serie e si vuole pianificare il futuro, generare prima **la prossima settimana** dalla Scheda, poi creare il nuovo report.

## Test che sono stati fatti

- `node tests/planner_test.mjs`, `features_test.mjs`, `rir_safety_test.mjs`, `ai_bridge_test.mjs`: **passati**.
- `python tests/ai_bridge_ui_test.py` con Chromium mobile simulato e **salvataggio di test simulato** (la navigazione al server locale era bloccata nell'ambiente di test): **passato**. Verificati report senza nome/cognome, cambio privacy opzionale, copia mock, TXT, URL ChatGPT senza dati, JSON, anteprima, approvazione, esportazione 1.2 e import backup storico 1.0.
- Da eseguire su Android reale: installazione dal sito HTTPS, Service Worker offline con modalità aereo, persistenza IndexedDB, copia/incolla tra PWA e ChatGPT, vibrazione e suono timer anche con app minimizzata. Non affermare che questi test siano già passati.

## Installazione **da zero**

1. Scaricare l'**app 1.2** ZIP, decomprimerla (non aprire semplicemente index.html o lo ZIP sul telefono).
2. Pubblicare i file nella **radice** di un repository pubblico su GitHub; `icons/` deve mantenere i PNG; `index.html` deve essere in root.
3. GitHub: **Settings > Pages > Deploy from a branch > main > / (root) > Save**.
4. Aprire URL HTTPS su Chrome Android, menu **Installa app** o **Aggiungi alla schermata Home**.
5. Registrare dati di prova, verificare salvataggio, timer, modalità aereo, backup ed AI Bridge.

Il file `GUIDA_ANDROID.txt` contiene istruzioni complete. Nessuna installazione precedente della 1.0 o 1.1 è necessaria.

## Roadmap non implementata

- P0: test Android reale e correzione dei bug.
- P1: miglioramento dell'usabilità del bridge e della raccolta dati in palestra.
- P2: backup Google Drive crittografato **opzionale**, mantenendo backup manuale, controllo dei permessi e nessun obbligo di cloud; valutare il piano gratuito senza promettere gratuità illimitata.
- P2: report/periodizzazione 4–8 settimane, RIR e analisi del recupero, CSV e filtri.
- P3: eventuali video dimostrativi, wrapper APK/Health Connect, avvisi nativi; solo dopo i test reali.

## Messaggio da incollare in una prossima chat

> Voglio continuare lo sviluppo di FORMA Gym Journal per Android. Ti allego il dossier aggiornato e lo ZIP della versione 1.2. Leggi i file prima di modificare il codice. L'app è offline-first e salva i dati in IndexedDB sul telefono. Il modulo Coach comunica con ChatGPT Go soltanto tramite copia/incolla manuale e JSON, senza API. Mantieni compatibilità backup 1.0/1.1. Verifica prima se ho già pubblicato/installato FORMA e completato i test sul mio Android; al 26 ottobre 2026 non l'avevo ancora fatto. Aiutami a proseguire dalla roadmap.
