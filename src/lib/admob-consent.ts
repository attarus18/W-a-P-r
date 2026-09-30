// Gestione del consenso GDPR (UMP) per AdMob. In AdMob esiste gia' un
// messaggio di consenso pubblicato per WaxPro ("Privacy e messaggi ->
// Regolamenti europei"), ma se il codice non lo interroga mai l'SDK non
// raccoglie il consenso degli utenti nel SEE/Regno Unito/Svizzera: molte reti
// in mediazione (incluse quelle aggiunte con Unity Ads) possono allora
// rifiutarsi di fare offerte per conformita', causando "no fill" anche
// quando esiste domanda pubblicitaria reale. Questa funzione va chiamata
// PRIMA di AdMob.initialize(), sia per il banner che per il video con
// ricompensa.
let consentChecked = false;

export async function ensureAdmobConsent(): Promise<void> {
  if (consentChecked) return;
  consentChecked = true;

  try {
    const { AdMob } = await import('@capacitor-community/admob');
    const info = await AdMob.requestConsentInfo();

    if (info.isConsentFormAvailable) {
      await AdMob.showConsentForm();
    }
  } catch (err) {
    // Non blocchiamo mai l'app per un problema di consenso (es. rete
    // assente al primo avvio): AdMob applica comunque un comportamento
    // conservativo di default se il consenso resta sconosciuto.
    console.error('AdMob: richiesta del consenso GDPR non riuscita', err);
    consentChecked = false;
  }
}
