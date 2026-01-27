import { v } from "convex/values";

import { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { authedMutation } from "./auth";

export const deleteItem = mutation({
  args: {
    itemId: v.id("items"),
    joId: v.id("jo"),
  },
  handler: async (ctx, args) => {
    Promise.all([
      ctx.db.delete(args.itemId),
      ctx.db.patch(args.joId, { updatedAt: new Date().getTime() }),
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
    const { joId, name, quantity, price } = args;
    const insertPromise = ctx.db.insert("items", {
      joId,
      name,
      quantity,
      price,
      createdBy: ctx.user.userId as Id<"users">,
    });
    const patchPromise = ctx.db.patch(args.joId, { updatedAt: new Date().getTime() });

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
    await ctx.db.patch(itemId, rest);

    await ctx.db.patch(joId, { updatedAt: new Date().getTime() });
  },
});
