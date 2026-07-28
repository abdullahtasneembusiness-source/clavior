/**
 * TimelineStrip — a horizontal chronology with a sweeping playhead.
 *
 * Events sit at their `at` fraction and light up as the playhead reaches them,
 * alternating above/below the axis so labels never collide. The point of
 * divergence (kind: "divergence" | "fatal") gets a full-height marker so the
 * moment the plan broke is unmissable.
 */

import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

import { mergeTheme, type DeepPartial, type Theme } from "../theme";
import type { TimelineStripData } from "../types";
import { kindColor, SmallCaps } from "./shared";

export const TimelineStrip: React.FC<{
  data: TimelineStripData;
  theme?: DeepPartial<Theme>;
}> = ({ data, theme: themeOverride }) => {
  const theme = mergeTheme(themeOverride);
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();

  const padL = 140;
  const padR = 140;
  const innerW = width - padL - padR;
  const axisY = height / 2;

  const progress = interpolate(frame, [0, durationInFrames * data.sweepPortion], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const playheadX = padL + progress * innerW;

  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      <div style={{ position: "absolute", left: padL, top: 64, opacity: titleOpacity }}>
        <SmallCaps theme={theme} color={theme.color.accent}>
          {data.title}
        </SmallCaps>
      </div>

      {/* Axis */}
      <div
        style={{
          position: "absolute",
          left: padL,
          top: axisY,
          width: innerW,
          height: 4,
          background: theme.color.routeTrail,
          borderRadius: 2,
        }}
      />
      {/* Progress fill */}
      <div
        style={{
          position: "absolute",
          left: padL,
          top: axisY,
          width: progress * innerW,
          height: 4,
          background: theme.color.route,
          borderRadius: 2,
          boxShadow: `0 0 10px ${theme.color.routeGlow}`,
        }}
      />

      {/* Endpoint labels */}
      <SmallCaps theme={theme} style={{ position: "absolute", left: padL, top: axisY + 22 }}>
        {data.startLabel}
      </SmallCaps>
      <SmallCaps
        theme={theme}
        style={{ position: "absolute", left: padL + innerW, top: axisY + 22, transform: "translateX(-100%)" }}
      >
        {data.endLabel}
      </SmallCaps>

      {/* Events */}
      {data.events.map((ev, i) => {
        const x = padL + ev.at * innerW;
        const above = i % 2 === 0;
        const active = progress >= ev.at;
        const appearFrame = ev.at * durationInFrames * data.sweepPortion;
        const enter = spring({
          frame: frame - appearFrame,
          fps,
          config: { damping: 16, mass: 0.6, stiffness: 130 },
        });
        const col = kindColor(theme, ev.kind);
        const emphatic = ev.kind === "divergence" || ev.kind === "fatal";
        if (frame < appearFrame - 2) return null;

        const cardY = above ? axisY - 34 : axisY + 34;

        return (
          <div key={i} style={{ position: "absolute", left: x, top: 0, opacity: enter }}>
            {/* full-height marker for divergence */}
            {emphatic && (
              <div
                style={{
                  position: "absolute",
                  left: -1.5,
                  top: 96,
                  width: 3,
                  height: height - 192,
                  background: `linear-gradient(${col}, transparent)`,
                  opacity: 0.5,
                }}
              />
            )}
            {/* tick */}
            <div
              style={{
                position: "absolute",
                left: -1.5,
                top: axisY - (above ? 26 : 0),
                width: 3,
                height: 26,
                background: col,
              }}
            />
            {/* node */}
            <div
              style={{
                position: "absolute",
                left: -(emphatic ? 9 : 7),
                top: axisY - (emphatic ? 9 : 7),
                width: emphatic ? 18 : 14,
                height: emphatic ? 18 : 14,
                borderRadius: "50%",
                background: active ? col : theme.color.bgElevated,
                border: `2px solid ${col}`,
                boxShadow: active ? `0 0 12px ${col}` : "none",
                transform: `scale(${interpolate(enter, [0, 1], [0.4, 1])})`,
              }}
            />
            {/* card */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: cardY,
                transform: `translate(-50%, ${above ? "-100%" : "0"})`,
                width: 260,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: theme.font.mono,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  color: col,
                  letterSpacing: 1,
                }}
              >
                {ev.time}
              </div>
              <div
                style={{
                  fontFamily: theme.font.family,
                  fontSize: theme.font.size.label,
                  fontWeight: theme.font.weight.semibold,
                  color: theme.color.text,
                  lineHeight: 1.12,
                  marginTop: 2,
                }}
              >
                {ev.label}
              </div>
              {ev.detail && (
                <div
                  style={{
                    fontFamily: theme.font.family,
                    fontSize: theme.font.size.caption,
                    color: theme.color.textMuted,
                    lineHeight: 1.25,
                    marginTop: 4,
                  }}
                >
                  {ev.detail}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Playhead */}
      <div
        style={{
          position: "absolute",
          left: playheadX,
          top: axisY - 60,
          width: 2,
          height: 120,
          background: theme.color.routeHead,
          boxShadow: `0 0 10px ${theme.color.route}`,
          opacity: progress > 0 && progress < 1 ? 0.9 : 0,
        }}
      />
    </AbsoluteFill>
  );
};
