import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | WaxPro Manager',
  description: "Informativa sulla privacy e istruzioni per la cancellazione dei dati dell'app WaxPro Manager.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">&larr; Torna a WaxPro Manager</Link>
          <h1 className="text-3xl font-bold tracking-tight mt-4">Informativa sulla Privacy</h1>
          <p className="text-muted-foreground mt-1">WaxPro Manager — Ultimo aggiornamento: 8 settembre 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Titolare del trattamento</h2>
          <p>
            Il titolare del trattamento dei dati raccolti tramite l&apos;applicazione WaxPro Manager
            (web e Android) è contattabile all&apos;indirizzo email{' '}
            <Link href="/support" className="text-primary hover:underline">waxpro.app@gmail.com</Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Quali dati raccogliamo</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Dati account:</strong> indirizzo email e password (gestita in modo sicuro dal nostro
              fornitore di autenticazione, Supabase, e mai leggibile in chiaro da noi). Se scegli di accedere
              con Google, riceviamo da Google il tuo nome, indirizzo email e immagine del profilo.
            </li>
            <li>
              <strong>Dati che inserisci nell&apos;app:</strong> prodotti di magazzino, quantità, vendite,
              resi, ricette, materiali e relativi costi. Sono dati che riguardano la tua attività, associati
              unicamente al tuo account.
            </li>
            <li>
              <strong>Dati di abbonamento:</strong> piano sottoscritto, stato dell&apos;abbonamento e
              identificativi dell&apos;acquisto forniti da Google Play (token di acquisto, ID prodotto, ID
              ordine). Non riceviamo né conserviamo dati della tua carta di pagamento: i pagamenti sono
              gestiti interamente da Google Play.
            </li>
            <li>
              <strong>Dati inviati al Suggeritore AI</strong> (funzionalità opzionale, riservata ai piani a
              pagamento): tipo di cera, peso del contenitore e descrizione del profilo olfattivo che inserisci
              vengono inviati a Google (API Gemini) per generare un suggerimento di ricetta. Non inviamo dati
              del tuo account o di identificazione personale insieme a questa richiesta.
            </li>
            <li>
              <strong>Richieste di assistenza:</strong> se ci contatti dalla sezione Impostazioni, il tuo
              indirizzo email e il testo del messaggio vengono inviati alla nostra casella di assistenza
              tramite il fornitore Resend.
            </li>
            <li>
              <strong>Dati pubblicitari:</strong> se non hai un abbonamento attivo, mostriamo banner
              pubblicitari tramite Google AdMob, che può raccogliere identificativi pubblicitari del
              dispositivo secondo le proprie informative. Gli utenti con abbonamento attivo non vedono
              pubblicità e questi dati non vengono raccolti.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Come usiamo i tuoi dati</h2>
          <p>Utilizziamo i dati raccolti esclusivamente per:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>fornire le funzionalità dell&apos;app (calcolo costi, magazzino, report, ricette);</li>
            <li>autenticarti e proteggere il tuo account;</li>
            <li>verificare e gestire il tuo abbonamento tramite Google Play;</li>
            <li>generare i suggerimenti del Suggeritore AI quando lo richiedi;</li>
            <li>rispondere alle tue richieste di assistenza;</li>
            <li>mostrare pubblicità agli utenti senza abbonamento attivo, per finanziare la versione gratuita.</li>
          </ul>
          <p>Non vendiamo i tuoi dati a terzi e non li usiamo per scopi diversi da quelli sopra elencati.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Con chi condividiamo i dati</h2>
          <p>I dati vengono trattati dai seguenti fornitori, solo nella misura necessaria a erogare il servizio:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase</strong> — database, autenticazione e archiviazione dei dati dell&apos;app.</li>
            <li><strong>Cloudflare</strong> — hosting ed erogazione del sito web.</li>
            <li><strong>Google</strong> — accesso con Google, Google Play Billing (abbonamenti), Google AdMob (pubblicità) e API Gemini (Suggeritore AI).</li>
            <li><strong>Resend</strong> — invio delle email di assistenza.</li>
          </ul>
          <p>Ognuno di questi fornitori ha una propria informativa sulla privacy indipendente per il trattamento che effettua per proprio conto.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Conservazione dei dati</h2>
          <p>
            Conserviamo i tuoi dati finché il tuo account resta attivo. Puoi eliminare definitivamente il tuo
            account e tutti i dati collegati (credenziali, magazzino, ricette, storico vendite e resi,
            abbonamento) in qualsiasi momento da <strong>Impostazioni → Zona Pericolosa → Elimina Account e
            Tutti i Dati</strong>. L&apos;operazione è immediata e irreversibile.
          </p>
        </section>

        <section id="data-deletion" className="space-y-3">
          <h2 className="text-xl font-semibold">6. Istruzioni per la cancellazione dei dati</h2>
          <p>Hai due modi per richiedere la cancellazione dei tuoi dati:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Dall&apos;app</strong> (consigliato, immediato): accedi a WaxPro Manager, vai su{' '}
              <strong>Impostazioni → Zona Pericolosa</strong> e seleziona <strong>&quot;Elimina Account e
              Tutti i Dati&quot;</strong>. Tutti i tuoi dati vengono cancellati definitivamente in pochi secondi.
            </li>
            <li>
              <strong>Via email:</strong> scrivi a{' '}
              <Link href="/support?prefill=Richiesta%20cancellazione%20dati" className="text-primary hover:underline">
                waxpro.app@gmail.com
              </Link>{' '}
              indicando che richiedi la cancellazione dei tuoi dati. Elaboriamo la richiesta entro 30 giorni.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. I tuoi diritti</h2>
          <p>
            Hai diritto di accedere ai tuoi dati, chiederne la correzione, la portabilità o la cancellazione, e
            di opporti al loro trattamento. Puoi esercitare questi diritti direttamente dalle Impostazioni
            dell&apos;app o scrivendoci a{' '}
            <Link href="/support" className="text-primary hover:underline">waxpro.app@gmail.com</Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Sicurezza</h2>
          <p>
            I tuoi dati sono protetti da controlli di accesso a livello di database (Row Level Security): ogni
            utente può leggere e modificare solo i propri dati. Le comunicazioni tra l&apos;app e i nostri
            server avvengono sempre via HTTPS.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Minori</h2>
          <p>WaxPro Manager non è destinata a minori di 16 anni e non raccogliamo consapevolmente dati di minori di 16 anni.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Modifiche a questa informativa</h2>
          <p>
            Possiamo aggiornare questa informativa nel tempo. La data in cima alla pagina indica l&apos;ultimo
            aggiornamento. Le modifiche sostanziali ti saranno comunicate tramite l&apos;app.
          </p>
        </section>

        <section className="space-y-3 pt-4 border-t">
          <h2 className="text-xl font-semibold">Contatti</h2>
          <p>
            Per qualsiasi domanda su questa informativa o sui tuoi dati, scrivi a{' '}
            <Link href="/support" className="text-primary hover:underline">waxpro.app@gmail.com</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
