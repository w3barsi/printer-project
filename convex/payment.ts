import { v } from "convex/values";

import { authedMutation, requireAppUser } from "./auth";

export const createPayment = authedMutation({
  args: {
    joId: v.id("jo"),
    amount: v.number(),
    mop: v.optional(v.union(v.literal("cash"), v.literal("bank"))),
    note: v.optional(v.string()),
    full: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireAppUser(ctx);
    const { joId, amount, mop, full, note } = args;
    await ctx.db.insert("payment", {
      joId,
      createdBy: actor._id,
      createdAt: new Date().getTime(),

      amount,
      full,
      mop,
      note,
    });
    await ctx.db.patch("jo", joId, { updatedAt: new Date().getTime() });
  },
});

export const deletePayment = authedMutation({
  args: {
    amount: v.number(),
    paymentId: v.id("payment"),
    joId: v.id("jo"),
  },
  handler: async (ctx, args) => {
    const { joId, paymentId } = args;

    await ctx.db.delete("payment", paymentId);
    await ctx.db.patch("jo", joId, { updatedAt: new Date().getTime() });
  },
});
