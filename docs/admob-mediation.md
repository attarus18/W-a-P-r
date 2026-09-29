# Mediazione AdMob per il video con ricompensa (Suggeritore AI)

Stato: **scheletro preparato, non ancora attivo**. Il codice attuale usa solo
la rete AdMob diretta (nessuna mediazione) sull'unità "Video Suggeritore AI"
(`ca-app-pub-4870944787959973/1000865632`, formato "Con premio").

Questo documento elenca cosa manca per aggiungere Unity Ads e AppLovin come
reti aggiuntive, per aumentare il riempimento (fill rate) quando AdMob da
solo risponde "No fill".

## 1. Account da creare (a cura del titolare, non automatizzabile)

Per ciascuna rete: creare un account business, aggiungere l'app Android
(package `appinventor.ai_attarus18.CalcoloCandele`, nome "WaxPro - Candle
Management"), creare un'unità pubblicitaria **Rewarded / Video con
ricompensa**.

- **Unity Ads (LevelPlay)** — https://unity.com/products/unity-ads
  Servono: **Game ID** e **Ad Unit ID** (o Placement ID) dell'unità rewarded.
- **AppLovin** — https://www.applovin.com
  Servono: **SDK Key** e **Ad Unit ID** dell'unità rewarded.

Questi valori vanno inseriti **nella console AdMob**, non nel codice (vedi
punto 3): l'app nativa non ha bisogno di conoscerli direttamente, li usa
l'SDK di AdMob internamente quando decide di far servire l'annuncio da
quella rete.

## 2. Codice nativo (già scritto, da attivare)

In `android/app/build.gradle`, sezione "Mediazione AdMob": due righe
commentate con `REPLACE_ME` al posto della versione. Prima di scommentarle:

1. Aprire le pagine ufficiali di integrazione Google e prendere la versione
   esatta dell'adattatore (cambia nel tempo, mai usare `+`):
   - Unity: https://developers.google.com/admob/android/mediation/unity
   - AppLovin: https://developers.google.com/admob/android/mediation/applovin
2. Sostituire `REPLACE_ME` con quella versione.
3. Togliere il commento `//` dalle due righe `implementation`.

`google()` e `mavenCentral()` sono già nei repository del progetto
(`android/build.gradle`), quindi non serve aggiungere altro lì.

## 3. Gruppo di mediazione in AdMob

Il gruppo esistente "Wax pro" (ID 2088111038) è **solo per i banner**: non
tocca il video con ricompensa, va lasciato com'è.

Da creare un **nuovo gruppo di mediazione**, formato "Con premio", app WaxPro
- Candle Management, unità pubblicitaria collegata: "Video Suggeritore AI".
- In "Origini asta" o "Struttura a cascata", aggiungere Unity Ads e AppLovin
  come origini annuncio, incollando App ID/Ad Unit ID/SDK Key ottenuti al
  punto 1 nella mappatura di ciascuna origine.
- AdMob Network resta come origine di base (nessuna configurazione
  aggiuntiva richiesta).

## 4. Build e pubblicazione

1. Far partire la pipeline `.github/workflows/android-build.yml` (dispatch
   manuale, o push di un tag `android-vNN`). Compila un AAB e un APK firmati
   con la keystore già nei secrets del repository.
2. Scaricare l'AAB dagli artifact dell'esecuzione.
3. Caricarlo su Google Play Console come nuova release (versionCode da
   incrementare in `android/app/build.gradle` prima del build, come per ogni
   release precedente).
4. Attendere la revisione di Google Play prima che la nuova build raggiunga
   gli utenti.

Nessuna di queste ultime azioni (creazione account, inserimento chiavi in
AdMob, caricamento su Play Console) è automatizzabile da qui: richiedono
l'accesso del titolare a servizi esterni con dati di fatturazione/pagamento.
