/**
 * Procedural topographic contours.
 *
 * A deterministic height field (sum of seeded Gaussian peaks and basins) is
 * contoured with marching squares to produce iso-lines that read as a survey
 * map. Everything is seeded, so a given `seed` always renders the same terrain
 * — essential for Remotion, where every frame must be reproducible.
 */

export interface Contour {
  /** SVG path segments (each a straight line) at this iso level. */
  segments: [number, number, number, number][];
  /** Elevation index — every `indexEvery`-th ring is drawn heavier. */
  level: number;
}

/** Small, fast, seedable PRNG (mulberry32). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Peak {
  cx: number;
  cy: number;
  amp: number;
  sigma: number;
}

/**
 * Build the contour set for a `width`×`height` area.
 * - `seed` selects the terrain.
 * - `levels` is how many iso-lines to draw.
 * - `cols`/`rows` set the sampling grid (higher = smoother but slower).
 */
export function buildContours(
  width: number,
  height: number,
  seed: number,
  levels = 11,
  cols = 96,
  rows = 54
): { contours: Contour[]; indexEvery: number } {
  const rnd = mulberry32(seed * 2654435761);

  // Scatter a handful of peaks and a couple of basins across the area.
  const peakCount = 5 + Math.floor(rnd() * 4);
  const peaks: Peak[] = [];
  for (let i = 0; i < peakCount; i++) {
    peaks.push({
      cx: rnd() * width,
      cy: rnd() * height,
      amp: (rnd() * 0.8 + 0.5) * (rnd() < 0.28 ? -1 : 1), // some basins
      sigma: (0.14 + rnd() * 0.22) * Math.min(width, height),
    });
  }

  // A little low-frequency ripple stops peaks looking like perfect bells.
  const wob1 = rnd() * Math.PI * 2;
  const wob2 = rnd() * Math.PI * 2;
  const wobF = 2 + rnd() * 2;

  const cellW = width / cols;
  const cellH = height / rows;

  // Sample the field on a (cols+1)×(rows+1) grid.
  const field = new Float32Array((cols + 1) * (rows + 1));
  let min = Infinity;
  let max = -Infinity;
  const at = (c: number, r: number) => field[r * (cols + 1) + c];

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const x = c * cellW;
      const y = r * cellH;
      let h = 0;
      for (const p of peaks) {
        const dx = x - p.cx;
        const dy = y - p.cy;
        h += p.amp * Math.exp(-(dx * dx + dy * dy) / (2 * p.sigma * p.sigma));
      }
      h +=
        0.06 *
        Math.sin((x / width) * Math.PI * wobF + wob1) *
        Math.cos((y / height) * Math.PI * wobF + wob2);
      field[r * (cols + 1) + c] = h;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }

  const indexEvery = 5;
  const contours: Contour[] = [];
  const span = max - min || 1;

  for (let l = 1; l < levels; l++) {
    const threshold = min + (span * l) / levels;
    const segments: [number, number, number, number][] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tl = at(c, r);
        const tr = at(c + 1, r);
        const br = at(c + 1, r + 1);
        const bl = at(c, r + 1);
        // Marching-squares case index.
        let idx = 0;
        if (tl > threshold) idx |= 8;
        if (tr > threshold) idx |= 4;
        if (br > threshold) idx |= 2;
        if (bl > threshold) idx |= 1;
        if (idx === 0 || idx === 15) continue;

        const x0 = c * cellW;
        const y0 = r * cellH;
        const lerp = (a: number, b: number) => (threshold - a) / (b - a || 1e-6);

        // Edge crossing points.
        const top = { x: x0 + lerp(tl, tr) * cellW, y: y0 };
        const right = { x: x0 + cellW, y: y0 + lerp(tr, br) * cellH };
        const bottom = { x: x0 + lerp(bl, br) * cellW, y: y0 + cellH };
        const left = { x: x0, y: y0 + lerp(tl, bl) * cellH };

        const push = (a: { x: number; y: number }, b: { x: number; y: number }) =>
          segments.push([a.x, a.y, b.x, b.y]);

        switch (idx) {
          case 1:
          case 14:
            push(left, bottom);
            break;
          case 2:
          case 13:
            push(bottom, right);
            break;
          case 3:
          case 12:
            push(left, right);
            break;
          case 4:
          case 11:
            push(top, right);
            break;
          case 5:
            push(left, top);
            push(bottom, right);
            break;
          case 6:
          case 9:
            push(top, bottom);
            break;
          case 7:
          case 8:
            push(left, top);
            break;
          case 10:
            push(left, bottom);
            push(top, right);
            break;
        }
      }
    }
    contours.push({ segments, level: l });
  }

  return { contours, indexEvery };
}
