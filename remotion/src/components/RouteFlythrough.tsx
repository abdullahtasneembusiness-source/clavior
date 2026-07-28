/**
 * RouteFlythrough — the pattern component.
 *
 * Draws the taken route over procedural topographic terrain while a virtual
 * camera tracks the drawing head. Timed waypoint callouts fire as the head
 * passes them, and the finale pulls back to reveal the whole route. A small
 * elevation inset tracks progress if the route carries elevation.
 *
 * Everything is data-driven via `RouteFlythroughData` — a new incident is new
 * coordinates, not new code.
 */

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

import { mergeTheme, type DeepPartial, type Theme } from "../theme";
import type { RouteFlythroughData } from "../types";
import {
  fitProjector,
  smooth,
  pointAtFraction,
  toPathD,
  totalLength,
  type XY,
} from "../lib/geo";
import { buildContours } from "../lib/topo";
import { kindColor, SmallCaps, Panel, Vignette } from "./shared";
import { ElevationInset } from "./ElevationProfile";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const RouteFlythrough: React.FC<{
  data: RouteFlythroughData;
  theme?: DeepPartial<Theme>;
}> = ({ data, theme: themeOverride }) => {
  const theme = mergeTheme(themeOverride);
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();

  // --- Project & smooth the route into world space (composition-sized). ---
  const { poly, projector, worldLen } = useMemo(() => {
    const proj = fitProjector(data.points, width, height, 0.16);
    const projected = data.points.map(proj.project);
    const smoothed = smooth(projected, 16);
    let len = 0;
    for (let i = 1; i < smoothed.length; i++) {
      len += Math.hypot(
        smoothed[i].x - smoothed[i - 1].x,
        smoothed[i].y - smoothed[i - 1].y
      );
    }
    return { poly: smoothed, projector: proj, worldLen: len };
  }, [data.points, width, height]);

  const { contours, indexEvery } = useMemo(
    () => buildContours(width, height, data.terrainSeed),
    [width, height, data.terrainSeed]
  );

  // --- Timeline phases: draw, then hold + pull-back. ---
  const drawFrames = Math.max(1, durationInFrames * data.drawPortion);
  const p = interpolate(frame, [0, drawFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const inHold = frame > drawFrames;
  const holdP = interpolate(frame, [drawFrames, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  const head = pointAtFraction(poly, p);
  const centroid: XY = {
    x: projector.box.x + projector.box.w / 2,
    y: projector.box.y + projector.box.h / 2,
  };

  // --- Camera. When following: track head, zoom in, then pull back on hold. ---
  let sc = 1;
  let tx = 0;
  let ty = 0;
  if (data.cameraFollow) {
    const introZoom = interpolate(p, [0, 0.12], [data.followZoom * 0.86, data.followZoom], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    sc = inHold ? lerp(data.followZoom, 1, holdP) : introZoom;

    const focus: XY = {
      x: lerp(head.x, centroid.x, inHold ? holdP : 0),
      y: lerp(head.y, centroid.y, inHold ? holdP : 0),
    };
    const anchorX = width * lerp(0.5, 0.5, holdP);
    const anchorY = height * lerp(0.6, 0.5, inHold ? holdP : 0);
    tx = anchorX - focus.x * sc;
    ty = anchorY - focus.y * sc;
  }

  const worldTransform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${sc.toFixed(4)})`;
  const toScreen = (w: XY): XY => ({ x: tx + w.x * sc, y: ty + w.y * sc });

  // Scale bar: metres per screen pixel at current zoom.
  const metersPerWorldPx = totalLength(data.points) / (worldLen || 1);
  const scaleBar = niceScaleBar(metersPerWorldPx / sc);

  const titleOpacity = interpolate(frame, [0, fps * 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: theme.color.bg, overflow: "hidden" }}>
      {/* Scaled + panned world: terrain + route */}
      <AbsoluteFill style={{ transform: worldTransform, transformOrigin: "0 0" }}>
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          {/* Topographic contours */}
          {contours.map((c) => (
            <g key={c.level}>
              {c.segments.map((s, i) => (
                <line
                  key={i}
                  x1={s[0]}
                  y1={s[1]}
                  x2={s[2]}
                  y2={s[3]}
                  stroke={
                    c.level % indexEvery === 0
                      ? theme.color.contourIndex
                      : theme.color.contour
                  }
                  strokeWidth={c.level % indexEvery === 0 ? 1.6 : 1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          ))}

          {/* Planned route, faint underneath */}
          <path
            d={toPathD(poly)}
            fill="none"
            stroke={theme.color.routeTrail}
            strokeWidth={3}
            strokeDasharray="2 10"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Drawn (taken) route with reveal */}
          <path
            d={toPathD(poly)}
            fill="none"
            stroke={theme.color.route}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1000}
            strokeDasharray={1000}
            strokeDashoffset={1000 * (1 - p)}
            vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 6px ${theme.color.routeGlow})` }}
          />
        </svg>
      </AbsoluteFill>

      <Vignette strength={0.5} />

      {/* --- Screen-space overlays (crisp, unscaled) --- */}

      {/* Waypoint dots + callouts */}
      {data.waypoints.map((wp, i) => {
        const wPos = pointAtFraction(poly, wp.at);
        const s = toScreen(wPos);
        const appearFrame = wp.at * drawFrames;
        const enter = spring({
          frame: frame - appearFrame,
          fps,
          config: { damping: 18, mass: 0.7, stiffness: 120 },
        });
        if (frame < appearFrame - 2) return null;
        const col = kindColor(theme, wp.kind);
        const onLeft = s.x > width * 0.6;
        return (
          <div key={i} style={{ position: "absolute", left: s.x, top: s.y, opacity: enter }}>
            {/* pulsing marker */}
            <div
              style={{
                position: "absolute",
                left: -7,
                top: -7,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: col,
                boxShadow: `0 0 0 4px ${col}33, 0 0 14px ${col}`,
                transform: `scale(${lerp(0.6, 1, enter)})`,
              }}
            />
            {/* connector + label */}
            <div
              style={{
                position: "absolute",
                left: onLeft ? -18 : 18,
                top: -14,
                transform: `translateX(${onLeft ? "-100%" : "0"})`,
                width: 320,
                textAlign: onLeft ? "right" : "left",
              }}
            >
              <div
                style={{
                  fontFamily: theme.font.family,
                  fontSize: theme.font.size.label,
                  fontWeight: theme.font.weight.bold,
                  color: theme.color.text,
                  lineHeight: 1.1,
                  textShadow: "0 2px 10px rgba(0,0,0,0.7)",
                }}
              >
                {wp.label}
              </div>
              {wp.sublabel && (
                <SmallCaps theme={theme} color={col} style={{ marginTop: 4 }}>
                  {wp.sublabel}
                </SmallCaps>
              )}
            </div>
          </div>
        );
      })}

      {/* Moving head */}
      {(() => {
        const s = toScreen(head);
        const pulse = 1 + 0.18 * Math.sin((frame / fps) * 6);
        return (
          <div
            style={{
              position: "absolute",
              left: s.x - 9,
              top: s.y - 9,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: theme.color.routeHead,
              boxShadow: `0 0 0 5px ${theme.color.routeGlow}, 0 0 18px ${theme.color.route}`,
              transform: `scale(${p > 0 && p < 1 ? pulse : 1})`,
              opacity: p < 1 ? 1 : 0,
            }}
          />
        );
      })()}

      {/* Title block */}
      {(data.title || data.subtitle) && (
        <div style={{ position: "absolute", left: 64, top: 56, opacity: titleOpacity }}>
          {data.subtitle && (
            <SmallCaps theme={theme} color={theme.color.accent} style={{ marginBottom: 8 }}>
              {data.subtitle}
            </SmallCaps>
          )}
          {data.title && (
            <div
              style={{
                fontFamily: theme.font.family,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
                color: theme.color.text,
                lineHeight: 1.05,
                maxWidth: width * 0.55,
                textShadow: "0 2px 16px rgba(0,0,0,0.8)",
              }}
            >
              {data.title}
            </div>
          )}
        </div>
      )}

      {/* Scale bar */}
      <div style={{ position: "absolute", left: 64, bottom: 56 }}>
        <div
          style={{
            width: scaleBar.px,
            height: 6,
            borderLeft: `2px solid ${theme.color.textMuted}`,
            borderRight: `2px solid ${theme.color.textMuted}`,
            borderBottom: `2px solid ${theme.color.textMuted}`,
          }}
        />
        <SmallCaps theme={theme} style={{ marginTop: 6 }}>
          {scaleBar.label}
        </SmallCaps>
      </div>

      {/* Elevation inset */}
      {data.showElevationInset && (
        <ElevationInset data={data} progress={p} theme={themeOverride} />
      )}
    </AbsoluteFill>
  );
};

/** Choose a round scale-bar distance close to ~220px on screen. */
function niceScaleBar(metersPerPx: number): { px: number; label: string } {
  const target = 220 * metersPerPx; // metres we'd like the bar to span
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const candidates = [1, 2, 5, 10].map((m) => m * pow);
  const meters =
    candidates.find((c) => c >= target) ?? candidates[candidates.length - 1];
  const px = meters / metersPerPx;
  const label = meters >= 1000 ? `${(meters / 1000).toFixed(meters % 1000 ? 1 : 0)} km` : `${meters} m`;
  return { px: Math.round(px), label };
}
