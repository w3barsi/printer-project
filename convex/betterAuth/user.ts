import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const setUserId = mutation({
  args: {
    authId: v.id("user"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.authId, {
      userId: args.userId,
    });
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("user"),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("cashier")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      role: args.role,
    });
  },
});
