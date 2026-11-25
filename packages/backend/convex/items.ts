import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { authedMutation, requireAppUser } from "./auth";

export function sortItemsForDisplay<
  T extends { orderWeight?: number; _creationTime: number },
>(items: T[]) {
  return [...items].sort(
    (a, b) =>
      (a.orderWeight ?? Number.MAX_SAFE_INTEGER) -
        (b.orderWeight ?? Number.MAX_SAFE_INTEGER) || a._creationTime - b._creationTime,
  );
}

export const deleteItem = mutation({
  args: {
    itemId: v.id("items"),
    joId: v.id("jo"),
  },
  handler: async (ctx, args) => {
    Promise.all([
      ctx.db.delete("items", args.itemId),
      ctx.db.patch("jo", args.joId, { updatedAt: new Date().getTime() }),
    ]);
  },
});

export const createItem = authedMutation({
  args: {
    joId: v.id("jo"),
    name: v.string(),
    quantity: v.number(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const actor = await requireAppUser(ctx);
    const { joId, name, quantity, price } = args;

    const siblings = await ctx.db
      .query("items")
      .withIndex("by_joId", (q) => q.eq("joId", joId))
      .collect();

    // Items on older job orders have no orderWeight. Leave the new item
    // unweighted too so it stays in creation order at the end of the list.
    const orderWeight = siblings.every((item) => item.orderWeight !== undefined)
      ? siblings.length
      : undefined;

    await ctx.db.insert("items", {
      joId,
      name,
      quantity,
      price,
      orderWeight,
      createdBy: actor._id,
    });

    await ctx.db.patch("jo", joId, { updatedAt: new Date().getTime() });
  },
});

export const updateItem = authedMutation({
  args: {
    itemId: v.id("items"),
    joId: v.id("jo"),
    name: v.string(),
    quantity: v.number(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const { joId, itemId, ...rest } = args;

    await ctx.db.patch("items", itemId, rest);

    await ctx.db.patch("jo", joId, { updatedAt: new Date().getTime() });
  },
});

export const reorderItems = authedMutation({
  args: {
    joId: v.id("jo"),
    itemIds: v.array(v.id("items")),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("items")
      .withIndex("by_joId", (q) => q.eq("joId", args.joId))
      .collect();

    if (
      items.length !== args.itemIds.length ||
      new Set(args.itemIds).size !== args.itemIds.length
    ) {
      throw new Error("Item order does not match the job order");
    }

    const itemIdSet = new Set(items.map((item) => item._id));
    if (args.itemIds.some((itemId) => !itemIdSet.has(itemId))) {
      throw new Error("Item order does not match the job order");
    }

    await Promise.all(
      args.itemIds.map((itemId, index) =>
        ctx.db.patch("items", itemId, { orderWeight: index }),
      ),
    );

    await ctx.db.patch("jo", args.joId, { updatedAt: new Date().getTime() });
  },
});

export const toggleItemChecked = authedMutation({
  args: {
    itemId: v.id("items"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get("items", args.itemId);
    if (!item) throw new Error("Item not found");

    await ctx.db.patch("items", item._id, {
      checked: !item.checked,
      updatedAt: new Date().getTime(),
    });
  },
});
