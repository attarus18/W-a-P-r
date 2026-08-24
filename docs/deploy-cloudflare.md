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
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (l'intero JSON dell'account di servizio Google Cloud)
   - `GOOGLE_PLAY_PACKAGE_NAME` / `NEXT_PUBLIC_GOOGLE_PLAY_PACKAGE_NAME`
   - `PLAY_RTDN_SECRET` (vedi punto 7)
   - `GOOGLE_PLAY_{HOBBY,PRO,ANNUAL}_PRODUCT_ID` / `NEXT_PUBLIC_GOOGLE_PLAY_{HOBBY,PRO,ANNUAL}_PRODUCT_ID` / `NEXT_PUBLIC_GOOGLE_PLAY_{HOBBY,PRO,ANNUAL}_PLAN_ID`
   - `NEXT_PUBLIC_APP_URL` (l'URL assegnato da Cloudflare, es. `https://waxpro-manager.<subdomain>.workers.dev`)
6. Il flag di compatibilità `nodejs_compat` è già impostato in `wrangler.jsonc` (necessario perché le rotte `/api/play-billing/*` in `src/app/api/play-billing/` usano `crypto`). Non serve configurarlo separatamente nella dashboard.
7. Avvia il primo deploy. **Verifica esplicitamente che le rotte `/api/play-billing/verify` e `/api/play-billing/rtdn` rispondano** sull'URL di preview prima di considerare il deploy concluso.
8. Collega le Real-time Developer Notifications di Google Play: crea un topic Cloud Pub/Sub, collegalo in Play Console → **Monetizzazione → Notifiche in tempo reale**, poi crea una push subscription su quel topic puntata a `https://<tuo-dominio>/api/play-billing/rtdn?secret=<PLAY_RTDN_SECRET>` (lo stesso valore impostato al punto 5).

## Build e preview locali

```bash
npm run cf:build     # build Next.js + bundle OpenNext in .open-next/
npm run cf:preview   # build + esegue l'app nel runtime Workers in locale
npm run cf:deploy    # build + deploy diretto da CLI (richiede login wrangler)
```

Nota: su Windows, `@opennextjs/cloudflare` avvisa che la piattaforma non è pienamente supportata; il build locale funziona ma per un'esperienza più affidabile si consiglia WSL. Il build su Cloudflare gira comunque su Linux, quindi non è un problema per il deploy.

## Test di Google Play Billing (prima del deploy)

Non è testabile in locale come lo era il webhook Stripe: Play Billing richiede sempre un canale Play Store, anche in test. Verifica lato server usando "Invia notifica di test" in Play Console (Monetizzazione → Notifiche in tempo reale) per simulare un evento RTDN, o esegui un acquisto reale con un account tester su una build caricata nel track di test interno.
