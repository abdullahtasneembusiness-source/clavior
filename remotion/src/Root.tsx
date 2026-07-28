/**
 * Composition registry.
 *
 * Each component is registered as its own composition so shots can be rendered
 * independently and assembled with ffmpeg against the voiceover track — the
 * production model this channel uses. Every composition's `schema` is the
 * component's zod data schema, so the whole thing is editable live in Studio:
 * change the arrays in the props panel and the frame updates.
 *
 * Frame rate and canvas are 30fps / 1920×1080 across the board. Durations are
 * placeholders sized to the example data — set each shot's real length to match
 * its slice of narration when you build an episode.
 */

import React from "react";
import { AbsoluteFill, Composition } from "remotion";

import { RouteFlythrough } from "./components/RouteFlythrough";
import { ElevationProfile } from "./components/ElevationProfile";
import { TimelineStrip } from "./components/TimelineStrip";
import { DepthDisplacementPanel } from "./components/DepthDisplacementPanel";
import { LowerThirdCallout } from "./components/LowerThirdCallout";

import {
  zRouteFlythrough,
  zElevationProfile,
  zTimelineStrip,
  zDepthPanel,
  zLowerThirds,
  type LowerThirdsData,
} from "./types";
import {
  blackReefRoute,
  blackReefElevation,
  blackReefTimeline,
  blackReefDepth,
  blackReefLowerThirds,
} from "./data/blackReef";

const FPS = 30;
const W = 1920;
const H = 1080;
const sec = (s: number) => Math.round(s * FPS);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RouteFlythrough"
        component={(props) => <RouteFlythrough data={props} />}
        schema={zRouteFlythrough}
        defaultProps={blackReefRoute}
        durationInFrames={sec(20)}
        fps={FPS}
        width={W}
        height={H}
      />

      <Composition
        id="ElevationProfile"
        component={(props) => <ElevationProfile data={props} />}
        schema={zElevationProfile}
        defaultProps={blackReefElevation}
        durationInFrames={sec(12)}
        fps={FPS}
        width={W}
        height={H}
      />

      <Composition
        id="TimelineStrip"
        component={(props) => <TimelineStrip data={props} />}
        schema={zTimelineStrip}
        defaultProps={blackReefTimeline}
        durationInFrames={sec(15)}
        fps={FPS}
        width={W}
        height={H}
      />

      <Composition
        id="DepthPanel"
        component={(props) => <DepthDisplacementPanel data={props} />}
        schema={zDepthPanel}
        defaultProps={blackReefDepth}
        durationInFrames={sec(9)}
        fps={FPS}
        width={W}
        height={H}
      />

      {/* Layering demo: lower-thirds over a depth-displaced still. Both read
          the composition timeline directly, so they stay perfectly in sync. */}
      <Composition
        id="LowerThirds"
        component={(props: LowerThirdsData) => (
          <AbsoluteFill>
            {/* drop the still's own caption so the lower-thirds own the corner */}
            <DepthDisplacementPanel
              data={{ ...blackReefDepth, caption: undefined, source: undefined }}
            />
            <LowerThirdCallout data={props} />
          </AbsoluteFill>
        )}
        schema={zLowerThirds}
        defaultProps={blackReefLowerThirds}
        durationInFrames={sec(20)}
        fps={FPS}
        width={W}
        height={H}
      />
    </>
  );
};
