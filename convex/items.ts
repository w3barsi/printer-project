import { v } from "convex/values"
import { Id } from "./_generated/dataModel"
import { mutation } from "./_generated/server"
import { authedMutation } from "./auth"

export const deleteItem = mutation({
  args: {
    itemId: v.id("items"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.itemId)
  },
})

export const createItem = authedMutation({
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
      createdBy: ctx.user.subject as Id<"users">,
    })

    await ctx.db.patch(args.joId, { updatedAt: new Date().getTime() })
  },
})
