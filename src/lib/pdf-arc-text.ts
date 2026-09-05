import type jsPDF from 'jspdf';

/**
 * Disegna un testo lungo l'arco superiore di un cerchio, una lettera alla
 * volta ruotata per restare tangente alla curva (come il nome di marca sul
 * coperchio di un barattolo), invece di una riga dritta dentro il cerchio.
 * Ritorna l'altezza approssimativa occupata (per il calcolo del layout).
 */
export function drawArcTextTop(doc: jsPDF, text: string, centerX: number, centerY: number, radius: number): void {
  const chars = Array.from(text);
  if (chars.length === 0) return;

  const widths = chars.map((c) => doc.getTextWidth(c));
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const totalAngle = totalWidth / radius;
  let angle = -totalAngle / 2;

  chars.forEach((c, i) => {
    const charAngle = widths[i] / radius;
    const mid = angle + charAngle / 2;
    const x = centerX + radius * Math.sin(mid);
    const y = centerY - radius * Math.cos(mid);
    doc.text(c, x, y, { angle: (-mid * 180) / Math.PI, align: 'center' });
    angle += charAngle;
  });
}
