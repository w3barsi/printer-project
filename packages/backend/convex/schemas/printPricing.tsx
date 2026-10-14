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
    // how many saved calculations used this preset; highest count is the default
    useCount: v.optional(v.number()),
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
