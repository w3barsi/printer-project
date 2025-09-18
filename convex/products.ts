import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});
export const add = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    // math random 50-100

    return await ctx.db.insert("products", {
      title,
      price: Math.floor(Math.random() * (100 - 50 + 1)) + 50,
    });
  },
});
