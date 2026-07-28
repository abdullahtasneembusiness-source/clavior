/**
 * Data schemas for every component in the library.
 *
 * These are the *only* thing you edit to make a new video. Each schema is a zod
 * object, which gives us two things at once:
 *   1. A TypeScript type (via z.infer) so the editor autocompletes your data.
 *   2. An editable form inside Remotion Studio, so a non-coder can tweak values
 *      live and see the frame update.
 *
 * Convention: positions along a route or timeline are given as a fraction
 * `at` in [0, 1] (0 = start, 1 = end). That keeps callouts anchored correctly
 * no matter how many coordinates a route has.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

/** A geographic coordinate. `ele` (metres) is optional but powers elevation. */
export const zGeoPoint = z.object({
  lat: z.number(),
  lng: z.number(),
  /** Elevation in metres. */
  ele: z.number().optional(),
  /** Optional label shown if this point is a named waypoint on the map. */
  name: z.string().optional(),
});
export type GeoPoint = z.infer<typeof zGeoPoint>;

/** Severity of an event — drives colour and emphasis everywhere. */
export const zKind = z.enum(["normal", "caution", "divergence", "fatal"]);
export type EventKind = z.infer<typeof zKind>;

/* ------------------------------------------------------------------ *
 * Route flythrough
 * ------------------------------------------------------------------ */

export const zWaypoint = z.object({
  /** Fraction along the route [0..1] where this callout sits. */
  at: z.number().min(0).max(1),
  label: z.string(),
  sublabel: z.string().optional(),
  kind: zKind.default("normal"),
});
export type Waypoint = z.infer<typeof zWaypoint>;

export const zRouteFlythrough = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  /** Ordered coordinates of the taken route. Needs at least 2. */
  points: z.array(zGeoPoint).min(2),
  /** Callouts that fire as the head passes their `at` fraction. */
  waypoints: z.array(zWaypoint).default([]),
  /** Camera tracks the drawing head when true; otherwise a static fit view. */
  cameraFollow: z.boolean().default(true),
  /** Zoom while following (1 = fit whole route, >1 = closer). */
  followZoom: z.number().min(1).max(6).default(2.4),
  /** Fraction of the composition spent drawing the route (rest is hold). */
  drawPortion: z.number().min(0.2).max(1).default(0.82),
  /** Seed for the procedural topographic contours. Change for new terrain. */
  terrainSeed: z.number().int().default(7),
  /** Show the small elevation profile inset in the corner. */
  showElevationInset: z.boolean().default(true),
});
export type RouteFlythroughData = z.infer<typeof zRouteFlythrough>;

/* ------------------------------------------------------------------ *
 * Elevation profile
 * ------------------------------------------------------------------ */

export const zElevationSample = z.object({
  /** Cumulative distance from start, in kilometres. */
  km: z.number().min(0),
  /** Elevation in metres. */
  ele: z.number(),
});
export type ElevationSample = z.infer<typeof zElevationSample>;

export const zElevationMarker = z.object({
  km: z.number().min(0),
  label: z.string(),
  kind: zKind.default("normal"),
});
export type ElevationMarker = z.infer<typeof zElevationMarker>;

export const zElevationProfile = z.object({
  title: z.string().default("Elevation profile"),
  samples: z.array(zElevationSample).min(2),
  markers: z.array(zElevationMarker).default([]),
  /** Portion of the composition spent tracing the profile left-to-right. */
  drawPortion: z.number().min(0.2).max(1).default(0.8),
});
export type ElevationProfileData = z.infer<typeof zElevationProfile>;

/* ------------------------------------------------------------------ *
 * Timeline strip
 * ------------------------------------------------------------------ */

export const zTimelineEvent = z.object({
  /** Fraction along the timeline [0..1]. */
  at: z.number().min(0).max(1),
  /** Short clock/relative label, e.g. "14:20" or "Day 3". */
  time: z.string(),
  label: z.string(),
  detail: z.string().optional(),
  kind: zKind.default("normal"),
});
export type TimelineEvent = z.infer<typeof zTimelineEvent>;

export const zTimelineStrip = z.object({
  title: z.string().default("Timeline"),
  startLabel: z.string().default("Start"),
  endLabel: z.string().default("End"),
  events: z.array(zTimelineEvent).min(1),
  /** Portion of the composition spent sweeping the playhead across. */
  sweepPortion: z.number().min(0.2).max(1).default(0.85),
});
export type TimelineStripData = z.infer<typeof zTimelineStrip>;

/* ------------------------------------------------------------------ *
 * Depth-displacement image panel
 * ------------------------------------------------------------------ */

export const zDepthPanel = z.object({
  /** Path passed to staticFile(), e.g. "stills/ridge.jpg" under public/. */
  src: z.string(),
  /** Grayscale depth map for the same image (white = near, black = far). */
  depthSrc: z.string(),
  caption: z.string().optional(),
  source: z.string().optional(),
  /** Parallax strength in pixels of peak displacement. */
  intensity: z.number().min(0).max(80).default(26),
  /** Direction the virtual camera drifts. */
  direction: z.enum(["left", "right", "in", "out"]).default("right"),
  /** Slow Ken Burns zoom over the shot (1 = none). */
  kenBurns: z.number().min(1).max(1.4).default(1.08),
});
export type DepthPanelData = z.infer<typeof zDepthPanel>;

/* ------------------------------------------------------------------ *
 * Lower-third callouts
 * ------------------------------------------------------------------ */

export const zLowerThirdItem = z.object({
  /** When it appears, in seconds from the start of the composition. */
  fromSec: z.number().min(0),
  /** How long it stays, in seconds. */
  durSec: z.number().min(0.5).default(4),
  title: z.string(),
  subtitle: z.string().optional(),
  kind: zKind.default("normal"),
});
export type LowerThirdItem = z.infer<typeof zLowerThirdItem>;

export const zLowerThirds = z.object({
  items: z.array(zLowerThirdItem).default([]),
  /** Anchor corner for the stack. */
  align: z.enum(["left", "right"]).default("left"),
});
export type LowerThirdsData = z.infer<typeof zLowerThirds>;
