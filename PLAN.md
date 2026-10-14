# 3D Pricing — Implementation Plan

A self-contained "3D Pricing" tool for the system app: a PesoPrint-style 3D print cost calculator where every price can be **saved as an item with a history**, plus **user-created presets** for printers and filaments.

No seeding, no hardcoded brands, no links to job orders, inventory, or customers. This module only does pricing.

---

## Rules for the implementing agent

- Do NOT create, modify, or plan tests. No test files, deps, config, or scripts.
- Do NOT run lint commands, `pnpm check`, `pnpm dev`, or `convex dev`. Rely on the LSP for errors.
- Never edit `convex/_generated/` or `routeTree.gen.ts` (it regenerates).
- Do NOT add new dependencies — everything needed (react-hook-form, zod, coss UI, lucide) already exists.
- Follow the repo's actual formatting (sibling files are the source of truth: 2-space indent, semicolons, double quotes) plus `AGENTS.md` naming/style rules: lucide icons with `Icon` suffix, `function ComponentName()`, no hover translate/lift motion.
- Load the **coss** skill before writing any UI. Copy patterns from the reference files listed in each step.
- Convex conventions: object-form `query/mutation({ args, returns, handler })`, `authedMutation`/`authedQuery` + `requireAppUser` from `./auth`, explicit `returns` validators, index naming `by_<field>_and_<field>`.

## Decisions already made

- **Self-contained domain**: schema spread from `schemas/printPricing.tsx`, functions in `convex/printPricing/`. Only shared thing is auth (`createdBy: v.id("users")`).
- **Item + history**: `printPricingItems` is the stable identity; each Save inserts an append-only `printPricingCalculations` row. Past calculations are never edited in place.
- **Snapshot everything**: each calculation stores the exact inputs AND the computed ₱ breakdown. Preset edits/deletes never change old prices. Dangling `presetId` values are harmless — render from the snapshot.
- **Server recomputes the price**: the client never submits computed totals, only inputs. The same pure math module is used for the live preview and on the server.
- **Presets are user-created**: printer presets (watts / price / lifespan) and filament presets (₱ per kg). Electricity rate is a per-calculation input, not a preset — it's a utility rate, not a machine property.
- **Deleting an item cascades** to delete its calculation rows. Deleting a preset does not touch history.
- **Append-only history**: `updatedAt` changes only on item edits and new calculations, not on deleting a calculation.

## Out of scope

PDF export, client-facing quotes, linking calculations to job orders, seeded preset data, unit conversion beyond g/kg and ₱, currencies other than PHP, role-gating beyond "any signed-in employee".

---

## Data model

### `packages/backend/convex/schemas/printPricing.tsx` (new)

```tsx
import { defineTable } from "convex/server";
import { v } from "convex/values";

// One material line: a filament consumed by the print.
export const printFilamentUsage = v.object({
  presetId: v.optional(v.id("printPricingFilamentPresets")),
  name: v.string(),
  weightGrams: v.number(),
  costPerKg: v.number(),
});

// The calculator's full input payload (also used as the save mutation args).
export const printPricingInput = v.object({
  filaments: v.array(printFilamentUsage),
  printTimeHours: v.number(),
  printer: v.optional(
    v.object({
      presetId: v.optional(v.id("printPricingPrinterPresets")),
      name: v.optional(v.string()),
      powerWatts: v.number(),
      price: v.number(),
      lifespanHours: v.number(),
      electricityRatePerKwh: v.number(),
    }),
  ),
  labor: v.optional(
    v.object({
      ratePerHour: v.number(),
      hours: v.number(),
    }),
  ),
  business: v.optional(
    v.object({
      failureRatePercent: v.number(),
      markupPercent: v.number(),
    }),
  ),
});

// The computed price, frozen at save time.
export const printPriceBreakdown = v.object({
  material: v.number(),
  electricity: v.number(),
  printerWear: v.number(),
  labor: v.number(),
  subtotal: v.number(),
  failure: v.number(),
  profit: v.number(),
  total: v.number(),
});

export const printPricingSchema = {
  // The "item" — stable identity, e.g. "Bracket v2"
  printPricingItems: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    // denormalized so the list can show the current price cheaply
    latestTotal: v.optional(v.number()),
    latestCalculatedAt: v.optional(v.number()),
  })
    .index("by_normalized_name", ["normalizedName"])
    .index("by_updatedAt", ["updatedAt"])
    .searchIndex("search_name", { searchField: "name" }),

  printPricingPrinterPresets: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    powerWatts: v.number(),
    price: v.number(),
    lifespanHours: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_normalized_name", ["normalizedName"])
    .searchIndex("search_name", { searchField: "name" }),

  printPricingFilamentPresets: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    costPerKg: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_normalized_name", ["normalizedName"])
    .searchIndex("search_name", { searchField: "name" }),

  // One row per save — the pricing history.
  printPricingCalculations: defineTable({
    itemId: v.id("printPricingItems"),

    // inputs (snapshot of the form) — reused from the shared input validator
    ...printPricingInput.fields,

    // outputs (computed server-side by the save mutation)
    price: printPriceBreakdown,

    note: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_itemId", ["itemId"]),
};
```

Spread it in `packages/backend/convex/schema.ts` next to `inventorySchema` / `driveSchema`:

```ts
import { printPricingSchema } from "./schemas/printPricing";

export default defineSchema({
  // ...
  ...printPricingSchema,
  // ...
});
```

### Formula reference (PesoPrint's math)

```
material     = Σ (weightGrams / 1000) × costPerKg
electricity  = printer ? (powerWatts / 1000) × printTimeHours × electricityRatePerKwh : 0
printerWear  = printer ? (price / lifespanHours) × printTimeHours : 0
labor        = labor ? ratePerHour × hours : 0
subtotal     = material + electricity + printerWear + labor
failure      = business ? subtotal × failureRatePercent / 100 : 0
profit       = business ? (subtotal + failure) × markupPercent / 100 : 0
total        = subtotal + failure + profit
```

Store exact floats; round to 2 decimals only for display.

---

## Shared pure library

### `packages/backend/convex/printPricing/lib.ts` (new)

Pure module — no `convex/server` import, no runtime import of the schema module (type-only imports). Imported by both Convex functions and the frontend.

```ts
import type { Infer } from "convex/values";
import type {
  printFilamentUsage,
  printPricingInput,
  printPriceBreakdown,
} from "../schemas/printPricing";

export type PrintFilamentUsage = Infer<typeof printFilamentUsage>;
export type PrintPricingInput = Infer<typeof printPricingInput>;
export type PrintPriceBreakdown = Infer<typeof printPriceBreakdown>;

// math
export function computePriceBreakdown(input: PrintPricingInput): PrintPriceBreakdown;
export function roundMoney(value: number): number; // 2dp, display only
export function formatPeso(value: number): string; // Intl PHP, matches formatCurrency in jo

// normalization + validation (own copies — keep this module isolated from inventoryHelpers)
export function normalizeName(
  name: string,
  label: string,
): { name: string; normalizedName: string };
export function validateNonNegativeNumber(value: number, label: string): number;
export function validatePositiveNumber(value: number, label: string): number; // > 0
export function validatePercentage(value: number, label: string): number; // 0–100
export function validatePrintPricingInput(input: PrintPricingInput): PrintPricingInput;
export function validateNote(note?: string): string | undefined; // trim, max 500
```

Validation rules enforced by `validatePrintPricingInput` (server) and mirrored in zod (client):

- `filaments`: 1–20 rows; name trimmed non-empty ≤ 120 chars; `weightGrams > 0`; `costPerKg >= 0`.
- `printTimeHours >= 0`.
- `printer`: `powerWatts > 0`, `price >= 0`, `lifespanHours > 0`, `electricityRatePerKwh >= 0`, optional name ≤ 120.
- `labor`: `ratePerHour >= 0`, `hours >= 0`.
- `business`: `failureRatePercent` 0–100, `markupPercent >= 0`.
- All numbers must be finite (`Number.isFinite`).

### `packages/backend/package.json` (edit)

Add to `exports`:

```json
"./printPricing": "./convex/printPricing/lib.ts"
```

Frontend imports: `import { computePriceBreakdown, formatPeso, roundMoney } from "@dg/backend/printPricing";`

---

## Convex functions

Reference for style: `packages/backend/convex/inventory.ts` (enrich with `createdByName` via `ctx.db.get("users", ...)`, fallback `"Former user"`, `validatePaginationSize` 1–50, search options `.take(20)`).

### `packages/backend/convex/printPricing/items.ts`

| Function      | Args                       | Returns                                   | Behavior                                                                                                          |
| ------------- | -------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `createItem`  | `{ name, notes? }`         | `Id<"printPricingItems">`                 | `normalizeName`, reject duplicate via `by_normalized_name`, set `createdAt`/`updatedAt`                           |
| `updateItem`  | `{ itemId, name, notes? }` | `null`                                    | duplicate check excluding self; reject unchanged; bump `updatedAt`                                                |
| `deleteItem`  | `{ itemId }`               | `null`                                    | **cascade**: loop `by_itemId` in `.take(64)` batches until empty, deleting each calculation, then delete the item |
| `listItems`   | `{ paginationOpts }`       | `paginationResultValidator(itemListItem)` | `by_updatedAt` `.order("desc")`; enrich `createdByName`                                                           |
| `getItem`     | `{ itemId }`               | item \| `null`                            | enriched with `createdByName`                                                                                     |
| `searchItems` | `{ query }`                | `{ _id, name, latestTotal }[]`            | use `search_name` when query non-empty, else `by_updatedAt` desc; `.take(20)`                                     |

Note on cascade: the simple bounded loop is fine for this domain (histories are small). If the loop could exceed transaction limits some day, move it to a scheduled internal mutation — not now.

### `packages/backend/convex/printPricing/calculations.ts`

| Function            | Args                                             | Returns                              | Behavior                                                                                                                                                             |
| ------------------- | ------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createCalculation` | `{ itemId, note?, ...printPricingInput.fields }` | `Id<"printPricingCalculations">`     | validate via `validatePrintPricingInput`, **recompute** `computePriceBreakdown` server-side, insert row, patch item `{ latestTotal, latestCalculatedAt, updatedAt }` |
| `listByItem`        | `{ itemId }`                                     | calc list (enriched `createdByName`) | `by_itemId` `.order("desc")` `.take(50)`                                                                                                                             |
| `deleteCalculation` | `{ calculationId }`                              | `null`                               | delete row, re-derive item's latest from remaining (`by_itemId` desc `.take(1)`; patch `latestTotal`/`latestCalculatedAt` to `undefined` when none left)             |

### `packages/backend/convex/printPricing/presets.ts`

| Function               | Args                                                   | Returns                                       |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------- |
| `listPrinterPresets`   | `{}`                                                   | array (by `by_normalized_name` asc, take 100) |
| `createPrinterPreset`  | `{ name, powerWatts, price, lifespanHours }`           | `Id<"printPricingPrinterPresets">`            |
| `updatePrinterPreset`  | `{ presetId, name, powerWatts, price, lifespanHours }` | `null`                                        |
| `deletePrinterPreset`  | `{ presetId }`                                         | `null`                                        |
| `listFilamentPresets`  | `{}`                                                   | array                                         |
| `createFilamentPreset` | `{ name, costPerKg }`                                  | `Id<"printPricingFilamentPresets">`           |
| `updateFilamentPreset` | `{ presetId, name, costPerKg }`                        | `null`                                        |
| `deleteFilamentPreset` | `{ presetId }`                                         | `null`                                        |

All preset writes: `normalizeName`, duplicate check via `by_normalized_name`, numeric validation via lib helpers, bump `updatedAt` on updates.

API paths end up as `api.printPricing.items.*`, `api.printPricing.calculations.*`, `api.printPricing.presets.*`.

---

## Frontend

### Routes (`apps/system/src/routes/_authenticated/`)

| File                            | Path                  | Purpose                                       |
| ------------------------------- | --------------------- | --------------------------------------------- |
| `3d.pricing.tsx` (new)          | `/3d/pricing`         | Item list + create item + preset manager      |
| `3d.pricing_.$itemId.tsx` (new) | `/3d/pricing/$itemId` | Calculator + breakdown + history for one item |

Follow `inventory.tsx` / `inventory_.$id.tsx` exactly: `loader: async ({ context: { queryClient: qc }, params })` with `qc.ensureQueryData(convexQuery(...))`, `crumb` entries, `head` meta (`"3D Pricing | DG"`), `errorComponent: DefaultCatchBoundary`, `Container`, `Suspense` + skeleton, cursor pagination via `cursorHistory` state.

Crumbs: `3D → /3d`, `3D Pricing → /3d/pricing`, item name on the detail page. Detail loader treat `null` item like the inventory "unavailable" screen.

### Components (`apps/system/src/components/3d/pricing/` — new folder)

| File                        | Exports                                                                                             | Responsibility                                                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pricing-items-table.tsx`   | `PricingItemsTable`, `PricingItemsTableSkeleton`                                                    | Search input (debounced via `@/hooks/use-debounce`) + table: name, latest price (`formatPeso`), last priced date, updated; row click → detail; actions menu per row                                                                           |
| `pricing-item-dialogs.tsx`  | `CreatePricingItemDialog`, `EditPricingItemDialog`, `DeletePricingItemDialog`, `PricingItemActions` | RHF + zod forms; create/edit name + notes; delete = `AlertDialog` warning that all saved calculations are deleted too. Copy the dialog+form structure from `components/inventory/item-dialogs.tsx`                                            |
| `preset-manager-dialog.tsx` | `PresetManagerDialog`, `PrinterPresetFormDialog`, `FilamentPresetFormDialog`                        | Manager with `Tabs` (Printers / Filaments), lists with edit/delete row actions, "Create preset" buttons. Form dialogs accept optional `initialValues` so the calculator can prefill them                                                      |
| `calculator-form.tsx`       | `PricingCalculatorForm`                                                                             | The calculator: material rows (`useFieldArray`), printer/labor/business sections with `Switch` enables, preset selects, inline "Save as preset" buttons, note field, Save button. Emits `onInputChange(input)` to the parent for live preview |
| `breakdown-panel.tsx`       | `BreakdownPanel`                                                                                    | Live totals via `computePriceBreakdown` (memoized); `ToggleGroup` Internal / Client view; line rows via `buildBreakdownRows`; big final price                                                                                                 |
| `calculation-history.tsx`   | `CalculationHistory`, `CalculationHistorySkeleton`                                                  | Newest-first list: date, total, actor, note; expandable (`Accordion` or `Collapsible`) full breakdown + inputs snapshot; delete per row (alert dialog)                                                                                        |
| `pricing-item-details.tsx`  | `PricingItemDetails`                                                                                | Detail page composition: header (name, notes, created by/date, edit/delete actions) + two-column grid (calculator left, sticky breakdown right) + history below                                                                               |
| `formatters.ts`             | `formatPrintTime(hours)`, `formatPercent(value)`, `buildBreakdownRows(input, breakdown)`            | Display helpers; `buildBreakdownRows` skips electricity/wear rows when `printer` is absent, labor row when `labor` is absent, failure/profit rows when `business` is absent                                                                   |

Form payload mapper (inside `calculator-form.tsx`): `toPricingInput(formValues): PrintPricingInput` — flat form fields → nested input, disabled sections become `undefined`, blank numbers become `0`.

### Calculator form layout (mirrors PesoPrint)

1. **Material** (always on): filament rows — preset `Select` (fills name + costPerKg), name `Input`, weight (g) `Input`, cost per kg `Input`, remove button; "Add filament" button (max 20). Small "Save as preset" button per row (opens `FilamentPresetFormDialog` prefilled with that row).
2. **Printer**: `Switch` include; preset `Select` + "Create preset" (`PrinterPresetFormDialog` prefilled with current values); fields: print time (hr + min inputs mapped to decimal `printTimeHours`), electricity rate per kWh, power (W), printer price, lifespan (hours). Fields disabled when excluded; `printTimeHours` is still saved as info.
3. **Labor**: `Switch` include; rate per hour, hours.
4. **Business**: `Switch` include; failure rate %, markup %.
5. Note `Textarea` + **Save price** button (`createCalculation`), `Spinner` while pending, success/error `toastManager`. Keep inputs after save; clear only the note. Secondary "Clear" button resets the form.

Selecting a preset stamps `presetId` + optional `name` and fills the numeric inputs; later manual edits don't clear `presetId` — the snapshot values are authoritative anyway.

### Hub + navigation edits

- `apps/system/src/lib/3d/tools.ts`: widen `to` to `"/3d/keychain" | "/3d/pricing"`, make `product` optional, add tool `{ id: "pricing", name: "3D Pricing", description: "Price prints from material, machine, labor, and profit settings. Save items and keep a price history.", icon: CalculatorIcon, to: "/3d/pricing" }`.
- `apps/system/src/routes/_authenticated/3d.index.tsx`: render the "Makes: …" badge only when `tool.product` exists.
- `apps/system/src/components/sidebar/group-nav-main.tsx`: extend `ThreeDSidebarItem` so the "3D" nav item also highlights on `/_authenticated/3d/pricing` and `/_authenticated/3d/pricing_/$itemId`.

### coss primitives to use

`Dialog`, `AlertDialog`, `Field`, `Fieldset`, `Input`, `Textarea`, `Switch`, `Select`, `Tabs`, `ToggleGroup`, `Table`, `Card`, `Badge`, `Empty`, `Skeleton`, `Spinner`, `Menu`, `Accordion`/`Collapsible`, `toastManager` — all from `@dg/ui-coss/components/*`. Load the coss skill first and follow the same usage as `components/inventory/*`.

---

## Step-by-step build order

Each step should typecheck in the LSP before moving on.

- [x] **Step 1 — Schema.** Create `packages/backend/convex/schemas/printPricing.tsx`, spread `printPricingSchema` in `convex/schema.ts`.
  - Done when: schema compiles, no table-name collisions with existing tables.
- [x] **Step 2 — Shared lib + export.** Create `convex/printPricing/lib.ts` (math, validation, `formatPeso`, `normalizeName`) and add the `"./printPricing"` export to `packages/backend/package.json`.
  - Done when: `computePriceBreakdown` reproduces the PesoPrint example (material 100, electricity 16.50, wear 41.25, labor 25 → subtotal 182.75, failure 5% → 9.14, profit 30% → 57.57, total ≈ 249.45).
- [x] **Step 3 — Presets backend.** Create `convex/printPricing/presets.ts` with the 8 functions above.
  - Done when: each mutation validates duplicates/numbers and stamps `createdBy` via `requireAppUser`.
- [x] **Step 4 — Items backend.** Create `convex/printPricing/items.ts` with the 6 functions above, including cascading delete.
  - Done when: `deleteItem` leaves zero orphaned calculations.
- [x] **Step 5 — Calculations backend.** Create `convex/printPricing/calculations.ts` with `createCalculation`, `listByItem`, `deleteCalculation`.
  - Done when: saved price always equals server recomputation (inputs only in args), item `latestTotal` updates on create and re-derives on delete.
- [x] **Step 6 — Navigation.** Update `tools.ts`, `3d.index.tsx`, `group-nav-main.tsx` (plus minimal route skeletons `3d.pricing.tsx` and `3d.pricing_.$itemId.tsx` so the generated route tree stays in sync).
  - Done when: `/3d` shows the new card, sidebar "3D" is active on pricing routes.
- [x] **Step 7 — Item list page.** Wire in the route `3d.pricing.tsx` (skeleton created in Step 6) + create `pricing-items-table.tsx` + `pricing-item-dialogs.tsx` (create/edit/delete item incl. cascade warning).
  - Done when: create → appears in list; delete → row and history gone; search works; empty state shows.
- [x] **Step 8 — Preset manager UI.** Create `preset-manager-dialog.tsx` (manager + form dialogs, prefill support) and mount it in the list page header (like `SupplierManagerDialog`).
  - Done when: create/edit/delete works for both preset kinds; deleting a preset leaves saved calculations untouched.
- [x] **Step 9 — Calculator form.** Create `calculator-form.tsx` (sections, filament field array, preset selects, save-as-preset buttons, note, Save).
  - Done when: save creates a calculation and the item's latest price updates in the list.
- [x] **Step 10 — Breakdown panel.** Create `breakdown-panel.tsx` + `formatters.ts` with live preview and Internal/Client toggle.
  - Done when: every input change updates totals instantly without a server round-trip; excluded sections show no rows.
- [x] **Step 11 — History.** Create `calculation-history.tsx` (list, expand snapshot, delete with confirm).
  - Done when: deleting the newest calculation re-derives the item's latest price; newest row is first.
- [x] **Step 12 — Detail page.** Wire in the route `3d.pricing_.$itemId.tsx` (skeleton created in Step 6) + create `pricing-item-details.tsx` composing header, calculator, breakdown, history.
  - Done when: unknown/deleted item id renders the "unavailable" screen; crumbs and page title are correct.
- [x] **Step 13 — Polish.** `ctrl+enter` to save (follow `item-dialogs.tsx` hotkey pattern), skeleton states, `tabular-nums` on money, verify hover styles respect the no-translate rule.

## Manual acceptance pass (after step 13)

1. `/3d` → open "3D Pricing" → create item "Test Bracket".
2. Calculator: add 2 filaments (one from a preset), enable all sections, watch breakdown update live, save with a note.
3. History shows the row; expand it and confirm the inputs snapshot matches what was entered.
4. Change markup, save again → two rows, list shows the newer total.
5. Edit a printer preset → old calculation totals unchanged.
6. Delete a calculation → item latest re-derives to the remaining row.
7. Create a preset inline from the calculator ("Save as preset") and confirm it appears in the manager.
8. Rename the item → history survives.
9. Delete the item → confirm dialog warns about history → item disappears from the list.
10. Everything renders as ₱ with 2 decimals; sidebar "3D" highlights while inside pricing pages.
