/**
 * DepthDisplacementPanel — parallax from a still + its depth map.
 *
 * Gives a flat still a sense of 3D by displacing pixels according to a
 * grayscale depth map (white = near, black = far). Near pixels shift more than
 * far ones as the virtual camera drifts, so the image gains parallax without
 * any WebGL — it's an SVG `feDisplacementMap`, which renders identically under
 * Remotion's headless Chromium.
 *
 * Put the image and its depth map under `remotion/public/` and reference them
 * by relative path (they run through `staticFile`).
 */

import React from "react";
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  random,
} from "remotion";

import { mergeTheme, type DeepPartial, type Theme } from "../theme";
import type { DepthPanelData } from "../types";
import { SmallCaps, Vignette } from "./shared";

const resolve = (src: string) => (/^https?:\/\//.test(src) ? src : staticFile(src));

export const DepthDisplacementPanel: React.FC<{
  data: DepthPanelData;
  theme?: DeepPartial<Theme>;
}> = ({ data, theme: themeOverride }) => {
  const theme = mergeTheme(themeOverride);
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();

  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  // Displacement sweep. For left/right we sweep the map scale across the shot
  // so parallax reads as a lateral camera move; for in/out we hold it steadier
  // and let the Ken Burns zoom carry the motion.
  const lateral = data.direction === "left" || data.direction === "right";
  const dir = data.direction === "left" ? -1 : 1;
  const dispScale = lateral
    ? interpolate(t, [0, 1], [-data.intensity * dir, data.intensity * dir])
    : interpolate(t, [0, 1], [data.intensity * 0.4, data.intensity]);

  // A tiny opposite translation of the whole layer sells the camera slide.
  const slide = lateral ? interpolate(t, [0, 1], [12 * dir, -12 * dir]) : 0;

  // Ken Burns. "in" zooms toward, "out" starts close and pulls back.
  const kb =
    data.direction === "out"
      ? interpolate(t, [0, 1], [data.kenBurns, 1])
      : interpolate(t, [0, 1], [1, data.kenBurns]);

  const filterId = `depth-${Math.floor(random(data.src) * 1e6)}`;

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: theme.color.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          // Overscan (×1.06) so peak displacement never reveals a canvas edge.
          transform: `scale(${kb * 1.06}) translateX(${slide}px)`,
          transformOrigin: "50% 50%",
          opacity: fadeIn,
        }}
      >
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <filter
              id={filterId}
              x="-15%"
              y="-15%"
              width="130%"
              height="130%"
              colorInterpolationFilters="sRGB"
            >
              {/* depth map as displacement source */}
              <feImage
                href={resolve(data.depthSrc)}
                x="0"
                y="0"
                width={width}
                height={height}
                preserveAspectRatio="xMidYMid slice"
                result="depth"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="depth"
                scale={dispScale}
                xChannelSelector="R"
                yChannelSelector="A"
              />
            </filter>
          </defs>
          <g filter={`url(#${filterId})`}>
            <image
              href={resolve(data.src)}
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        </svg>
      </div>

      <Vignette strength={0.45} />

      {/* Caption / source credit */}
      {(data.caption || data.source) && (
        <div style={{ position: "absolute", left: 64, bottom: 56, opacity: fadeIn }}>
          {data.caption && (
            <div
              style={{
                fontFamily: theme.font.family,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.semibold,
                color: theme.color.text,
                textShadow: "0 2px 12px rgba(0,0,0,0.8)",
                maxWidth: width * 0.6,
              }}
            >
              {data.caption}
            </div>
          )}
          {data.source && (
            <SmallCaps theme={theme} style={{ marginTop: 6 }}>
              {data.source}
            </SmallCaps>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
