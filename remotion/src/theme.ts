/**
 * Margin of error — design tokens.
 *
 * One source of truth for the channel's look. Every component reads from here
 * so a palette or type change propagates to every video. Override per-video by
 * passing a partial `theme` prop where components accept one.
 */

export const theme = {
  /** Core palette — cold, cartographic, documentary. */
  color: {
    // Backgrounds
    bg: "#0B1015", // near-black slate
    bgElevated: "#121A22",
    panel: "rgba(18, 26, 34, 0.82)",
    panelBorder: "rgba(148, 176, 194, 0.18)",

    // Terrain / map ink
    contour: "rgba(126, 155, 173, 0.22)",
    contourIndex: "rgba(150, 182, 201, 0.42)", // every Nth (index) contour
    grid: "rgba(120, 150, 168, 0.10)",

    // Route
    routeTrail: "rgba(120, 150, 168, 0.35)", // planned/undrawn route
    route: "#FF6B35", // the taken route (signature orange)
    routeGlow: "rgba(255, 107, 53, 0.45)",
    routeHead: "#FFD9C7",

    // Semantic accents
    accent: "#4FB0C6", // cold cyan — data, axes, markers
    accentSoft: "rgba(79, 176, 198, 0.16)",
    warning: "#F4C453", // caution / status change
    danger: "#E5484D", // point of divergence, fatal event
    ok: "#63C08A",

    // Type
    text: "#EAF1F5",
    textMuted: "#9DB2BF",
    textFaint: "rgba(157, 178, 191, 0.55)",
  },

  /** Type scale. System stack keeps setup zero-config; swap for a loaded font. */
  font: {
    family:
      '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    // px sizes at 1080p; scale with composition height where needed.
    size: {
      micro: 20,
      caption: 26,
      label: 32,
      body: 38,
      title: 58,
      display: 84,
    },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    // Letter-spacing for the small-caps labels used throughout.
    trackingLabel: 3,
  },

  radius: { sm: 6, md: 12, lg: 20 },

  /** Motion. Frame-based durations assume the composition fps; treat as seconds×fps. */
  motion: {
    // Spring config reused for entrances.
    spring: { damping: 200, mass: 0.6, stiffness: 100 },
    // Standard fade/slide durations in seconds.
    fadeSec: 0.5,
  },
} as const;

export type Theme = typeof theme;

/** Shallow-merge a partial override onto the base theme (one level of nesting). */
export function mergeTheme(override?: DeepPartial<Theme>): Theme {
  if (!override) return theme;
  const out: any = { ...theme };
  for (const key of Object.keys(override) as (keyof Theme)[]) {
    out[key] = { ...(theme[key] as object), ...(override[key] as object) };
  }
  return out as Theme;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
