/**
 * Liang–Barsky: clip segment (x0,y0)–(x1,y1) to [xmin,xmax]×[ymin,ymax].
 * Returns clipped endpoints, or null if segment is fully outside.
 */
export function clipLineToRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  xmin: number,
  ymin: number,
  xmax: number,
  ymax: number,
): [number, number, number, number] | null {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let u1 = 0;
  let u2 = 1;

  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > u2) return false;
      if (r > u1) u1 = r;
    } else {
      if (r < u1) return false;
      if (r < u2) u2 = r;
    }
    return true;
  };

  if (!clip(-dx, x0 - xmin)) return null;
  if (!clip(dx, xmax - x0)) return null;
  if (!clip(-dy, y0 - ymin)) return null;
  if (!clip(dy, ymax - y0)) return null;

  if (u1 > u2) return null;
  return [
    x0 + u1 * dx,
    y0 + u1 * dy,
    x0 + u2 * dx,
    y0 + u2 * dy,
  ];
}
