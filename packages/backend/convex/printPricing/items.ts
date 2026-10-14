import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { authedMutation, authedQuery, requireAppUser } from "../auth";
import { normalizeName, validateNote } from "./lib";

const pricingItemListItemValidator = v.object({
  _id: v.id("printPricingItems"),
  _creationTime: v.number(),
  name: v.string(),
  normalizedName: v.string(),
  notes: v.optional(v.string()),
  createdBy: v.id("users"),
  createdByName: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  latestTotal: v.optional(v.number()),
  latestCalculatedAt: v.optional(v.number()),
});

const pricingItemOptionValidator = v.object({
  _id: v.id("printPricingItems"),
  name: v.string(),
  latestTotal: v.optional(v.number()),
});

function validatePaginationSize(numItems: number) {
  if (!Number.isSafeInteger(numItems) || numItems < 1 || numItems > 50) {
    throw new Error("Page size must be a whole number between 1 and 50");
  }
}

export const createItem = authedMutation({
  args: {
    name: v.string(),
    notes: v.optional(v.string()),
  },
  returns: v.id("printPricingItems"),
  handler: async (ctx, args) => {
    const actor = await requireAppUser(ctx);
    const itemName = normalizeName(args.name, "Item name");
    const notes = validateNote(args.notes);

    const existingItem = await ctx.db
      .query("printPricingItems")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", itemName.normalizedName),
      )
      .unique();

    if (existingItem) {
      throw new Error("A pricing item with this name already exists");
    }

    const now = Date.now();

    return await ctx.db.insert("printPricingItems", {
      ...itemName,
      ...(notes ? { notes } : {}),
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateItem = authedMutation({
  args: {
    itemId: v.id("printPricingItems"),
    name: v.string(),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const item = await ctx.db.get("printPricingItems", args.itemId);

    if (!item) {
      throw new Error("Pricing item not found");
    }

    const itemName = normalizeName(args.name, "Item name");
    const notes = validateNote(args.notes);

    if (itemName.name === item.name && notes === item.notes) {
      throw new Error("Item details are unchanged");
    }

    const existingItem = await ctx.db
      .query("printPricingItems")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", itemName.normalizedName),
      )
      .unique();

    if (existingItem && existingItem._id !== item._id) {
      throw new Error("A pricing item with this name already exists");
    }

    await ctx.db.patch("printPricingItems", item._id, {
      ...itemName,
      notes,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteItem = authedMutation({
  args: {
    itemId: v.id("printPricingItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const item = await ctx.db.get("printPricingItems", args.itemId);

    if (!item) {
      throw new Error("Pricing item not found");
    }

    // Cascade: a price history is only meaningful alongside its item.
    while (true) {
      const calculations = await ctx.db
        .query("printPricingCalculations")
        .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
        .take(64);

      if (calculations.length === 0) {
        break;
      }

      for (const calculation of calculations) {
        await ctx.db.delete("printPricingCalculations", calculation._id);
      }
    }

    await ctx.db.delete("printPricingItems", args.itemId);

    return null;
  },
});

export const listItems = authedQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(pricingItemListItemValidator),
  handler: async (ctx, args) => {
    validatePaginationSize(args.paginationOpts.numItems);

    const result = await ctx.db
      .query("printPricingItems")
      .withIndex("by_updatedAt")
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (item) => {
        const creator = await ctx.db.get("users", item.createdBy);

        return {
          ...item,
          createdByName: creator?.name ?? "Former user",
        };
      }),
    );

    return {
      ...result,
      page,
    };
  },
});

export const getItem = authedQuery({
  args: {
    itemId: v.id("printPricingItems"),
  },
  returns: v.union(pricingItemListItemValidator, v.null()),
  handler: async (ctx, args) => {
    const item = await ctx.db.get("printPricingItems", args.itemId);

    if (!item) return null;

    const creator = await ctx.db.get("users", item.createdBy);

    return {
      ...item,
      createdByName: creator?.name ?? "Former user",
    };
  },
});

export const searchItems = authedQuery({
  args: {
    query: v.string(),
  },
  returns: v.array(pricingItemOptionValidator),
  handler: async (ctx, args) => {
    const searchQuery = args.query.trim();

    const items = searchQuery
      ? await ctx.db
          .query("printPricingItems")
          .withSearchIndex("search_name", (q) => q.search("name", searchQuery))
          .take(20)
      : await ctx.db
          .query("printPricingItems")
          .withIndex("by_updatedAt")
          .order("desc")
          .take(20);

    return items.map((item) => ({
      _id: item._id,
      name: item.name,
      latestTotal: item.latestTotal,
    }));
  },
});
