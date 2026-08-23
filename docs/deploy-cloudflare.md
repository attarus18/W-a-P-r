# Deploy su Cloudflare Workers

Il progetto usa [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) per pubblicare l'app Next.js su Cloudflare Workers (l'adapter `@cloudflare/next-on-pages` usato in precedenza è deprecato).

## Setup del progetto su Cloudflare

1. Vai su [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Workers** (non "Pages") → **Connect to Git** (o apri le impostazioni del progetto già esistente).
2. Seleziona il repository `attarus18/W-a-P-r` e il branch `main`.
3. **Settings → Build**:
   - **Build command**: `npm run cf:build`
   - Non serve impostare una "build output directory": il deploy usa il `wrangler.jsonc` nel repo, che punta a `.open-next/worker.js` (worker) e `.open-next/assets` (asset statici).
4. **Importante**: il campo `name` in [`wrangler.jsonc`](../wrangler.jsonc) deve coincidere esattamente con il nome del progetto/Worker mostrato nella dashboard Cloudflare. Se non coincide, correggilo prima del deploy.
5. **Settings → Variables and Secrets** — aggiungi (sia per Production che Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (vedi punto 7)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_STRIPE_HOBBY_PRICE_ID`
   - `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
   - `NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID`
   - `NEXT_PUBLIC_APP_URL` (l'URL assegnato da Cloudflare, es. `https://waxpro-manager.<subdomain>.workers.dev`)
6. Il flag di compatibilità `nodejs_compat` è già impostato in `wrangler.jsonc` (necessario perché il webhook Stripe in `src/app/api/stripe/webhook/route.ts` usa `crypto`). Non serve configurarlo separatamente nella dashboard.
7. Avvia il primo deploy. **Verifica esplicitamente che il webhook Stripe funzioni** sull'URL di preview prima di considerare il deploy concluso — è il punto tecnico più a rischio di tutta la migrazione.
8. Registra l'endpoint webhook di produzione su Stripe: Dashboard Stripe → **Developers → Webhooks → Add endpoint** → URL = `https://<tuo-dominio>/api/stripe/webhook`, eventi da ascoltare: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copia il **Signing secret** generato e impostalo come `STRIPE_WEBHOOK_SECRET` nel pannello Cloudflare (punto 5).

## Build e preview locali

```bash
npm run cf:build     # build Next.js + bundle OpenNext in .open-next/
npm run cf:preview   # build + esegue l'app nel runtime Workers in locale
npm run cf:deploy    # build + deploy diretto da CLI (richiede login wrangler)
```

Nota: su Windows, `@opennextjs/cloudflare` avvisa che la piattaforma non è pienamente supportata; il build locale funziona ma per un'esperienza più affidabile si consiglia WSL. Il build su Cloudflare gira comunque su Linux, quindi non è un problema per il deploy.

## Test locale del webhook Stripe (prima del deploy)

```bash
stripe listen --forward-to localhost:9002/api/stripe/webhook
```

Copia il secret stampato (`whsec_...`) in `STRIPE_WEBHOOK_SECRET` dentro `.env.local`, poi in un altro terminale:

```bash
stripe trigger checkout.session.completed
```
