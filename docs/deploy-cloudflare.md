# Deploy su Cloudflare Pages

1. Vai su [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Seleziona il repository `attarus18/W-a-P-r` e il branch `main`.
3. Nelle impostazioni di build:
   - **Framework preset**: Next.js
   - **Build command**: `npm run pages:build`
   - **Build output directory**: `.vercel/output/static`
4. **Settings → Environment variables** — aggiungi (sia per Production che Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (vedi punto 7)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_STRIPE_HOBBY_PRICE_ID`
   - `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
   - `NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID`
   - `NEXT_PUBLIC_APP_URL` (l'URL assegnato da Cloudflare, es. `https://waxpro-manager.pages.dev`)
   - `GEMINI_API_KEY` (o il nome esatto atteso da `@genkit-ai/google-genai`)
5. **Settings → Functions → Compatibility flags** — aggiungi `nodejs_compat` sia per Production che per Preview. Necessario perché il webhook Stripe (`src/app/api/stripe/webhook/route.ts`) usa `crypto` per verificare la firma, e Cloudflare Pages Functions gira su runtime edge di default.
6. Avvia il primo deploy. **Verifica esplicitamente che il webhook funzioni** sull'URL di preview prima di considerare il deploy concluso — è il punto tecnico più a rischio di tutta la migrazione (vedi punto 3 dei "Rischi" nel piano di migrazione).
7. Registra l'endpoint webhook di produzione su Stripe: Dashboard Stripe → **Developers → Webhooks → Add endpoint** → URL = `https://<tuo-dominio>.pages.dev/api/stripe/webhook`, eventi da ascoltare: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copia il **Signing secret** generato e impostalo come `STRIPE_WEBHOOK_SECRET` nel pannello Cloudflare (punto 4).

## Test locale del webhook (prima del deploy)

```bash
stripe listen --forward-to localhost:9002/api/stripe/webhook
```

Copia il secret stampato (`whsec_...`) in `STRIPE_WEBHOOK_SECRET` dentro `.env.local`, poi in un altro terminale:

```bash
stripe trigger checkout.session.completed
```
