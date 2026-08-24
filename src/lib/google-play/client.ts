/**
 * Client per le Google Play Developer API (verifica abbonamenti Play Billing).
 *
 * Non usiamo il pacchetto `googleapis`/`google-auth-library`: come per Stripe
 * (vedi commento in src/lib/stripe/actions.ts, ora rimosso, sul motivo del
 * fetch HTTP client), le librerie Google standard usano un trasporto
 * Node/TCP che non funziona su Cloudflare Workers. Qui il flusso OAuth2
 * service-account è implementato a mano con solo fetch() + Web Crypto
 * (crypto.subtle), entrambi nativi su Workers.
 */

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function getServiceAccount(): { client_email: string; private_key: string } {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON non configurata');
  }
  return JSON.parse(raw);
}

function getPackageName(): string {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) {
    throw new Error('GOOGLE_PLAY_PACKAGE_NAME non configurata');
  }
  return packageName;
}

async function getAccessToken(): Promise<string> {
  const serviceAccount = getServiceAccount();
  const encoder = new TextEncoder();

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64UrlEncode(encoder.encode(JSON.stringify(header)))}.${base64UrlEncode(encoder.encode(JSON.stringify(claims)))}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned));
  const jwt = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Scambio token Google OAuth fallito (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface PlaySubscriptionLineItem {
  productId: string;
  expiryTime?: string;
  offerDetails?: { basePlanId?: string };
}

export interface PlaySubscriptionPurchase {
  subscriptionState: string;
  latestOrderId?: string;
  lineItems?: PlaySubscriptionLineItem[];
}

export async function getSubscriptionPurchase(purchaseToken: string): Promise<PlaySubscriptionPurchase> {
  const packageName = getPackageName();
  const accessToken = await getAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new Error(`Google Play Developer API: lettura acquisto fallita (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/**
 * Conferma l'acquisto entro 3 giorni, altrimenti Google lo rimborsa
 * automaticamente. Idempotente: se è già stato confermato, Google risponde
 * 400 -- il chiamante può ignorarlo.
 */
export async function acknowledgeSubscriptionPurchase(purchaseToken: string, productId: string): Promise<void> {
  const packageName = getPackageName();
  const accessToken = await getAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;

  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 400 && /already/i.test(text)) {
      return; // già confermato in precedenza
    }
    throw new Error(`Google Play Developer API: conferma acquisto fallita (${res.status}): ${text}`);
  }
}
