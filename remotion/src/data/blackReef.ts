/**
 * Example dataset — "Blackreef Spur".
 *
 * ⚠️ This is ILLUSTRATIVE, FICTIONAL sample data used to demo the components,
 * not a record of a real incident. When you build a real episode, replace these
 * arrays with coordinates and times verified against primary sources. The point
 * of the library: a new story is new data in this shape, not new code.
 *
 * Story it tells: a two-day winter ascent that went wrong on the descent when
 * the party missed the correct gully in a whiteout and dropped into steep ground.
 */

import type {
  RouteFlythroughData,
  ElevationProfileData,
  TimelineStripData,
  DepthPanelData,
  LowerThirdsData,
} from "../types";
import { routeToElevationSamples } from "../lib/geo";

/** The taken route: valley floor → ridge → summit → wrong descent line. */
export const blackReefRoute: RouteFlythroughData = {
  title: "Blackreef Spur",
  subtitle: "Reconstruction · winter ascent",
  cameraFollow: true,
  followZoom: 2.4,
  drawPortion: 0.82,
  terrainSeed: 42,
  showElevationInset: true,
  points: [
    { lat: 57.0700, lng: -3.6720, ele: 322, name: "Glen car park" },
    { lat: 57.0735, lng: -3.6690, ele: 410 },
    { lat: 57.0768, lng: -3.6648, ele: 520 },
    { lat: 57.0790, lng: -3.6600, ele: 638, name: "Lochan bothy" },
    { lat: 57.0815, lng: -3.6560, ele: 742 },
    { lat: 57.0842, lng: -3.6505, ele: 861 },
    { lat: 57.0861, lng: -3.6448, ele: 970, name: "Spur col" },
    { lat: 57.0878, lng: -3.6402, ele: 1064 },
    { lat: 57.0893, lng: -3.6361, ele: 1176, name: "Summit cairn" },
    // Descent — here the plan was the NW ridge; they took the fall line east.
    { lat: 57.0879, lng: -3.6320, ele: 1092 },
    { lat: 57.0863, lng: -3.6289, ele: 968, name: "Missed gully" },
    { lat: 57.0844, lng: -3.6268, ele: 815 },
    { lat: 57.0822, lng: -3.6255, ele: 690, name: "Cragfast" },
  ],
  waypoints: [
    { at: 0.0, label: "Set off 06:40", sublabel: "Glen car park · 322 m", kind: "normal" },
    { at: 0.28, label: "Bothy check-in", sublabel: "last shelter", kind: "normal" },
    { at: 0.5, label: "Spur col", sublabel: "weather closing in", kind: "caution" },
    { at: 0.66, label: "Summit 12:10", sublabel: "1176 m · whiteout", kind: "caution" },
    { at: 0.78, label: "Wrong turn", sublabel: "took the fall line, not the ridge", kind: "divergence" },
    { at: 1.0, label: "Cragfast 14:55", sublabel: "cliffed out above the corrie", kind: "fatal" },
  ],
};

/** Elevation profile derived from the same route (single source of truth). */
export const blackReefElevation: ElevationProfileData = {
  title: "Elevation profile · Blackreef Spur",
  drawPortion: 0.8,
  samples: routeToElevationSamples(blackReefRoute.points),
  markers: [
    { km: 1.26, label: "Bothy", kind: "normal" },
    { km: 2.48, label: "Col", kind: "caution" },
    { km: 3.11, label: "Summit", kind: "caution" },
    { km: 3.66, label: "Missed gully", kind: "divergence" },
  ],
};

export const blackReefTimeline: TimelineStripData = {
  title: "Timeline · 14 hours",
  startLabel: "06:40 depart",
  endLabel: "20:10 alarm raised",
  sweepPortion: 0.85,
  events: [
    { at: 0.0, time: "06:40", label: "Depart", detail: "Two climbers, valley car park", kind: "normal" },
    { at: 0.22, time: "08:05", label: "Bothy", detail: "On schedule, cloud building", kind: "normal" },
    { at: 0.44, time: "10:30", label: "Spur col", detail: "Wind rising, visibility dropping", kind: "caution" },
    { at: 0.6, time: "12:10", label: "Summit", detail: "Whiteout, no visual reference", kind: "caution" },
    { at: 0.72, time: "12:40", label: "Descent begins", detail: "Compass not re-checked", kind: "divergence" },
    { at: 0.86, time: "14:55", label: "Cragfast", detail: "Cliffed out on steep ground", kind: "fatal" },
    { at: 1.0, time: "20:10", label: "Overdue", detail: "Partner raises the alarm", kind: "normal" },
  ],
};

export const blackReefDepth: DepthPanelData = {
  src: "stills/demo-ridge.svg",
  depthSrc: "stills/demo-ridge-depth.svg",
  caption: "The east face below the summit — steeper than it looks on the map.",
  source: "Reconstruction still · placeholder art",
  intensity: 30,
  direction: "right",
  kenBurns: 1.1,
};

export const blackReefLowerThirds: LowerThirdsData = {
  align: "left",
  items: [
    { fromSec: 0.5, durSec: 4, title: "Blackreef Spur", subtitle: "Grampians · 1,176 m", kind: "normal" },
    { fromSec: 5, durSec: 4, title: "Two climbers", subtitle: "experienced · winter-equipped", kind: "normal" },
    { fromSec: 9.5, durSec: 4.5, title: "The plan: NW ridge", subtitle: "a walk-off in good visibility", kind: "caution" },
    { fromSec: 14.5, durSec: 5, title: "Where it diverged", subtitle: "the fall line, in a whiteout", kind: "divergence" },
  ],
};
