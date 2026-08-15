# WaxPro Manager

App di gestione della produzione di candele: calcolo costi, ricette, magazzino, vendite, report e suggerimenti IA sui materiali. Include un piano di abbonamento gestito via Stripe.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth) per dati e autenticazione
- Genkit + Gemini per il "Suggeritore IA"
- Stripe per gli abbonamenti (checkout hosted + webhook)
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
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
   NEXT_PUBLIC_STRIPE_HOBBY_PRICE_ID=
   NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=
   NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID=
   GEMINI_API_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:9002
   ```
3. Setup del database: vedi [supabase/README.md](supabase/README.md) (schema, RLS, disabilitare la conferma email).
4. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```
   L'app parte sulla porta **9002**.

## Webhook Stripe in locale

```bash
stripe listen --forward-to localhost:9002/api/stripe/webhook
```

Copia il secret stampato (`whsec_...`) in `STRIPE_WEBHOOK_SECRET`.

## Deploy

Vedi [docs/deploy-cloudflare.md](docs/deploy-cloudflare.md) per la procedura completa (Cloudflare Workers, variabili d'ambiente, registrazione del webhook di produzione su Stripe).

## Note

- Il piano gratuito Supabase mette in pausa il progetto dopo una settimana di inattività — si riattiva automaticamente al primo utilizzo.
- La modalità ospite (accesso senza registrazione) mantiene i dati solo in memoria: vengono persi al refresh, per design.
