/**
 * LowerThirdCallout — timed broadcast lower-thirds.
 *
 * A transparent overlay: drop it on top of any other component in a
 * composition and it renders a stack of captions that animate in at `fromSec`
 * and out after `durSec`. Multiple simultaneous callouts stack cleanly.
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
import type { LowerThirdsData, LowerThirdItem } from "../types";
import { kindColor, SmallCaps } from "./shared";

const ROW_GAP = 118;

export const LowerThirdCallout: React.FC<{
  data: LowerThirdsData;
  theme?: DeepPartial<Theme>;
}> = ({ data, theme: themeOverride }) => {
  const theme = mergeTheme(themeOverride);
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const sorted = [...data.items].sort((a, b) => a.fromSec - b.fromSec);
  const isVisible = (it: LowerThirdItem) => {
    const start = it.fromSec * fps;
    const end = (it.fromSec + it.durSec) * fps;
    return frame >= start - 1 && frame <= end + fps * 0.5;
  };

  const visible = sorted.filter(isVisible);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {sorted.map((it, i) => {
        if (!isVisible(it)) return null;
        // Stack row = position among currently-visible callouts.
        const row = visible.indexOf(it);
        return (
          <Callout
            key={i}
            item={it}
            theme={theme}
            frame={frame}
            fps={fps}
            width={width}
            align={data.align}
            row={row}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Callout: React.FC<{
  item: LowerThirdItem;
  theme: Theme;
  frame: number;
  fps: number;
  width: number;
  align: "left" | "right";
  row: number;
}> = ({ item, theme, frame, fps, width, align, row }) => {
  const start = item.fromSec * fps;
  const end = (item.fromSec + item.durSec) * fps;
  const col = kindColor(theme, item.kind);
  const left = align === "left";

  const enter = spring({
    frame: frame - start,
    fps,
    config: { damping: 20, mass: 0.7, stiffness: 120 },
  });
  const exit = interpolate(frame, [end, end + fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const opacity = enter * (1 - exit);
  const slide = interpolate(enter, [0, 1], [40, 0]) + interpolate(exit, [0, 1], [0, 30]);
  const wipe = interpolate(frame, [start, start + fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 90 + row * ROW_GAP,
        [left ? "left" : "right"]: 72,
        opacity,
        transform: `translateX(${(left ? -1 : 1) * slide}px)`,
        textAlign: left ? "left" : "right",
        maxWidth: width * 0.5,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: left ? "row" : "row-reverse",
          alignItems: "stretch",
          gap: 16,
        }}
      >
        {/* accent bar */}
        <div style={{ width: 5, background: col, borderRadius: 3, boxShadow: `0 0 12px ${col}` }} />
        <div
          style={{
            background: "linear-gradient(90deg, rgba(11,16,21,0.86), rgba(11,16,21,0.55))",
            padding: "14px 22px",
            borderRadius: theme.radius.sm,
            backdropFilter: "blur(4px)",
          }}
        >
          {item.subtitle && (
            <SmallCaps theme={theme} color={col} style={{ marginBottom: 4 }}>
              {item.subtitle}
            </SmallCaps>
          )}
          <div
            style={{
              fontFamily: theme.font.family,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
              color: theme.color.text,
              lineHeight: 1.05,
            }}
          >
            {item.title}
          </div>
          {/* underline wipe */}
          <div
            style={{
              height: 3,
              marginTop: 10,
              width: `${wipe * 100}%`,
              marginLeft: left ? 0 : "auto",
              background: col,
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
};
