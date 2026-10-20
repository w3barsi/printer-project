# Medal Maker — Implementation Plan

Status: implemented (2026-10-16). Offsets revised the same day: stroke bands beside the base that grow the object outward (see Decisions). Lanyard section added the same day (M9). Manual browser pass and the Bambu Studio export check remain (see Acceptance).

Scope: a second Tool in the 3D section, client-only inside `apps/system`. Upload a DXF, preview it, set a Base thickness, and grow the object sideways with any number of **Offsets** — stroke bands of a given width, each with its own thickness and color. Reuses the Keychain Maker's extrusion, Viewport, panels, and exporters. The DXF never leaves the browser (ADR-0001); one Tool → one Product (ADR-0002: the Medal).

## Flow

- DXF text (read in the browser) → `dxf-parser` → entity walk → rings (bulges/arcs/circles/ellipses/splines flattened, open segments chained) → Clipper even-odd assembly → **Profile** (`Polygon[]` in mm, centered) + parse warnings.
- Base = `extrudePolygons(Profile, baseThickness)`.
- Each Offset is a **band** (stroke): the area between the Profile grown by the offsets before it and grown by its own width → extruded at its own thickness from the bed plane, beside the base and bonded 0.4 mm laterally into the layer it grows from.
- Viewport preview → STL / 3MF export.

## Decisions

- Product is the **Medal**; Tool is the **Medal Maker**; route `/_authenticated/3d/medal`.
- Offsets are stroke bands beside the Base — a Photoshop-style stroke / Fusion-style sketch offset that grows the object outward in its own plane (every extrusion starts on the bed). Not filled plates, not stacked on top.
- Bands stack outward in list order (cumulative): a 2 mm offset then a 1 mm offset widens the medal by 3 mm a side. Each row has width (0.5–20 mm, step 0.1), thickness (0.6–5 mm, step 0.2), color, and remove. New rows cycle a six-color preset (silver, gold, copper, bronze, graphite, white). The list starts empty.
- A band bites `OFFSET_BOND_MM` (0.4 mm) into the layer it grows from so the extruded solids overlap volumetrically instead of only touching along coincident walls.
- The **Lanyard** is a filleted tab with a filleted-rectangle hole rooted by **two contact points**: the bottom edge spans from the left foot to the right foot and the tab extends outward from that chord. The feet set position, width, and orientation; a generous overlap merges the tab into the object — placed across a notch, it fills the area it covers. With the width locked the feet may sit off the object outline; the gap fill keeps the tab attached.
- Lanyard parameters: width, height, hole width, hole height, thickness, and a fillet for each of the tab's two top corners and each of the hole's four corners, with a per-corner lock (locked = frozen; richer lock rules deferred). The hole corners are sharp by default. Width is the distance between the contacts and can be typed in the panel — it resizes about the pair's midpoint. The tab renders and exports in the base color, named `Lanyard`.
- Width can be locked: the feet move as one piece — dragging translates the tab, so the span never changes, and the feet are free to leave the outline.
- `fillGaps` (default on) bridges the pocket between the chord and the object outline: each foot reaches toward the model at its nearest outline point, the smaller of the two arc remainders wins so a bridging tab never swallows the body on the far side, and sub-millimetre slivers are ignored.
- One new geometry dependency does both assembly and offsetting: `clipper-lib`.
  - Assembly: all rings through `Clipper.Execute(ctUnion, PolyTree, pftEvenOdd, pftEvenOdd)` — winding-independent, dissolves overlaps and self-intersections, and the PolyTree's hole flags give `Polygon { outer, holes }` directly (islands become separate outers).
  - Offsetting: `ClipperOffset.AddPaths(..., jtRound, etClosedPolygon)` + `Execute(solution, delta)`; a band is one outward and one inward pass combined with `Clipper.Execute(ctDifference, ...)`.
  - Coordinates are scaled to integers at 1e4 per mm (0.1 µm) and scaled back.
- Parsing is `dxf-parser` 1.1.2; fields verified against the shipped typings: LWPOLYLINE/POLYLINE `vertices[].bulge` + `shape`; ARC `center/radius/startAngle/endAngle` (degrees); CIRCLE `center/radius`; ELLIPSE `center/majorAxisEndPoint/axisRatio/startAngle/endAngle` (radians; equal start/end ⇒ full); SPLINE `controlPoints/knotValues/degreeOfSplineCurve/closed`.
- Curves are sagitta-sampled at one shared constant (~0.05 mm). Splines are flattened with de Boor (knots honored; dxf-parser does not surface DXF weights, so rational splines are evaluated by their control points); fit-point-only or malformed splines are skipped with one warning.
- Units: `dxf.header["$INSUNITS"]` covers in/mm/cm/m; otherwise assume mm and say so in the Source panel. A "Fit to size" switch scales the Profile so its longest side equals a target (20–150 mm, default 60); off = actual size. The readout shows the object size, bands included.
- Ignored with a warning (v1): INSERT/blocks, TEXT/MTEXT, HATCH, DIMENSION, 3D polylines and polygon meshes, and any other entity type (grouped, one warning line per type).
- Base thickness defaults to 2 mm (0.6–5, step 0.2); base color defaults to the neutral silver already used by `DEFAULT_BASE_COLOR`.
- Exporters generalize from `KeychainGeometry` to a shared `ExtrudedModel = { title, base, parts: [{ geometry, color, name }] }`: 3MF writes one colored object per part (`Base`, `Offset 1`…), STL merges the geometry. Medal files are `medal-yyMMdd-HHmm.3mf | .stl`.

## Files

New:

```
apps/system/src/lib/3d/dxf/parse.ts       DXF text → rings → Clipper assembly → Profile + warnings
apps/system/src/lib/3d/dxf/curves.ts      bulge/arc/circle/ellipse sampling, de Boor splines, chaining
apps/system/src/lib/3d/dxf/offset.ts      clipper-lib wrappers: assemble, clean, offset, band, difference
apps/system/src/lib/3d/dxf/lanyard.ts     contact feet, chord frame, filleted tab ring, filleted-rectangle hole
apps/system/src/lib/3d/dxf/design.ts      defaults, limits, offset color presets, lanyard defaults
apps/system/src/lib/3d/dxf/geometry.ts    buildMedal(profile, thickness, offsets, lanyard) → MedalGeometry
apps/system/src/lib/3d/dxf/warnings.ts    parse issues → ModelWarning[]
apps/system/src/lib/3d/extrude.ts         shared extrudePolygons/polygonToShape/weld (moved out of geometry.ts)
apps/system/src/components/3d/number-input.tsx         draft-aware number input (lifted from offset-panel)
apps/system/src/components/3d/medal/medal-scene.tsx    R3F meshes: base + offsets + lanyard, drag-to-place
apps/system/src/components/3d/medal/source-panel.tsx   file, units note, fit-to-size, readout
apps/system/src/components/3d/medal/base-panel.tsx     base thickness + color
apps/system/src/components/3d/medal/offset-panel.tsx   offset list UI
apps/system/src/components/3d/medal/lanyard-panel.tsx  lanyard parameters + corner fillets
apps/system/src/routes/_authenticated/3d.medal.tsx     page shell + state
docs/3d-medal-plan.md                                  this file
```

Changed:

```
apps/system/package.json                   + dxf-parser, clipper-lib
apps/system/src/lib/3d/geometry.ts         import the extrusion helpers from extrude.ts (no behavior change)
apps/system/src/lib/3d/export/stl.ts       buildStlBlob(ExtrudedModel)
apps/system/src/lib/3d/export/3mf.ts       build3mfBlob(ExtrudedModel): per-part names, model title
apps/system/src/routes/_authenticated/3d.keychain.tsx  adapter: build an ExtrudedModel for export
apps/system/src/components/3d/image-dropzone.tsx → file-dropzone.tsx  accept/labels become props
apps/system/src/lib/3d/tools.ts            + Medal Maker entry; widen the `to` union
apps/system/src/components/sidebar/group-nav-main.tsx  match /_authenticated/3d/medal
CONTEXT.md                                 glossary: Medal, Profile, Offset; generalize Base
README.md                                  Todos: Medal Maker milestones
```

## Milestones

### M0 — Scaffolding

- `tools.ts`: `{ id: "medal-maker", name: "Medal Maker", description: "Turn a DXF outline into a layered, 3D-printable medal.", icon: MedalIcon, product: "Medal", to: "/3d/medal" }` — the launcher grid is registry-driven, so `3d.index.tsx` needs no change.
- `3d.medal.tsx` shell: crumbs `3D / Medal Maker`, head `Medal Maker | DG`, dropzone empty state.
- Generalize the dropzone to props (`accept`, labels) with the current keychain values as defaults; accept `.dxf` for the medal (extension-first detection, like the keychain's `sourceKind`).
- Sidebar: match `/_authenticated/3d/medal`.

Verify: card and "Makes: Medal" badge appear, nav active, crumbs correct, keychain dropzone unchanged, LSP clean.

### M1 — Dependency spike

- Install `dxf-parser` and `clipper-lib`; confirm Vite/SSR builds accept both (CJS/UMD interop).
- Hardcoded sample: rounded-rect ring with two holes → Clipper assembly → offset +2 mm → base and band both extruded from the bed plane and rendered through the existing `Viewport`.

Verify: `pnpm build:system`; the two new deps load only in the medal route chunk; render shows two stacked plates.

### M2 — DXF → Profile

- `parse.ts`: text → `dxf-parser` → entity walk (LINE, LWPOLYLINE, POLYLINE, CIRCLE first) → ring extraction → unit scaling → centering → Clipper even-odd assembly → `Polygon[]`.
- Warnings: unsupported entity types (grouped), empty result, binary-DXF sentinel.
- Source panel: file name, mm dimensions, unit note, replace button; parse errors map to the existing error state pattern.

Verify: hand-crafted DXFs — rect, rect + hole, two disjoint shapes, island inside a hole, CW and CCW winding — all produce the same Profile; an inches file scales ×25.4.

### M3 — Curves and chaining

- `curves.ts`: bulge segments (LWPOLYLINE/POLYLINE), ARC (degrees, CCW sweep; `angleLength` as a cross-check), CIRCLE, ELLIPSE (parametric, radians) sampled at the shared sagitta constant.
- Chaining: open segments matched by endpoint proximity — tolerance ≈ 0.1% of the drawing diagonal, clamped to [0.002, 0.05] mm; greedy walk; closed rings bypass chaining; dead ends become warnings, not crashes.
- `is3dPolyline` / polygon-mesh flags: skip with a warning.

Verify: a bulge-rounded square matches its radius; an exploded outline (all LINE entities) closes into one Profile; a genuinely open contour warns and the rest still renders.

### M4 — Splines

- de Boor over `knotValues` + `degreeOfSplineCurve`, sampled at the shared sagitta; `closed` wraps.
- No control points, or knots inconsistent with degree/point count: skip + warning.

Verify: a degree-3 CAD spline tracks its control net; a closed spline seals; a fit-points-only file warns instead of drawing garbage.

### M5 — Base

- Base thickness slider (`SliderRow`, 0.6–5, step 0.2) + color (`ColorPickerPopover`); rebuild via `useMemo`; camera refit keyed like the keychain's `modelVersion`.
- "Fit to size" switch + longest-side slider (20–150 mm, default off = actual size); readout `W × H mm` + triangle count.

Verify: thickness edits change the plate; a unitless file shows the "assumed mm" note; Fit-to-size rescales the model; refit happens only on footprint changes.

### M6 — Offsets

- `offset.ts`: `offsetPolygons(polygons, deltaMm)`, `differencePolygons`, `bandPolygons(polygons, innerMm, outerMm)`, `cleanPolygons` (delta 0); integer scale 1e4; round joins.
- Offset panel: rows (width, thickness, color, remove) + "Add offset"; defaults and preset cycle in `design.ts`; empty-state copy when the list is empty.
- `geometry.ts`: `buildMedal(...)` extrudes the base and each band from the bed plane, cumulative widths with a 0.4 mm lateral bond into the layer beneath; the footprint grows with the bands.

Verify: a 2 mm band makes the object 4 mm wider; a second 1 mm band adds 2 mm more (cumulative); every band starts at the same z as the base; a hole in the profile gets a matching ring that reaches into the hole.

### M7 — Export

- Generalize `stl.ts` / `3mf.ts` to `ExtrudedModel`; the keychain route passes an adapter with its palette colors; the medal exports `Base` + `Offset N` objects, title "Medal".
- `ExportPanel` and its copy are reused unchanged.

Verify: user opens a medal 3MF in Bambu Studio — separate colored objects, mm, no mandatory repair; STL opens; keychain 3MF/STL unchanged.

### M8 — Polish and docs

- Copy pass, empty/loading/error states; CONTEXT.md glossary entries; README todos mirroring milestones.
- Shared `Viewport`: Fusion-style bed grid (5 mm cells, 25 mm majors, red X / green Z axes) behind an in-canvas toolbar toggle; defaults on, and the camera fit ignores it (`userData.skipFit`).
- Full manual pass over every Verify line; `pnpm build:system`; chunk check.

Verify: LSP clean; no Convex/storefront/worker diffs; `three`, `dxf-parser`, `clipper-lib` only in 3D route chunks.

### M9 — Lanyard section

- `lanyard.ts`: contact feet (perimeter parameters) with default spacing, the chord frame (origin at the left foot, outward by the outline normals), a filleted tab ring, a filleted hole; cut with `differencePolygons`. Rooted with the same 0.4 mm bond as bands, extruded from the bed plane with its own thickness.
- `MedalLanyardPanel`: width, height, hole width, hole height, thickness sliders (typed or dragged); fillet inputs for the two tab-top corners and the four hole corners (a 2×3 grid) with lock-freeze; width lock and gap-fill switches; drag-to-place hint.
- Drag: the tab is grabbed anywhere on or just around it (a padded hit area) and moves as one piece; with the width unlocked a contact handle follows the pointer along the outline live to aim and resize it. Orbit controls are suspended while dragging and the pair commits on release; the feet keep a 2 mm minimum separation, and with the width locked handle drags also translate, span and angle kept, feet free to leave the outline. Only the left button drags; other buttons stay camera gestures.
- Lock to X axis (needs Lock width, and the panel says so): the contact chord is always level — flat and aligned with the X axis. Switching it on settles the current placement level; a locked pair keeps that level as it moves. While dragging, a centre guide marks the model's centre and lights up when the tab's hole centre is aligned with it.
- Click to inspect and edit: clicking the tab selects it and toggles the edge overlay — tab boundary and hole (blue), the contact chord (amber), and the object silhouette (grey). The lines ignore depth so buried edges stay visible while positioning; real clicks only (orbit drags are ignored).
- `fillGaps`: bridges the pocket between the chord and the outline — including when the feet hang off the model — bonded 0.4 mm into the object like the tab root.

Verify: a 14×10 tab roots on the top edge with filleted outer corners and an 8×4 through-hole whose four corners are independently filleted (sharp by default); dragging the tab moves it as one piece and dragging a foot re-aims and resizes it along the chord when unlocked; typing a width resizes it about its centre; with the width locked the span holds even when the feet leave the outline and the gap under it fills; with the X-axis lock the chord stays level (a centre guide lights up when the hole centre is aligned); over a notch, the gap fills when enabled and stays open when disabled.

## Risks

| Risk                                               | Fallback                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `dxf-parser` age / field gaps                      | pinned 1.1.2 (fields verified); worst case a small ASCII DXF reader for the subset           |
| `clipper-lib` CJS/UMD interop with Vite            | `@doodle3d/clipper-js` wrapper, or `js-angusj-clipper` (WASM)                                |
| Splines: fit-points-only, degree > 3, ragged knots | skip entity + warning; control-polyline approximation only if users hit it                   |
| OCS / extrusion-direction edge cases (negative Z)  | warn and skip those entities; standard OCS only in v1                                        |
| Coincident or zero-area rings upsetting Clipper    | `cleanPolygons` (delta 0) first; drop zero-area rings                                        |
| Large DXFs stall the main thread                   | v1 stays synchronous; decimate with the existing simplify-js or move parse to a Worker later |

## Non-goals

- No Keychain-style attachment variants (hook, bookmark) on the Medal; no text engraving, no DXF writing, no blocks/INSERTs, no DXF-layer map, no 2D canvas overlay, no per-offset thin-feature checks.
- No persistence, Convex, storefront, or worker changes (ADR-0001). No tests (repo rule).
- Corner-lock semantics beyond freezing a fillet are deferred until the details land.

## Acceptance

- Drop a mm DXF (outer profile + holes + rounded corners): preview matches, readout in mm.
- Base thickness slider changes the plate; unitless file says "assumed mm"; inches scale correctly; Fit-to-size rescales.
- Add a 3 mm offset (1 mm thick) → a 3 mm-wide step beside the base, in the same plane; add a second 2 mm offset → it stacks outward from the first, and the readout grows accordingly.
- Drag the lanyard's two contact feet around the outline → the tab bridges them, aims along the chord, stays rooted (bonds in), fills what it covers over a notch, and exports as a `Lanyard` object next to `Base` and `Offset N`. With Lock width on, dragging moves the tab as one piece — the span holds, the feet can hang off the outline, and the gap under it fills; clicking the tab shows its edges over the model.
- 3MF opens in Bambu Studio as `Base` + `Offset N` colored parts in mm; STL opens; keychain exports unchanged.
- No Convex/storefront/worker diffs; `three` + `dxf-parser` + `clipper-lib` absent from non-3D chunks.

## Deferred backlog

Ribbon hole (reuse the keychain's Attachment), inset (inward) offsets, DXF layers as one-click offsets, INSERT/block expansion, fit-point splines, 2D outline overlay, multi-file sources, printability guardrails for offsets, saving/sharing designs.
