// Va a capo un testo in righe la cui larghezza massima segue la corda di un
// cerchio (2*sqrt(r^2 - y^2)) invece di restare fissa: un paragrafo lungo
// finisce cosi' con una sagoma tonda che segue l'etichetta circolare, invece
// di restare una fascia rettangolare che non ci si adatta.
export interface CircleWrapLine {
  text: string;
  y: number;
}

export interface CircleWrapResult {
  lines: CircleWrapLine[];
  endY: number;
}

export function wrapTextToCircle(
  text: string,
  measureWidth: (s: string) => number,
  radius: number,
  lineHeight: number,
  startY: number
): CircleWrapResult {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: CircleWrapLine[] = [];
  let currentWords: string[] = [];
  let y = startY;

  const maxWidthAt = (yy: number) => {
    const clamped = Math.min(Math.abs(yy), radius * 0.98);
    return 2 * Math.sqrt(Math.max(radius * radius - clamped * clamped, 0));
  };

  for (const word of words) {
    const candidateWords = [...currentWords, word];
    const candidateText = candidateWords.join(' ');
    const maxWidth = maxWidthAt(y);
    if (measureWidth(candidateText) > maxWidth && currentWords.length > 0) {
      lines.push({ text: currentWords.join(' '), y });
      y += lineHeight;
      currentWords = [word];
    } else {
      currentWords = candidateWords;
    }
  }
  if (currentWords.length > 0) {
    lines.push({ text: currentWords.join(' '), y });
    y += lineHeight;
  }

  return { lines, endY: y };
}
