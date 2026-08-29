import type jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

declare global {
  interface Window {
    AppInventor?: {
      setWebViewString: (value: string) => void;
    };
  }
}

let cachedLogoDataUrl: string | null | undefined;

/**
 * Logo per l'intestazione dei PDF, caricato una sola volta da /public/logo.png
 * e convertito in data URL (jsPDF.addImage vuole i dati gia' pronti, non un
 * URL da risolvere in modo asincrono al momento del disegno). Ritorna null se
 * il fetch fallisce, cosi' chi chiama puo' semplicemente saltare il logo
 * invece di far fallire l'intera esportazione del PDF.
 */
export async function getPdfLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl !== undefined) return cachedLogoDataUrl;
  try {
    const res = await fetch('/logo.png');
    if (!res.ok) throw new Error(`logo fetch failed: ${res.status}`);
    const blob = await res.blob();
    cachedLogoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Impossibile caricare il logo per il PDF:', err);
    cachedLogoDataUrl = null;
  }
  return cachedLogoDataUrl;
}

/**
 * La WebView Android (usata dall'app Kodular) non gestiva i download di
 * file a meno che l'app nativa non registrasse un DownloadListener: sia
 * doc.save() (anchor con attributo download) sia la navigazione a una
 * data URI (bloccata da Chromium per motivi di sicurezza, verificato) non
 * facevano nulla in quel contesto, senza alcun errore visibile. Nemmeno la
 * Web Share API funzionava li' (verificato: nessuna reazione al tap).
 *
 * Dopo la migrazione da Kodular a Capacitor il bridge window.AppInventor
 * non esiste piu': il salvataggio nativo passa da @capacitor/filesystem
 * (scrive il PDF in cache) + @capacitor/share (apre il foglio di
 * condivisione/salvataggio nativo Android). Il ramo AppInventor resta come
 * fallback innocuo nel caso l'app venga ancora aperta da una vecchia
 * WebView Kodular non aggiornata.
 */
export async function savePdf(doc: jsPDF, filename: string) {
  if (typeof window !== 'undefined' && window.AppInventor?.setWebViewString) {
    const dataUri = doc.output('datauristring', { filename });
    window.AppInventor.setWebViewString(dataUri);
    return;
  }

  if (Capacitor.isNativePlatform()) {
    const dataUri = doc.output('datauristring', { filename });
    const base64Data = dataUri.split(',').pop() ?? '';
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });
    await Share.share({
      title: filename,
      url: written.uri,
    });
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
