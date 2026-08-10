# WaxPro Manager

App di gestione della produzione di candele: calcolo costi, ricette, magazzino, vendite, report e suggerimenti IA sui materiali. Include un piano di abbonamento gestito via Stripe.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Genkit + Gemini per il "Suggeritore IA"
- Stripe per gli abbonamenti

> Migrazione in corso: il backend sta passando da Firebase (Firestore + Firebase Auth) a Supabase (Postgres + Auth), e l'hosting da Firebase App Hosting a Cloudflare Pages. Questa versione nel repository è ancora funzionante su Firebase; questa nota verrà aggiornata a migrazione completata con le istruzioni di setup definitive (variabili d'ambiente, Supabase, webhook Stripe, deploy).

## Sviluppo locale

```bash
npm install
npm run dev
```

L'app parte sulla porta 9002.
