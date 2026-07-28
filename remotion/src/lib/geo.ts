/**
 * Geospatial helpers — turn lat/lng routes into screen geometry.
 *
 * The map uses a local Web-Mercator-ish projection: coordinates are projected
 * to an abstract plane, then fit into a target box with padding. At the scale
 * of a single incident (a few km) this is visually indistinguishable from a
 * proper projection and needs no dependencies.
 */

import type { GeoPoint } from "../types";

export interface XY {
  x: number;
  y: number;
}

const R = 6371000; // Earth radius, metres.
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance between two coordinates, in metres. */
export function haversine(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Cumulative distance (metres) at each point; first entry is 0. */
export function cumulativeDistances(points: GeoPoint[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + haversine(points[i - 1], points[i]));
  }
  return out;
}

/** Total route length in metres. */
export function totalLength(points: GeoPoint[]): number {
  const c = cumulativeDistances(points);
  return c[c.length - 1];
}

// Mercator y so that shapes are not vertically squashed.
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + toRad(lat) / 2));

export interface Projector {
  project: (p: GeoPoint) => XY;
  /** Screen-space bounding box actually used, for placing overlays. */
  box: { x: number; y: number; w: number; h: number };
}

/**
 * Build a projector that fits `points` into a width×height box with `padding`
 * (fraction of the smaller side kept as margin), preserving aspect ratio.
 */
export function fitProjector(
  points: GeoPoint[],
  width: number,
  height: number,
  padding = 0.12
): Projector {
  const xs = points.map((p) => p.lng);
  const ys = points.map((p) => mercY(p.lat));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX || 1e-6;
  const spanY = maxY - minY || 1e-6;

  const pad = padding * Math.min(width, height);
  const availW = width - 2 * pad;
  const availH = height - 2 * pad;

  // Uniform scale so 1 unit is the same in x and y (no distortion).
  const scale = Math.min(availW / spanX, availH / spanY);
  const drawW = spanX * scale;
  const drawH = spanY * scale;
  const offX = pad + (availW - drawW) / 2;
  const offY = pad + (availH - drawH) / 2;

  const project = (p: GeoPoint): XY => ({
    x: offX + (p.lng - minX) * scale,
    // Flip Y: larger latitude → higher on screen (smaller y).
    y: offY + (maxY - mercY(p.lat)) * scale,
  });

  return {
    project,
    box: { x: offX, y: offY, w: drawW, h: drawH },
  };
}

/**
 * Catmull-Rom spline through the points, sampled `perSeg` times per segment.
 * Returns a smooth polyline in the SAME coordinate space as the input.
 */
export function smooth(pts: XY[], perSeg = 12): XY[] {
  if (pts.length < 3) return pts.slice();
  const out: XY[] = [];
  const p = pts;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    for (let t = 0; t < perSeg; t++) {
      const s = t / perSeg;
      const s2 = s * s;
      const s3 = s2 * s;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * s +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * s +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3),
      });
    }
  }
  out.push(p[p.length - 1]);
  return out;
}

/** Length of a polyline in its own units. */
function polyLength(poly: XY[]): number[] {
  const cum = [0];
  for (let i = 1; i < poly.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y));
  }
  return cum;
}

export interface PointOnPath extends XY {
  /** Heading in radians (direction of travel at this point). */
  angle: number;
}

/**
 * Position and heading at fraction `t` [0..1] of a polyline's arc length.
 * Used to place the drawing head and aim the camera.
 */
export function pointAtFraction(poly: XY[], t: number): PointOnPath {
  if (poly.length === 1) return { ...poly[0], angle: 0 };
  const cum = polyLength(poly);
  const total = cum[cum.length - 1] || 1e-6;
  const target = Math.max(0, Math.min(1, t)) * total;

  let i = 1;
  while (i < cum.length && cum[i] < target) i++;
  i = Math.min(i, poly.length - 1);

  const segLen = cum[i] - cum[i - 1] || 1e-6;
  const local = (target - cum[i - 1]) / segLen;
  const a = poly[i - 1];
  const b = poly[i];
  return {
    x: a.x + (b.x - a.x) * local,
    y: a.y + (b.y - a.y) * local,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

/** Build an SVG path `d` string from a polyline. */
export function toPathD(poly: XY[]): string {
  if (poly.length === 0) return "";
  let d = `M ${poly[0].x.toFixed(2)} ${poly[0].y.toFixed(2)}`;
  for (let i = 1; i < poly.length; i++) {
    d += ` L ${poly[i].x.toFixed(2)} ${poly[i].y.toFixed(2)}`;
  }
  return d;
}

/**
 * Derive elevation-profile samples from a route whose points carry `ele`.
 * Skips gracefully if elevations are missing (returns []).
 */
export function routeToElevationSamples(
  points: GeoPoint[]
): { km: number; ele: number }[] {
  if (!points.every((p) => typeof p.ele === "number")) return [];
  const cum = cumulativeDistances(points);
  return points.map((p, i) => ({ km: cum[i] / 1000, ele: p.ele as number }));
}
