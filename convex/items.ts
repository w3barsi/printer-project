import { v } from "convex/values"
import { mutation } from "./_generated/server"

export const deleteItem = mutation({
  args: {
    itemId: v.id("items"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.itemId)
  },
})

export const createItem = mutation({
  args: {
    joId: v.id("jo"),
    name: v.string(),
    quantity: v.number(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const { joId, name, quantity, price } = args
    await ctx.db.insert("items", {
      joId,
      name,
      quantity,
      price,
    })
  },
})
