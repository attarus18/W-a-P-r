import type jsPDF from 'jspdf';

/**
 * La WebView Android (usata dall'app Kodular) non gestisce i download di
 * file a meno che l'app nativa non registri un DownloadListener: sia
 * doc.save() (anchor con attributo download) sia la navigazione a una
 * data URI (bloccata da Chromium per motivi di sicurezza, verificato) non
 * fanno nulla in quel contesto, senza alcun errore visibile.
 *
 * La Web Share API invece passa dal sistema operativo (intent di
 * condivisione Android), non dal motore di download della WebView, quindi
 * funziona anche li'. La proviamo sempre per prima; se non e' supportata o
 * l'utente annulla la condivisione, si ricade sul download classico.
 */
export async function savePdf(doc: jsPDF, filename: string) {
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([doc.output('blob')], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Condivisione non riuscita per altri motivi: si prosegue con il download classico.
    }
  }

  doc.save(filename);
}
