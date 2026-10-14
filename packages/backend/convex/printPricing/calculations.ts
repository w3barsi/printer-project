import { v } from "convex/values";

import { authedMutation, authedQuery, requireAppUser } from "../auth";
import { printPricingInput, printPriceBreakdown } from "../schemas/printPricing";
import { computePriceBreakdown, validateNote, validatePrintPricingInput } from "./lib";

const calculationListItemValidator = v.object({
  _id: v.id("printPricingCalculations"),
  _creationTime: v.number(),
  itemId: v.id("printPricingItems"),
  ...printPricingInput.fields,
  price: printPriceBreakdown,
  note: v.optional(v.string()),
  createdBy: v.id("users"),
  createdByName: v.string(),
  createdAt: v.number(),
});

export const createCalculation = authedMutation({
  args: {
    itemId: v.id("printPricingItems"),
    note: v.optional(v.string()),
    ...printPricingInput.fields,
  },
  returns: v.id("printPricingCalculations"),
  handler: async (ctx, args) => {
    const actor = await requireAppUser(ctx);

    const item = await ctx.db.get("printPricingItems", args.itemId);

    if (!item) {
      throw new Error("Pricing item not found");
    }

    const input = validatePrintPricingInput(args);
    const note = validateNote(args.note);
    const price = computePriceBreakdown(input);
    const createdAt = Date.now();

    const calculationId = await ctx.db.insert("printPricingCalculations", {
      itemId: item._id,
      ...input,
      price,
      ...(note ? { note } : {}),
      createdBy: actor._id,
      createdAt,
    });

    // Track preset usage so the most-used printer becomes the default choice.
    if (input.printer?.presetId) {
      const preset = await ctx.db.get(
        "printPricingPrinterPresets",
        input.printer.presetId,
      );

      if (preset) {
        await ctx.db.patch("printPricingPrinterPresets", preset._id, {
          useCount: (preset.useCount ?? 0) + 1,
        });
      }
    }

    await ctx.db.patch("printPricingItems", item._id, {
      latestTotal: price.total,
      latestCalculatedAt: createdAt,
      updatedAt: createdAt,
    });

    return calculationId;
  },
});

export const listByItem = authedQuery({
  args: {
    itemId: v.id("printPricingItems"),
  },
  returns: v.array(calculationListItemValidator),
  handler: async (ctx, args) => {
    const calculations = await ctx.db
      .query("printPricingCalculations")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .order("desc")
      .take(50);

    return await Promise.all(
      calculations.map(async (calculation) => {
        const creator = await ctx.db.get("users", calculation.createdBy);

        return {
          ...calculation,
          createdByName: creator?.name ?? "Former user",
        };
      }),
    );
  },
});

export const deleteCalculation = authedMutation({
  args: {
    calculationId: v.id("printPricingCalculations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const calculation = await ctx.db.get("printPricingCalculations", args.calculationId);

    if (!calculation) {
      throw new Error("Pricing calculation not found");
    }

    await ctx.db.delete("printPricingCalculations", calculation._id);

    // Re-derive the item's latest price from the remaining history.
    const remaining = await ctx.db
      .query("printPricingCalculations")
      .withIndex("by_itemId", (q) => q.eq("itemId", calculation.itemId))
      .order("desc")
      .take(1);

    const latest = remaining[0];

    await ctx.db.patch("printPricingItems", calculation.itemId, {
      latestTotal: latest?.price.total,
      latestCalculatedAt: latest?.createdAt,
    });

    return null;
  },
});
