/**
 * Public surface of the component library. Import from here in your own
 * compositions and tooling:
 *
 *   import { RouteFlythrough, blackReefRoute } from "./library";
 */

export { RouteFlythrough } from "./components/RouteFlythrough";
export { ElevationProfile, ElevationInset } from "./components/ElevationProfile";
export { TimelineStrip } from "./components/TimelineStrip";
export { DepthDisplacementPanel } from "./components/DepthDisplacementPanel";
export { LowerThirdCallout } from "./components/LowerThirdCallout";

export { theme, mergeTheme } from "./theme";
export type { Theme, DeepPartial } from "./theme";

export * from "./types";
export * as geo from "./lib/geo";

export * from "./data/blackReef";
