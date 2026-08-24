# WaxPro Manager

App di gestione della produzione di candele: calcolo costi, ricette, magazzino, vendite, report e suggerimenti IA sui materiali. Include un piano di abbonamento gestito via Google Play Billing (solo app Android, per policy Google Play).

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth) per dati e autenticazione
- Google Play Billing per gli abbonamenti (verifica server-side via Play Developer API + notifiche RTDN), tramite il wrapper Capacitor in `android/`
- Cloudflare Workers (via `@opennextjs/cloudflare`) per l'hosting

Il progetto è stato migrato da Firebase (Firestore + Firebase Auth + Firebase App Hosting) a questo stack per uscire da Firebase Studio, in via di dismissione, e ridurre il lock-in.

## Setup locale

1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Copia `.env.local` (non versionato) con queste variabili:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=          # solo server, mai esporre al client
   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=
   GOOGLE_PLAY_PACKAGE_NAME=
   NEXT_PUBLIC_GOOGLE_PLAY_PACKAGE_NAME=
   PLAY_RTDN_SECRET=
   GOOGLE_PLAY_HOBBY_PRODUCT_ID= / NEXT_PUBLIC_GOOGLE_PLAY_HOBBY_PRODUCT_ID= / NEXT_PUBLIC_GOOGLE_PLAY_HOBBY_PLAN_ID=
   GOOGLE_PLAY_PRO_PRODUCT_ID= / NEXT_PUBLIC_GOOGLE_PLAY_PRO_PRODUCT_ID= / NEXT_PUBLIC_GOOGLE_PLAY_PRO_PLAN_ID=
   GOOGLE_PLAY_ANNUAL_PRODUCT_ID= / NEXT_PUBLIC_GOOGLE_PLAY_ANNUAL_PRODUCT_ID= / NEXT_PUBLIC_GOOGLE_PLAY_ANNUAL_PLAN_ID=
   NEXT_PUBLIC_APP_URL=http://localhost:9002
   ```
   (vedi i commenti in `.env.local` per il dettaglio di ogni variabile)
3. Setup del database: vedi [supabase/README.md](supabase/README.md) (schema, RLS, disabilitare la conferma email).
4. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```
   L'app parte sulla porta **9002**.

## Test di Google Play Billing

Non è testabile in locale (a differenza del vecchio checkout Stripe): richiede una build Android firmata caricata almeno nel track di test interno di Play Console, con un tester autorizzato. Vedi il workflow `.github/workflows/android-build.yml` per la build/firma automatica, e "Invia notifica di test" in Play Console per simulare un evento RTDN (rinnovo/cancellazione/rimborso).

## Deploy

Vedi [docs/deploy-cloudflare.md](docs/deploy-cloudflare.md) per la procedura completa (Cloudflare Workers, variabili d'ambiente, collegamento delle Real-time Developer Notifications di Google Play).

## Note

- Il piano gratuito Supabase mette in pausa il progetto dopo una settimana di inattività — si riattiva automaticamente al primo utilizzo.
- La modalità ospite (accesso senza registrazione) mantiene i dati solo in memoria: vengono persi al refresh, per design.
