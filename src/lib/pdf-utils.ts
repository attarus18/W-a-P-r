import type jsPDF from 'jspdf';

declare global {
  interface Window {
    AppInventor?: {
      setWebViewString: (value: string) => void;
    };
  }
}

/**
 * La WebView Android (usata dall'app Kodular) non gestisce i download di
 * file a meno che l'app nativa non registri un DownloadListener: sia
 * doc.save() (anchor con attributo download) sia la navigazione a una
 * data URI (bloccata da Chromium per motivi di sicurezza, verificato) non
 * fanno nulla in quel contesto, senza alcun errore visibile. Nemmeno la Web
 * Share API funziona li' (verificato: nessuna reazione al tap).
 *
 * Kodular inietta pero' sempre un ponte JS (window.AppInventor.setWebViewString)
 * in ogni pagina caricata dal componente WebViewer. Il progetto Kodular e'
 * stato configurato per intercettarlo (Web_Viewer1.WebViewStringChange),
 * scaricare la data URI ricevuta con il componente Web1 (che gestisce
 * nativamente la decodifica del base64) e condividere il file risultante
 * con il componente Sharing1. Se il ponte non e' presente (browser normale),
 * si prova la Web Share API e infine si ricade sul download classico.
 */
export async function savePdf(doc: jsPDF, filename: string) {
  if (typeof window !== 'undefined' && window.AppInventor?.setWebViewString) {
    const dataUri = doc.output('datauristring', { filename });
    window.AppInventor.setWebViewString(dataUri);
    return;
  }

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
