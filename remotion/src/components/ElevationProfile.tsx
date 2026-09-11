/**
 * ElevationProfile — an animated cross-section of the route's altitude.
 *
 * Exports two things:
 *   - `ElevationProfile`: a full-frame composition (title, stats, axes).
 *   - `ElevationInset`: the compact corner version RouteFlythrough embeds,
 *     driven by an external `progress` so the two stay in lockstep.
 */

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

import { mergeTheme, type DeepPartial, type Theme } from "../theme";
import type {
  ElevationProfileData,
  ElevationSample,
  ElevationMarker,
  RouteFlythroughData,
} from "../types";
import { routeToElevationSamples } from "../lib/geo";
import { kindColor, SmallCaps, Panel } from "./shared";

interface ChartGeom {
  project: (km: number, ele: number) => { x: number; y: number };
  path: string;
  areaPath: (upTo: number) => string;
  minEle: number;
  maxEle: number;
  totalKm: number;
  eleAt: (km: number) => number;
}

function buildGeom(
  samples: ElevationSample[],
  w: number,
  h: number,
  pad: { l: number; r: number; t: number; b: number }
): ChartGeom {
  const totalKm = samples[samples.length - 1].km || 1e-6;
  const eles = samples.map((s) => s.ele);
  let minEle = Math.min(...eles);
  let maxEle = Math.max(...eles);
  const range = maxEle - minEle || 1;
  // Pad the elevation range a touch so the line isn't glued to the edges.
  minEle -= range * 0.12;
  maxEle += range * 0.12;

  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const project = (km: number, ele: number) => ({
    x: pad.l + (km / totalKm) * innerW,
    y: pad.t + (1 - (ele - minEle) / (maxEle - minEle)) * innerH,
  });

  const path = samples
    .map((s, i) => {
      const p = project(s.km, s.ele);
      return `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    })
    .join(" ");

  const eleAt = (km: number) => {
    if (km <= 0) return samples[0].ele;
    if (km >= totalKm) return samples[samples.length - 1].ele;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].km >= km) {
        const a = samples[i - 1];
        const b = samples[i];
        const f = (km - a.km) / (b.km - a.km || 1e-6);
        return a.ele + (b.ele - a.ele) * f;
      }
    }
    return samples[samples.length - 1].ele;
  };

  const baseY = pad.t + innerH;
  const areaPath = (upToKm: number) => {
    const pts = samples.filter((s) => s.km <= upToKm);
    // include the exact leading edge
    const edge = { km: upToKm, ele: eleAt(upToKm) };
    const seq = [...pts, edge];
    const line = seq
      .map((s, i) => {
        const p = project(s.km, s.ele);
        return `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      })
      .join(" ");
    const last = project(edge.km, edge.ele);
    const first = project(seq[0].km, seq[0].ele);
    return `${line} L ${last.x.toFixed(2)} ${baseY.toFixed(2)} L ${first.x.toFixed(2)} ${baseY.toFixed(2)} Z`;
  };

  return { project, path, areaPath, minEle, maxEle, totalKm, eleAt };
}

/** Cumulative gain/loss over the samples, in metres. */
function gainLoss(samples: ElevationSample[]): { gain: number; loss: number } {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i].ele - samples[i - 1].ele;
    if (d > 0) gain += d;
    else loss += -d;
  }
  return { gain: Math.round(gain), loss: Math.round(loss) };
}

/* ------------------------------------------------------------------ *
 * Core chart (shared by full + inset)
 * ------------------------------------------------------------------ */

const ElevationChart: React.FC<{
  samples: ElevationSample[];
  markers: ElevationMarker[];
  width: number;
  height: number;
  progress: number; // 0..1 of the trace
  theme: Theme;
  compact?: boolean;
  gradientId: string;
}> = ({ samples, markers, width, height, progress, theme, compact, gradientId }) => {
  const pad = compact
    ? { l: 14, r: 14, t: 14, b: 22 }
    : { l: 90, r: 60, t: 40, b: 80 };
  const geom = useMemo(() => buildGeom(samples, width, height, pad), [samples, width, height, compact]);

  const upToKm = progress * geom.totalKm;
  const lead = geom.project(upToKm, geom.eleAt(upToKm));

  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.color.route} stopOpacity={0.42} />
          <stop offset="100%" stopColor={theme.color.route} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* baseline grid */}
      {!compact &&
        [0, 0.25, 0.5, 0.75, 1].map((f) => {
          const ele = geom.minEle + (geom.maxEle - geom.minEle) * (1 - f);
          const y = pad.t + f * (height - pad.t - pad.b);
          return (
            <g key={f}>
              <line
                x1={pad.l}
                y1={y}
                x2={width - pad.r}
                y2={y}
                stroke={theme.color.grid}
                strokeWidth={1}
              />
              <text
                x={pad.l - 14}
                y={y + 6}
                textAnchor="end"
                fill={theme.color.textFaint}
                fontFamily={theme.font.mono}
                fontSize={theme.font.size.micro}
              >
                {Math.round(ele)}m
              </text>
            </g>
          );
        })}

      {/* faint full profile */}
      <path d={geom.path} fill="none" stroke={theme.color.routeTrail} strokeWidth={compact ? 1.5 : 2} />

      {/* drawn area + line */}
      <path d={geom.areaPath(upToKm)} fill={`url(#${gradientId})`} />
      <path
        d={geom.path}
        fill="none"
        stroke={theme.color.route}
        strokeWidth={compact ? 2.5 : 4}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1000}
        strokeDasharray={1000}
        strokeDashoffset={1000 * (1 - progress)}
        style={{ filter: `drop-shadow(0 0 4px ${theme.color.routeGlow})` }}
      />

      {/* markers passed so far */}
      {markers.map((m, i) => {
        if (m.km > upToKm + 1e-6) return null;
        const p = geom.project(m.km, geom.eleAt(m.km));
        const col = kindColor(theme, m.kind);
        return (
          <g key={i}>
            <line x1={p.x} y1={p.y} x2={p.x} y2={height - pad.b} stroke={col} strokeWidth={1.5} strokeDasharray="3 4" opacity={0.7} />
            <circle cx={p.x} cy={p.y} r={compact ? 4 : 6} fill={col} stroke={theme.color.bg} strokeWidth={2} />
            {!compact && (
              <text
                x={p.x}
                y={p.y - 16}
                textAnchor="middle"
                fill={theme.color.text}
                fontFamily={theme.font.family}
                fontWeight={theme.font.weight.semibold}
                fontSize={theme.font.size.caption}
              >
                {m.label}
              </text>
            )}
          </g>
        );
      })}

      {/* leading dot + readout */}
      {progress > 0 && progress < 1 && (
        <g>
          <circle cx={lead.x} cy={lead.y} r={compact ? 4 : 7} fill={theme.color.routeHead} stroke={theme.color.route} strokeWidth={2} />
          {!compact && (
            <text
              x={lead.x}
              y={lead.y - 18}
              textAnchor="middle"
              fill={theme.color.routeHead}
              fontFamily={theme.font.mono}
              fontSize={theme.font.size.caption}
            >
              {Math.round(geom.eleAt(upToKm))} m
            </text>
          )}
        </g>
      )}
    </svg>
  );
};

/* ------------------------------------------------------------------ *
 * Full-frame composition
 * ------------------------------------------------------------------ */

export const ElevationProfile: React.FC<{
  data: ElevationProfileData;
  theme?: DeepPartial<Theme>;
}> = ({ data, theme: themeOverride }) => {
  const theme = mergeTheme(themeOverride);
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames * data.drawPortion], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const stats = useMemo(() => gainLoss(data.samples), [data.samples]);
  const totalKm = data.samples[data.samples.length - 1].km;

  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      <div style={{ position: "absolute", left: 90, top: 44 }}>
        <SmallCaps theme={theme} color={theme.color.accent}>
          {data.title}
        </SmallCaps>
      </div>

      <ElevationChart
        samples={data.samples}
        markers={data.markers}
        width={width}
        height={height}
        progress={progress}
        theme={theme}
        gradientId="ele-full"
      />

      {/* stat row */}
      <div style={{ position: "absolute", right: 60, top: 44, display: "flex", gap: 40 }}>
        <Stat theme={theme} label="Distance" value={`${totalKm.toFixed(1)} km`} />
        <Stat theme={theme} label="Ascent" value={`+${stats.gain} m`} color={theme.color.route} />
        <Stat theme={theme} label="Descent" value={`−${stats.loss} m`} color={theme.color.accent} />
      </div>

      {/* x-axis distance ticks */}
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 60,
          bottom: 40,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <SmallCaps key={f} theme={theme} style={{ fontFamily: theme.font.mono }}>
            {(totalKm * f).toFixed(1)} km
          </SmallCaps>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ theme: Theme; label: string; value: string; color?: string }> = ({
  theme,
  label,
  value,
  color,
}) => (
  <div style={{ textAlign: "right" }}>
    <SmallCaps theme={theme}>{label}</SmallCaps>
    <div
      style={{
        fontFamily: theme.font.mono,
        fontSize: theme.font.size.body,
        fontWeight: theme.font.weight.bold,
        color: color ?? theme.color.text,
      }}
    >
      {value}
    </div>
  </div>
);

/* ------------------------------------------------------------------ *
 * Compact inset for RouteFlythrough
 * ------------------------------------------------------------------ */

export const ElevationInset: React.FC<{
  data: RouteFlythroughData;
  progress: number;
  theme?: DeepPartial<Theme>;
}> = ({ data, progress, theme: themeOverride }) => {
  const theme = mergeTheme(themeOverride);
  const { width } = useVideoConfig();
  const samples = useMemo(() => routeToElevationSamples(data.points), [data.points]);
  if (samples.length < 2) return null;

  const w = Math.min(460, width * 0.32);
  const h = 150;
  const markers: ElevationMarker[] = data.waypoints.map((wp) => ({
    km: wp.at * samples[samples.length - 1].km,
    label: wp.label,
    kind: wp.kind,
  }));

  return (
    <Panel theme={theme} style={{ position: "absolute", right: 56, bottom: 56, width: w, height: h, padding: 12 }}>
      <SmallCaps theme={theme} style={{ marginBottom: 4 }}>
        Elevation
      </SmallCaps>
      <div style={{ position: "relative", width: w - 24, height: h - 44 }}>
        <ElevationChart
          samples={samples}
          markers={markers}
          width={w - 24}
          height={h - 44}
          progress={progress}
          theme={theme}
          compact
          gradientId="ele-inset"
        />
      </div>
    </Panel>
  );
};
