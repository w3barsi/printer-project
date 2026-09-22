# Coverage Tracing — Implementation Plan

Status: proposed (2026-09-15).

Scope: smooth jagged Color Layer boundaries in the Keychain Maker's 3D model. `traceRegions` traces a continuous **coverage field** per color instead of a hard 0/1 mask, so `d3-contour`'s linear interpolation places boundary crossings between pixel centers. Everything before (quantize, speck merge) and after (simplify, mm scaling, extrusion, export) is untouched. Model only — the Source-panel preview raster, the base outline, and all UI stay as they are. No new dependencies; stays inside the client-only boundary (ADR-0001).

## Flow

Unchanged: PNG/SVG → grid → quantize → index grid → speck merge.

Changed step:

```
index grid → per color: mask (Uint8) → coverage field (Float32) → trace at 0.5 → simplify → mm polygons → extrude
```

## Decisions

- **Coverage field** = `0.5·mask + 0.5·boxBlur3x3(mask)`. The mix-back keeps isolated 1-px features above the 0.5 trace threshold (center peak ≈ 0.55 for a line, ≈ 0.67 diagonal) while still smoothing corners by ~1 px; a plain blur would drop hairlines below 0.5.
- **Shared boundaries stay coincident.** A linear blur preserves `sum(fields) = 1` across colors, so adjacent regions' 0.5-level-sets coincide exactly at field level — no seams, no overlaps. This is why coverage tracing beats post-hoc polygon smoothing (Chaikin/curve fitting), which smooths each region independently and pulls shared edges apart.
- **No new knobs.** One constant (`COVERAGE_MIX = 0.5`, 3×3 kernel). No panel, no per-layer option; revisit only if verification demands it.
- **Trace threshold stays 0.5. Keep `SIMPLIFY_TOLERANCE = 0.5`.** Douglas-Peucker at a half pixel is below what the model can show; only raise it (≤0.75) if the fixed geometry produces a vertex-count spike.
- **Buffers:** one reused `Uint8Array` mask and one `Float32Array` field (today's code already reuses a `Float64Array`, so memory goes down, not up). Direct 3×3 blur with zero padding outside the image; no separable temp pass.
- **Semantics unchanged:** alpha cutoff still classifies transparent pixels during quantize; speck merge, thin-color detection, warnings, outline base (already traces a float distance field), and attachment geometry operate exactly as today.

## Files

Changed:

```
src/lib/3d/contours.ts   add coverageField(mask, width, height, out, mix); traceRegions uses it
```

No other production file changes.

## Milestones

### M0 — Coverage helper

- Add `coverageField(mask: Uint8Array, width, height, out: Float32Array, mix): void` next to `traceRegions`: zero-padded 3×3 box blur, mixed back with the mask, written into `out`.
- Keep `traceField` and `simplifyRing` signatures as they are.

Verify: for complementary masks, outputs sum to 1 within float tolerance; a lone 1-px line peaks ≥ 0.5 at its center.

### M1 — traceRegions on coverage

- Build the per-color mask into a reused `Uint8Array` (1 where `indices[i] === colorIndex`), fill the field with `coverageField`, trace at `CONTOUR_THRESHOLD`.
- Delete the old binary-value fill; no other logic in the function changes.

Verify: same region set and hole structure as before on a mixed sample; LSP clean.

### M2 — Visual and structural verification

Manual pass (no tests, repo rule), viewport zoomed in:

- Samples: circle/ellipse, 45° stripe, wavy line, 1-px hairline, two flat colors meeting, three colors at a triple point, fine lettering, a 64 px source, at Standard and High quality.
- No stair-stepping on color boundaries or silhouette; no base-colored hairline between adjacent colors (top view, contrasting base color); hairlines and single-pixel dots still present; specks/thin-color warnings unchanged; attachment outline and export sizes unchanged.
- Read the triangle count off the Base panel before/after on one reference image: expect similar or slightly lower; investigate above ~1.5×.
- `pnpm build:system`; 3MF opens in a slicer with color groups intact, STL opens.

## Risks

| Risk                                    | Fallback                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| Hairlines lost to the blur              | Mix-back guarantees a >0.5 peak; verified in M2 with 1-px art                 |
| Square corners rounded by ~1 px         | ~0.06 mm at 60 mm/1024 px; acceptable — else lower mix or shrink the kernel   |
| Seams where colors meet                 | Linearity keeps fields complementary; simplify tolerance unchanged            |
| Vertex/triangle growth                  | Raise `SIMPLIFY_TOLERANCE` to 0.75 as the only lever                          |
| 2048 px memory/time                     | Float32 field + single reused buffers; blur is one pass per color             |
| Noisy/gradient art gets a wobblier edge | Speck merge and thresholds behave as before; coverage only moves the boundary |

## Non-goals

Source-panel preview antialiasing, UI controls for smoothing strength, changes to quantization/palette, base outline tracing, exports format, persistence, Convex/storefront changes, tests.

## Acceptance

- Zooming into a curved or diagonal Color Layer edge in the viewport shows a smooth line, not a pixel staircase.
- Adjacent colors meet with no visible gap; 1-px features survive.
- Triangle counts and import sizes stay in the same ballpark; rebuild stays well under a second.
- `pnpm build:system` passes from the workspace root, LSP is clean, no new dependencies, no Convex or storefront diffs.
