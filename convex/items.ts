import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { authedMutation, requireAppUser } from "./auth";

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
    const insertPromise = ctx.db.insert("items", {
      joId,
      name,
      quantity,
      price,
      createdBy: actor._id,
    });
    const patchPromise = ctx.db.patch("jo", args.joId, {
      updatedAt: new Date().getTime(),
    });

    Promise.all([insertPromise, patchPromise]);
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
