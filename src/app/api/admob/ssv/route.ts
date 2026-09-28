import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { REWARD_DAILY_LIMIT } from '@/lib/constants';
import { ADMOB_REWARDED_AD_UNIT_ID } from '@/lib/admob';

// Stesso runtime delle altre rotte server-side (WebCrypto disponibile anche
// su Cloudflare Workers con nodejs_compat).
export const runtime = 'nodejs';

// Verifica lato server (SSV) di AdMob per i video con ricompensa: quando un
// utente guarda un video fino in fondo, AdMob chiama QUESTA rotta con una GET
// firmata (ECDSA P-256). Solo se la firma e' valida accreditiamo il credito:
// un client che "dice" di aver visto il video non basta.
// Doc: https://developers.google.com/admob/android/ssv

const VERIFIER_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
const KEYS_TTL_MS = 24 * 60 * 60 * 1000;

interface VerifierKey {
  keyId: number;
  base64: string; // chiave pubblica SPKI (DER) in base64
}

let cachedKeys: { keys: VerifierKey[]; fetchedAt: number } | null = null;

async function getVerifierKeys(forceRefresh = false): Promise<VerifierKey[]> {
  if (!forceRefresh && cachedKeys && Date.now() - cachedKeys.fetchedAt < KEYS_TTL_MS) {
    return cachedKeys.keys;
  }
  const res = await fetch(VERIFIER_KEYS_URL);
  if (!res.ok) throw new Error(`Chiavi AdMob non raggiungibili (${res.status})`);
  const json = (await res.json()) as { keys: VerifierKey[] };
  cachedKeys = { keys: json.keys, fetchedAt: Date.now() };
  return json.keys;
}

function base64ToBytes(input: string): Uint8Array {
  // AdMob usa base64 "web safe" (- e _) senza padding per la firma.
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// La firma di AdMob e' ECDSA in formato DER (SEQUENCE di due INTEGER r, s);
// WebCrypto vuole invece il formato "raw" r||s da 32 byte ciascuno (P-256).
function derSignatureToRaw(der: Uint8Array): Uint8Array {
  let offset = 2;
  if (der[0] !== 0x30) throw new Error('Firma non in formato DER');
  if (der[1] & 0x80) offset = 2 + (der[1] & 0x7f);

  const readInteger = (): Uint8Array => {
    if (der[offset] !== 0x02) throw new Error('Firma DER non valida');
    const length = der[offset + 1];
    let value = der.slice(offset + 2, offset + 2 + length);
    offset += 2 + length;
    while (value.length > 32 && value[0] === 0) value = value.slice(1);
    const out = new Uint8Array(32);
    out.set(value, 32 - value.length);
    return out;
  };

  const r = readInteger();
  const s = readInteger();
  const raw = new Uint8Array(64);
  raw.set(r, 0);
  raw.set(s, 32);
  return raw;
}

async function verifySignature(data: string, signature: string, keyId: string): Promise<boolean> {
  let keys = await getVerifierKeys();
  let key = keys.find((k) => String(k.keyId) === keyId);
  if (!key) {
    // Google ruota le chiavi: se non la troviamo, riproviamo con una lista fresca.
    keys = await getVerifierKeys(true);
    key = keys.find((k) => String(k.keyId) === keyId);
  }
  if (!key) return false;

  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    base64ToBytes(key.base64) as BufferSource,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    derSignatureToRaw(base64ToBytes(signature)) as BufferSource,
    new TextEncoder().encode(data) as BufferSource
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = url.search.startsWith('?') ? url.search.slice(1) : url.search;

  // Il contenuto firmato e' la query string cosi' come arrivata, senza gli
  // ultimi due parametri (signature e key_id), in quest'ordine.
  const sigIndex = search.indexOf('&signature=');
  const signature = url.searchParams.get('signature');
  const keyId = url.searchParams.get('key_id');
  if (sigIndex < 0 || !signature || !keyId) {
    return NextResponse.json({ error: 'Richiesta non firmata' }, { status: 400 });
  }
  const signedData = search.slice(0, sigIndex);

  let valid = false;
  try {
    valid = await verifySignature(signedData, signature, keyId);
  } catch (err) {
    console.error('AdMob SSV: errore nella verifica della firma', err);
    // Errore nostro (es. chiavi non raggiungibili): 500 fa riprovare AdMob.
    return NextResponse.json({ error: 'Verifica non riuscita' }, { status: 500 });
  }
  if (!valid) {
    return NextResponse.json({ error: 'Firma non valida' }, { status: 403 });
  }

  // Facoltativo ma consigliato: accetta solo callback della NOSTRA unita'
  // con ricompensa (ad_unit e' la parte numerica dopo lo "/" dell'ID completo).
  const configuredUnit = ADMOB_REWARDED_AD_UNIT_ID.split('/')[1];
  const adUnit = url.searchParams.get('ad_unit');
  if (configuredUnit && adUnit && adUnit !== configuredUnit) {
    return NextResponse.json({ ok: true, credited: false, reason: 'ad_unit non riconosciuta' });
  }

  const userId = url.searchParams.get('user_id');
  const transactionId = url.searchParams.get('transaction_id');
  // Firma valida ma dati incompleti (es. il pulsante "Test" della console
  // AdMob): rispondiamo 200 cosi' la console considera l'URL raggiungibile.
  if (!userId || !UUID_RE.test(userId) || !transactionId) {
    return NextResponse.json({ ok: true, credited: false, reason: 'dati incompleti' });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc('grant_reward_credit', {
    p_user_id: userId,
    p_transaction_id: transactionId,
    p_daily_limit: REWARD_DAILY_LIMIT,
  });

  if (error) {
    // 23503 = utente inesistente: inutile far riprovare AdMob.
    if (error.code === '23503') {
      return NextResponse.json({ ok: true, credited: false, reason: 'utente sconosciuto' });
    }
    console.error('AdMob SSV: accredito fallito', error);
    return NextResponse.json({ error: 'Accredito non riuscito' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, credited: data === true });
}
