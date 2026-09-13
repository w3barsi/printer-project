# 3D Tools — Implementation Plan

Status: implemented through M8 (2026-09-13).

v1: **Keychain Maker**, client-only, inside `apps/system`. Design language lives in `CONTEXT.md`; decisions in `docs/adr/0001-3d-tools-client-only.md` and `docs/adr/0002-product-is-a-scoping-boundary.md`.

## Non-goals (v1)

- No persistence, no Convex changes, no storefront changes.
- No silhouette base, palette regenerate, manual region editing, stroke border, facedown mode, front/back/mirror, image rotation/adjustments, separate attachment color, multiple attachments, print/send.
- No tests (repo rule). Verification is typecheck/LSP, builds, and manual checks.

## Architecture

- Routes: `/_authenticated/3d` (launcher) and `/_authenticated/3d/keychain` (tool).
- All model state lives in the keychain route (`useReducer`); heavy derivation lives in pure functions under `src/lib/3d/`.
- Pipeline: PNG → RGBA grid → quantize (median-cut) → per-color masks → speck merge → contours → simplify → mm polygons → 2D booleans → `THREE.Shape` + `ExtrudeGeometry` → viewport + exporters.
- Units are millimetres end to end, including the 3MF `unit="millimeter"`.
- `three` is imported only by the keychain route chain; the canvas renders inside `<ClientOnly>` (present in the installed router).

## Dependencies (`apps/system`)

| Package                                  | Use                        |
| ---------------------------------------- | -------------------------- |
| `three`, `@react-three/fiber`            | viewport, extrusion, STL   |
| `@types/three` (dev)                     | three typings              |
| `martinez-polygon-clipping`              | 2D union/difference        |
| `d3-contour` + `@types/d3-contour` (dev) | mask → contours with holes |
| `simplify-js`                            | polygon decimation         |

Already present: `jszip` (3MF zip), `file-saver` (download), `react-dropzone` (upload). Known-good versions as of Sep 2026: `three` 0.186, R3F 9.7, `@types/three` 0.186, martinez 0.8.1 — verify at install.

## Files

```
src/lib/3d/tools.ts          static tool registry
src/lib/3d/png.ts            decode, downscale, alpha handling
src/lib/3d/quantize.ts       median-cut palette + index grid
src/lib/3d/cleanup.ts        speck merge (connected components)
src/lib/3d/contours.ts       d3-contour → simplify → mm polygons
src/lib/3d/shapes.ts         rounded rect, circles, hook, 2D booleans, drag constraints
src/lib/3d/geometry.ts       THREE.Shape/ExtrudeGeometry per part, weld, center
src/lib/3d/warnings.ts       printability + guardrail checks
src/lib/3d/export/3mf.ts     custom 3MF writer (m:colorgroup)
src/lib/3d/export/stl.ts     binary STL from combined geometry
src/routes/_authenticated/3d.index.tsx     launcher (card grid)
src/routes/_authenticated/3d.keychain.tsx  page shell + state
src/components/3d/viewport.tsx             R3F canvas, lights, controls, drag
src/components/3d/workspace.tsx            viewport + panel layout
src/components/3d/panels/*.tsx             source, palette, base, attachment, export
src/components/3d/image-dropzone.tsx
src/components/3d/warnings.tsx
src/components/sidebar/group-nav-main.tsx  add "3D" item
```

## Milestones

### M0 — Scaffolding

- `tools.ts` registry: `{ id, name, description, icon, product, to }`; one entry (Keychain Maker → Keychain).
- `3d.index.tsx`: card grid using the `drive.index.tsx` idiom; card shows name, description, "Makes: Keychain", and links to the tool.
- `3d.keychain.tsx`: route shell + empty state; loader crumbs `3D / Keychain Maker`.
- Sidebar "3D" item (`CuboidIcon`, fallback `BoxIcon`), active for any path under `/3d`.

Verify: nav active states, breadcrumbs, launcher → tool navigation, LSP clean.

### M1 — Dependency spike

- Install deps. `OrbitControls` comes from `three/addons` through R3F `extend`; drei was dropped to keep the dependency surface and SSR import graph small.
- Hardcoded rounded-rect-with-ring-hole prism rendered in a `ClientOnly` canvas with lighting and fit-to-view.

Verify: page renders without SSR errors, orbit works, `pnpm build:system` shows `three` only in the keychain route chunk.

### M2 — Image → palette

- `png.ts`: `createImageBitmap` → canvas → `ImageData`; downscale to ≤1024 px longest side; alpha < 128 = transparent; report opaque-background flag.
- `quantize.ts`: median cut over opaque pixels, nearest-color assignment → palette + index grid; deterministic.
- UI: dropzone, color-count selector (1–5), swatch list, flat 2D quantized preview so quality is judged before 3D.
- Changing count: re-quantize and reset swatch colors and thicknesses (settled).

Verify: transparent-logo PNG, opaque photo, high-res image, image with holes.

### M3 — Palette → geometry

- `cleanup.ts`: 4-connected components; merge islands under 1 mm² into dominant neighbor; return speck count.
- `contours.ts`: d3-contour per index grid → rings; normalize winding; simplify (~0.5 px tolerance); scale px → mm.
- `geometry.ts`: `THREE.Shape` with holes → `ExtrudeGeometry`; weld with `mergeVertices`; static base under layers with 0.1 mm embed.
- Viewport renders real colors.

Verify: triangle counts stay low, holes survive, no martinez errors on noisy masks, 3D top view matches the 2D preview.

### M4 — Base controls

- Margin 2 mm (0–5), thickness 2 mm (0.6–5, step 0.2), base color, corner radius auto (`min(3, ¼ short edge)`) with 0–20 override, longest side 60 mm (20–150, aspect locked).

Verify: dimension readout matches inputs; base is convex for the hook.

### M5 — Attachment

- Type select (Hook/Hole/Bookmark), default Hook, removable. Size slider: hole ⌀ 4.2 mm (2.5–8); hook inner diameter = size, wall 1.6 mm.
- Hook: outer circle centered on a perimeter point, unioned with the base; inner circle subtracted; slides along the perimeter; default top-center.
- Hole/Bookmark: circle subtracted from the base **and every overlapping color polygon**; free drag; ≥1.6 mm rim via point-in-polygon + point-to-edge distance; invalid positions rejected with visual feedback; defaults top-center / bottom-center.

Verify: rim rule holds, holes cut color layers, hook stays attached around corners.

### M6 — Guardrails

- `warnings.ts`: opening-based thin-feature check per color (<0.8 mm), opaque-PNG notice, filament count vs an AMS-slots input (default 4), speck count text. All non-blocking.

Verify: each warning triggers only on crafted samples.

### M7 — Export

- `3mf.ts`: custom XML; `m:colorgroup` for used colors; one object per part (base + colors); millimeter units; deduped vertices, consistent winding; `jszip` → Blob.
- `stl.ts`: binary STL of the combined geometry, colors dropped.
- Export panel: `keychain-<yyMMdd-HHmm>.3mf` primary; STL secondary with a "no colors" note.

Verify (user + Bambu Studio): parts import, color dialog auto-matches, dimensions are mm, no mandatory repair; STL opens.

### M8 — Polish

- Empty/loading/error states, glossary-consistent copy, panel scrolling and small-screen behavior, triangle/size readout, final manual pass.

## Risks and fallbacks

| Risk                                    | Fallback                                           |
| --------------------------------------- | -------------------------------------------------- |
| R3F + React 19/compiler friction        | raw three canvas instead of R3F                    |
| d3-contour decomposition on noisy masks | raise speck threshold, simplify before contouring  |
| martinez failure on degenerate rings    | try/catch, nudge/skip the color, fill fallback     |
| Bambu color-parsing behavior changes    | generic parts still import; colors assign manually |
| Main-thread quantization >100 ms        | move M2/M3 into a Worker later, not now            |

## End-to-end acceptance

- 3-color transparent PNG → preview matches expectation.
- Changing color count resets palette and thicknesses.
- Base/thickness/attachment edits rebuild in well under a second.
- Opaque PNG, thin features, and >4 filaments each warn once, non-blocking.
- Exported 3MF opens in Bambu Studio as base + color parts in mm; STL opens.
- No Convex or storefront diff; `three` absent from all chunks except the keychain route.

## Deferred backlog

Outline base (needs offsetting), palette regenerate variants, manual region editing, stroke border, facedown mode, front/back/mirror, rotation, image adjustments, separate attachment color, multiple attachments, saving/sharing designs, sending to a printer.
