# Mediazione AdMob per il video con ricompensa (Suggeritore AI)

Stato: **Unity Ads attivo, sia lato codice che nel gruppo di mediazione
AdMob "WaxPro - Rewarded" (ID 5923294910). AppLovin in pausa** (account
sospeso, da sbloccare col supporto AppLovin prima di riprendere). Con il
prossimo build Android che include la dipendenza Unity (punto 2), l'app
inizierà a servire annunci anche tramite Unity Ads oltre alla rete AdMob
diretta, aumentando il fill rate per l'unità "Video Suggeritore AI"
(`ca-app-pub-4870944787959973/1000865632`, formato "Con premio").

## 1. Account e valori raccolti

- **Unity Ads (Unity Cloud / LevelPlay)** — organizzazione `attarus18_unity`
  (ID `6872887436829`), progetto "WaxPro - Candle Management"
  (`4f2ec0e2-9fee-4f35-a551-3f49dec04eb4`), app "CANDLE CALCULATOR" collegata
  a Google Play. Placement Rewarded creato il 2026-09-29:
  - **Game ID**: `800383714`
  - **Ad Unit ID (Network Placement ID)**: `BP_Rewarded_Android`
- **AppLovin** — https://max.applovin.com — **account sospeso**, motivo non
  noto. Da risolvere scrivendo al supporto AppLovin (verifica
  identità/azienda, di solito) prima di poter creare app/unità. Finché resta
  così, questa rete non fa parte della mediazione.

## 2. Codice nativo

In `android/app/build.gradle`, sezione "Mediazione AdMob":
- **Unity: attivo.** `com.google.ads.mediation:unity:4.20.1.0`, verificata
  compatibile con la versione del Google Mobile Ads SDK usata dal plugin
  `@capacitor-community/admob` (25.4.x) il 2026-09-29 su
  https://developers.google.com/admob/android/mediation/unity — da
  ricontrollare se in futuro si aggiorna quel plugin.
- **AppLovin: ancora commentata**, in attesa che l'account si sblocchi.
  Prima di scommentarla, prendere la versione esatta da
  https://developers.google.com/admob/android/mediation/applovin (mai `+`).

`google()` e `mavenCentral()` sono già nei repository del progetto
(`android/build.gradle`), quindi non serve aggiungere altro lì.

## 3. Gruppo di mediazione in AdMob

Il gruppo esistente "Wax pro" (ID 2088111038) è **solo per i banner**: non
tocca il video con ricompensa, va lasciato com'è.

**Fatto (2026-09-29).** Creato il nuovo gruppo di mediazione "WaxPro -
Rewarded" (ID `5923294910`), formato "Con premio", app WaxPro Gestionale
Candele, unità pubblicitaria collegata: "Video Suggeritore AI"
(`ca-app-pub-4870944787959973/1000865632`).
- In "Origini asta" sono presenti **AdMob Network** (origine di base, nessuna
  configurazione aggiuntiva) e **Unity Ads**, mappata con Game ID
  `800383714` e Placement ID `BP_Rewarded_Android` sull'unità "Video
  Suggeritore AI". Partnership Unity accettata, stato "Attivi".
- AppLovin non è stata aggiunta come origine annuncio: resta da fare quando
  l'account si sblocca (vedi punto 1).

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

## 5. "No fill" persistente anche con la mediazione attiva (2026-09-30)

Dopo aver attivato Unity Ads, il "no fill" continuava a presentarsi sempre,
anche da un dispositivo di test italiano. Diagnosi:

1. **Escluso un problema di codice/mediazione**: forzando temporaneamente
   `ADMOB_REWARDED_AD_UNIT_ID` sull'ID di test universale di Google
   (`ca-app-pub-3940256099942544/5224354917`, vedi `src/lib/admob.ts`), il
   video si è caricato regolarmente. L'unità di test ha sempre fill al 100%
   e non richiede consenso: il fatto che funzioni conferma che plugin, build
   nativa e gruppo di mediazione sono tutti a posto.
2. **Causa trovata**: l'app non chiamava mai le API di consenso GDPR/UMP del
   plugin (`requestConsentInfo()` / `showConsentForm()`), pur avendo già un
   messaggio di consenso **pubblicato** in AdMob per questa app ("Privacy e
   messaggi → Regolamenti europei", attivo dal 31/10/2025). Senza consenso
   raccolto per un utente nel SEE/Regno Unito/Svizzera, i partner di
   mediazione (Unity Ads incluso) possono legittimamente rifiutarsi di fare
   offerte per conformità, a prescindere da quanta domanda reale esista —
   spiegando un "no fill" sistematico proprio per i test fatti dall'Italia.
   Fix: `src/lib/admob-consent.ts` (`ensureAdmobConsent()`), chiamata prima
   di `AdMob.initialize()` sia nel banner (`admob-banner.tsx`) sia nel video
   con ricompensa (`rewarded-ad.ts`).

Questo fix non richiede una nuova build Android (l'app carica il sito via
WebView, vedi `server.url` in `capacitor.config.ts`): basta il deploy web
per essere attivo. Da verificare sul campo se risolve del tutto il fill, o
se resta comunque un po' di "no fill" residuo per pura scarsità di domanda
(normale per un'unità ancora giovane/a basso traffico).
