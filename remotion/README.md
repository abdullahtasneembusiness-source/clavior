# Margin of error — Remotion component library

Reusable, **data-driven** motion-graphics components for the *Margin of error*
documentary channel. Every video reconstructs an incident spatially — the route,
the terrain, the timeline, and the point where things diverged from the plan.

This folder is a **self-contained project** with its own `package.json`. It does
not touch the app in the repo root. A new episode means **new data, not new
code**: you edit arrays of coordinates, times, and captions — the components do
the rest.

```
remotion/
├─ src/
│  ├─ components/     the 5 components (+ shared primitives)
│  ├─ lib/            geo projection, path sampling, procedural terrain
│  ├─ data/           example episode data (edit this / copy for new episodes)
│  ├─ types.ts        zod schemas = the data shape you edit + Studio form fields
│  ├─ theme.ts        one place for colours, type, motion
│  ├─ Root.tsx        registers each component as a composition
│  └─ index.ts        Remotion entry (registerRoot)
└─ public/stills/     images + depth maps for the depth panel
```

## The components

| Composition | Component | Data you edit | What it does |
|---|---|---|---|
| `RouteFlythrough` | `RouteFlythrough` | `points`, `waypoints` | Draws the route over procedural topo contours; camera tracks the head, timed waypoint callouts fire, finale pulls back to reveal the whole route. Live elevation inset. |
| `ElevationProfile` | `ElevationProfile` | `samples`, `markers` | Animated altitude cross-section with gradient fill, ascent/descent stats, passed markers. |
| `TimelineStrip` | `TimelineStrip` | `events` | Horizontal chronology; playhead sweeps, events light up as it passes, the point of divergence gets a full-height marker. |
| `DepthPanel` | `DepthDisplacementPanel` | `src`, `depthSrc` | Parallax on a still using its depth map (SVG `feDisplacementMap`) + Ken Burns. No WebGL. |
| `LowerThirds` | `LowerThirdCallout` | `items` | Timed broadcast lower-thirds; transparent overlay you layer on any shot. |

Each is registered as its own composition so shots render independently and get
assembled against the voiceover with `ffmpeg` (see below) — the production model
this channel uses.

## Run it

```bash
cd remotion
npm install          # first time only
npm run studio       # opens Remotion Studio — edit props live in the browser
```

In Studio, pick a composition and edit its props in the right-hand panel: change
the coordinate/time/caption arrays and the frame updates instantly. That panel is
generated from the zod schemas in `types.ts`.

### Rendering (including from phone / remote sessions)

Renders need a browser. This environment ships a compatible one; point Remotion at
the **headless-shell** binary (the full Chromium dropped the old headless mode):

```bash
BROWSER=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell

# a single still (fast sanity check)
npm run still -- src/index.ts RouteFlythrough out/route.png --frame=300 \
  --browser-executable=$BROWSER

# a full video
npm run render -- src/index.ts RouteFlythrough out/route.mp4 \
  --browser-executable=$BROWSER
```

Override any prop from the CLI with `--props='{"terrainSeed": 12}'`, or pass a
whole episode file with `--props=./episodes/blackreef.json`.

## Add a new episode (the whole workflow)

1. **Copy the example data.** Duplicate `src/data/blackReef.ts` →
   `src/data/<episode>.ts` and fill in the real values, verified against your
   primary sources:
   - `points`: `{ lat, lng, ele }` for the route (elevation optional but powers
     the profile and the flythrough inset).
   - `waypoints` / `events`: `at` is a fraction `0..1` along the route/timeline,
     so callouts stay anchored no matter how many points you have.
   - `kind: "divergence"` marks the moment the plan broke — it turns red and gets
     emphasis everywhere automatically.
2. **Point a composition at it.** Either change the `defaultProps` import in
   `Root.tsx`, or add new `<Composition>` entries for the episode. Set each
   composition's `durationInFrames` to match its slice of narration.
3. **Render each shot**, then assemble against the voiceover.

For the depth panel, drop `image.jpg` and its grayscale depth map
`image-depth.jpg` (white = near, black = far) into `public/stills/` and reference
them by relative path. The included `demo-ridge*.svg` are placeholder art —
replace with your Flux/GPT-Image stills and generated depth maps.

## Assembling with the voiceover (ffmpeg)

Render each shot to its own clip, then concatenate and lay the ElevenLabs track
over the top:

```bash
# after rendering intro.mp4, route.mp4, timeline.mp4, ... to out/
printf "file 'intro.mp4'\nfile 'route.mp4'\nfile 'timeline.mp4'\n" > out/list.txt
ffmpeg -f concat -safe 0 -i out/list.txt -c copy out/silent.mp4
ffmpeg -i out/silent.mp4 -i voiceover.mp3 -c:v copy -c:a aac -shortest out/episode.mp4
```

To sync precisely, size each shot's `durationInFrames` to the narration segment
it covers (frames = seconds × 30), so the concatenated video already lines up
with the voiceover — no manual nudging.

## Conventions worth knowing

- **30 fps, 1920×1080** everywhere (`Root.tsx`). Change once there.
- **`at` is always a fraction 0..1.** Distances/times are derived from the data.
- **Theming:** pass a partial `theme` prop to any component to override colours or
  type for a one-off, or edit `theme.ts` to change the channel look globally.
- **Determinism:** terrain is seeded (`terrainSeed`) — same seed, same mountains
  every render. Never use `Math.random()` in a component; Remotion needs every
  frame reproducible (use Remotion's `random()` if you need noise).
