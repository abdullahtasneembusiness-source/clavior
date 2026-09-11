/**
 * Small presentational primitives shared across components, plus the mapping
 * from an event `kind` to its colour. Keeping this in one place means the whole
 * library reacts consistently to "this is the point of divergence".
 */

import React from "react";
import type { Theme } from "../theme";
import type { EventKind } from "../types";

export function kindColor(theme: Theme, kind: EventKind): string {
  switch (kind) {
    case "caution":
      return theme.color.warning;
    case "divergence":
      return theme.color.danger;
    case "fatal":
      return theme.color.danger;
    default:
      return theme.color.accent;
  }
}

/** Uppercase tracked label used for every small heading in the system. */
export const SmallCaps: React.FC<{
  theme: Theme;
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ theme, children, color, size, style }) => (
  <div
    style={{
      fontFamily: theme.font.family,
      fontSize: size ?? theme.font.size.micro,
      fontWeight: theme.font.weight.semibold,
      letterSpacing: theme.font.trackingLabel,
      textTransform: "uppercase",
      color: color ?? theme.color.textMuted,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Frosted card used for insets and overlays. */
export const Panel: React.FC<{
  theme: Theme;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ theme, children, style }) => (
  <div
    style={{
      background: theme.color.panel,
      border: `1px solid ${theme.color.panelBorder}`,
      borderRadius: theme.radius.md,
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      ...style,
    }}
  >
    {children}
  </div>
);

/** A subtle vignette so overlaid text always has contrast. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: `radial-gradient(120% 120% at 50% 45%, transparent 55%, rgba(4,7,10,${strength}) 100%)`,
    }}
  />
);
