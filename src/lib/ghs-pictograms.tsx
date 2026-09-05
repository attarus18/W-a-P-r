// Pittogrammi di pericolo GHS/CLP: ridisegnati in SVG (non gli asset
// ufficiali ECHA) ma con la stessa metafora visiva per ciascuna classe di
// pericolo, cosi' restano riconoscibili sull'etichetta stampata.
// Prima di stampare/vendere, verificare sempre la classificazione e i
// pittogrammi corretti sulla Scheda Dati di Sicurezza (SDS) del fornitore.

export type GhsPictogramType =
  | 'GHS01'
  | 'GHS02'
  | 'GHS03'
  | 'GHS04'
  | 'GHS05'
  | 'GHS06'
  | 'GHS07'
  | 'GHS08'
  | 'GHS09';

export const GHS_PICTOGRAM_TYPES: GhsPictogramType[] = [
  'GHS01', 'GHS02', 'GHS03', 'GHS04', 'GHS05', 'GHS06', 'GHS07', 'GHS08', 'GHS09',
];

const RED = '#CE1126';

const DIAMOND = '<polygon points="50,4 96,50 50,96 4,50" fill="#ffffff" stroke="' + RED + '" stroke-width="7" stroke-linejoin="round" />';

function glyph(type: GhsPictogramType): string {
  switch (type) {
    case 'GHS01': // Esplosivo: sfera con scoppio radiante
      return `
        <circle cx="50" cy="62" r="9" fill="#000" />
        <g stroke="#000" stroke-width="4" stroke-linecap="round">
          <line x1="50" y1="42" x2="50" y2="30" />
          <line x1="38" y1="47" x2="27" y2="38" />
          <line x1="62" y1="47" x2="73" y2="38" />
          <line x1="34" y1="58" x2="21" y2="58" />
          <line x1="66" y1="58" x2="79" y2="58" />
        </g>
        <circle cx="50" cy="30" r="3" fill="#000" />
        <circle cx="27" cy="38" r="3" fill="#000" />
        <circle cx="73" cy="38" r="3" fill="#000" />
      `;
    case 'GHS02': // Infiammabile: fiamma
      return `
        <path d="M50 24 C40 40 32 46 34 60 C36 74 44 80 50 80 C56 80 64 74 66 60 C68 48 60 44 58 52 C56 44 60 34 50 24 Z" fill="#000" />
      `;
    case 'GHS03': // Comburente: fiamma sopra un cerchio
      return `
        <circle cx="50" cy="70" r="12" fill="#000" />
        <path d="M50 28 C43 40 38 44 40 54 C42 62 47 66 50 66 C53 66 58 62 60 54 C62 46 56 44 55 49 C54 43 57 36 50 28 Z" fill="#000" />
      `;
    case 'GHS04': // Gas compresso: bombola
      return `
        <rect x="40" y="30" width="20" height="10" rx="2" fill="#000" />
        <path d="M38 40 h24 a4 4 0 0 1 4 4 v28 a6 6 0 0 1 -6 6 h-20 a6 6 0 0 1 -6 -6 v-28 a4 4 0 0 1 4 -4 Z" fill="#000" />
      `;
    case 'GHS05': // Corrosivo: due provette che sgocciolano
      return `
        <path d="M34 26 L46 40 L40 62 L26 50 Z" fill="#000" />
        <path d="M66 26 L54 40 L60 62 L74 50 Z" fill="#000" />
        <circle cx="38" cy="66" r="2.5" fill="#000" />
        <circle cx="62" cy="66" r="2.5" fill="#000" />
        <rect x="18" y="72" width="24" height="6" rx="1" fill="#000" />
        <rect x="58" y="72" width="24" height="6" rx="1" fill="#000" />
      `;
    case 'GHS06': // Tossico: teschio e tibie incrociate
      return `
        <circle cx="50" cy="42" r="18" fill="#000" />
        <circle cx="43" cy="40" r="4" fill="#fff" />
        <circle cx="57" cy="40" r="4" fill="#fff" />
        <path d="M46 50 L50 55 L54 50" fill="none" stroke="#fff" stroke-width="3" />
        <g stroke="#000" stroke-width="5" stroke-linecap="round">
          <line x1="32" y1="66" x2="68" y2="82" />
          <line x1="68" y1="66" x2="32" y2="82" />
        </g>
      `;
    case 'GHS07': // Attenzione: punto esclamativo
      return `
        <rect x="45" y="26" width="10" height="34" rx="3" fill="#000" />
        <circle cx="50" cy="70" r="6" fill="#000" />
      `;
    case 'GHS08': // Pericolo per la salute: busto con raggiera sul petto
      return `
        <circle cx="50" cy="32" r="9" fill="#000" />
        <path d="M35 78 C35 58 42 48 50 48 C58 48 65 58 65 78 Z" fill="#000" />
        <g stroke="#fff" stroke-width="2.5" stroke-linecap="round">
          <line x1="50" y1="54" x2="50" y2="66" />
          <line x1="44" y1="57" x2="56" y2="63" />
          <line x1="56" y1="57" x2="44" y2="63" />
        </g>
      `;
    case 'GHS09': // Ambiente: pesce e albero morto sull'acqua
      return `
        <path d="M30 40 C24 44 24 52 30 56 C36 52 36 44 30 40 Z" fill="#000" />
        <path d="M30 40 L20 36 L22 44 L20 52 L30 48" fill="#000" />
        <path d="M66 78 V56 M66 56 L58 50 M66 60 L74 54 M66 66 L60 62" stroke="#000" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M14 78 Q50 68 86 78" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round" />
      `;
    default:
      return '';
  }
}

export function buildGhsPictogramSvg(type: GhsPictogramType, sizePx = 200): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${sizePx}" height="${sizePx}">${DIAMOND}${glyph(type)}</svg>`;
}

interface GhsPictogramProps {
  type: GhsPictogramType;
  size?: number;
  className?: string;
}

export function GhsPictogram({ type, size = 48, className }: GhsPictogramProps) {
  return (
    <span
      className={className}
      style={{ display: 'inline-block', width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: buildGhsPictogramSvg(type, size) }}
    />
  );
}

const dataUrlCache = new Map<GhsPictogramType, string>();

/**
 * Converte il pittogramma in un PNG data URL disegnandolo su un canvas
 * offscreen, cosi' jsPDF (che vuole dati immagine gia' pronti, non SVG) puo'
 * inserirlo nel PDF con addImage — stesso approccio usato per il logo in
 * pdf-utils.ts.
 */
export async function getGhsPictogramDataUrl(type: GhsPictogramType): Promise<string> {
  const cached = dataUrlCache.get(type);
  if (cached) return cached;

  const svg = buildGhsPictogramSvg(type, 200);
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context non disponibile'));
        return;
      }
      ctx.drawImage(img, 0, 0, 200, 200);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error(`Impossibile caricare il pittogramma ${type}`));
    img.src = svgDataUrl;
  });

  dataUrlCache.set(type, dataUrl);
  return dataUrl;
}
