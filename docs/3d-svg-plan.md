# SVG Sources — Implementation Plan

Status: implemented (2026-09-15). Quality and Alpha cutoff re-decode and re-apply whichever reading mode is active.

Scope: the Keychain Maker accepts SVG as a source. An SVG upload gets an explicit mode choice — **Rasterize** (render to pixels, quantize like a PNG) or **Exact colors** (use the SVG's declared fill/stroke colors). Everything after the palette (cleanup → contours → geometry → export) is untouched. No new dependencies; stays inside the client-only boundary (ADR-0001).

## Flow

- PNG: unchanged — decode → quantize.
- SVG: decode to the same 1024 px RGBA grid → choose **Rasterize** or **Exact colors** → palette → rest as today.
- The Source panel shows a Rasterize/Exact toggle for SVG so the modes can be compared without re-uploading. The decoded grid is cached in state; switching re-applies the palette instantly.

## Decisions

- Raster resolution stays `MAX_IMAGE_DIMENSION` (1024 px longest side), same as PNG.
- SVG is rendered through `<img src=blobURL>`; scripts never execute and the parsed XML is never inserted into the live DOM. No sanitizer needed.
- Exact mode uses declared paints only: `fill` unless `none`, plus `stroke` unless `none`, resolved through inline styles, presentation attributes, simple `<style>` rules (class/id/tag), and inheritance, normalized via the canvas `fillStyle` trick.
- Exact mode never runs median cut. Pixels are assigned to the nearest exact color. More than five paints keeps the five with the most assigned pixels and reassigns.
- If no extractable paints exist, Exact is disabled with a note. Gradients/patterns and unresolved CSS are approximated/flagged, never silently presented as exact.

## Files

New:

```
src/lib/3d/svg.ts                 decodeSvg, extractSvgPaints, intrinsic size parsing
src/components/3d/svg-mode.tsx    mode chooser (viewport empty state) + Source panel toggle
```

Changed:

```
src/lib/3d/png.ts → decode.ts     DecodedImage, shared helpers; keeps decodePng
src/lib/3d/quantize.ts            add assignToPalette(decoded, colors, alphaThreshold)
src/routes/_authenticated/3d.keychain.tsx  source state, dispatch, mode apply, copy
src/components/3d/image-dropzone.tsx       accept SVG, copy
src/components/3d/palette-panel.tsx        hide the color-count control in Exact mode
src/lib/3d/warnings.ts            "This PNG" → "This image"
CONTEXT.md                        Glossary: Source image, Rasterize, Exact fills
docs/3d-tools-plan.md             scope note (PNG-only → PNG + SVG)
```

## Milestones

### M0 — Accept SVG, rasterize

- Dropzone and the hidden replace input accept `image/svg+xml` / `.svg`; branch on MIME, falling back to the file extension when the OS gives an empty `file.type`.
- Rename `png.ts` → `decode.ts`, `DecodedPng` → `DecodedImage`; extract `countTransparentPixels` and the canvas draw/getImageData step for reuse.
- `svg.ts`: parse the text with `DOMParser`; size = leading number of `width`/`height`, else `viewBox`, else square. Clone the root, set explicit `width`/`height` for the raster grid, serialize to a blob URL, `await img.decode()`, draw to canvas, read back `ImageData`.
- Revoke the object URL in `finally`; map render failures (malformed XML, `SecurityError` from a tainted canvas) to a clear message.

Verify: viewBox-only SVG keeps its aspect ratio; `mm` and `%` dimensions work; transparent background counts as transparent; PNG path unchanged. LSP clean.

### M1 — Choice step and mode state

- `source` state gains `kind: "png" | "svg"`, `mode: "raster" | "exact" | null`, and `exactPaints`. SVG upload leaves `mode` null and does not quantize yet.
- While `mode` is null, the viewport empty state shows the chooser: two cards, each one line — Rasterize ("Quantize the rendered pixels, like a PNG") and Exact colors ("Use the N colors declared in the file", disabled when N = 0 with the reason).
- After choosing, apply the palette and show the Source panel toggle. Switching mode re-applies from the cached grid. The Palette panel hides its 1–5 count control in Exact mode (pass the effective count instead).
- Replacing the file resets to the chooser. PNG never shows a chooser or toggle.

Verify: chooser appears once per SVG upload; toggle switches models without decoding again; color-count state survives a raster ↔ exact round trip; PNG flow has no new UI.

### M2 — Exact paint extraction

- Collect `<style>` rule text first (simple selectors only: tag, `.class`, `#id`, `*`, comma lists; last declaration wins, specificity id > class > tag; ignore at-rules), then walk the element tree depth-first with inherited `fill`, `stroke`, and `color`.
- Resolution order per element: inline `style` → presentation attribute → matching rule → inherited. Resolve `currentColor` from `color`; skip `none`/`transparent`; normalize any CSS color (`#rgb`, `rgb()`, `hsl()`, names) by assigning to a canvas context's `fillStyle` and reading it back. Dedupe.
- Return `{ colors, gradientCount, unresolvedCount }` so the UI can caveat what was skipped.

Verify: Illustrator-style class selectors, Figma-style attributes, stroke-only line icons, named colors, `currentColor`, gradient-only files (Exact disabled), `<use>`/group inheritance.

### M3 — Exact palette

- `assignToPalette(decoded, colors)` in `quantize.ts`: nearest squared-RGB-distance per opaque pixel, `TRANSPARENT_INDEX` for transparent pixels, `pixelCount` per entry. Over five colors: rank by assigned count, keep five, reassign.
- `applyExact` builds `PaletteSwatch[]` the same way `applyQuantization` does (default thickness, fresh ids), so the rest of the pipeline is untouched.
- Show the caveat line when paints were skipped (gradients, unsupported selectors) and adjust the opaque-background warning wording.

Verify: exact swatch hexes equal the file's declared colors; >5 paints keeps the five most-used; gradient pixels land on the nearest extracted color; "% of image" totals look right.

### M4 — Copy, glossary, polish

- Copy: "Drop a PNG or SVG here", "PNG or SVG. Transparent pixels are ignored.", page subtitle, replace-file dialog.
- Glossary: Source image ("PNG" → "PNG or SVG"), add **Rasterize** and **Exact fills** entries; scope note in `docs/3d-tools-plan.md`.
- Empty/loading/error states for the chooser and both modes; disabled-card explanation.

Verify: full manual pass over both modes and PNG; `pnpm build:system`; no new dependencies; `three` only in the keychain route chunk.

## Risks

| Risk                                       | Fallback                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| SVG has no intrinsic size                  | `viewBox` ratio, else square                                             |
| External fonts/images missing in `<img>`   | Text renders with fallbacks; Rasterize shows the truth; note in copy     |
| Tainted canvas (`foreignObject`, external) | Catch `SecurityError`, clear error message                               |
| Selectors beyond class/id/tag              | Element falls back to inherited/default paint → `unresolvedCount` caveat |
| Exact looks wrong with gradients           | Caveat line + one-click toggle back to Rasterize                         |
| Fine vector detail lost at 1024 px         | Raise `MAX_IMAGE_DIMENSION` later (quantize cost grows with area)        |

## Non-goals

Geometry from vector paths, gradients as separate layers, SVG export, persistence or Convex changes, storefront changes, tests (repo rule).

## Acceptance

- Drop a 3-fill SVG: choose Exact → preview shows the three exact hexes; choose Rasterize → same layout through median cut.
- A stroke-only SVG produces a usable palette in both modes.
- A gradient-only SVG disables Exact with an explanation and still works in Rasterize.
- PNG behavior and all exports are unchanged.
- No new dependencies; no Convex, storefront, or worker diffs.
