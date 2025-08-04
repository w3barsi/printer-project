import { v } from "convex/values"
import { Id } from "./_generated/dataModel"
import { authedMutation } from "./auth"

export const createPayment = authedMutation({
  args: {
    joId: v.id("jo"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const { joId, amount } = args
    await ctx.db.insert("payment", {
      joId,
      amount,
      createdBy: ctx.user.subject as Id<"users">,
      createdByName: ctx.user.name,
      createdAt: new Date().getTime(),
    })
  },
})

export const deletePayment = authedMutation({
  args: {
    paymentId: v.id("payment"),
  },
  handler: async (ctx, args) => {
    const { paymentId } = args
    await ctx.db.delete(paymentId)
  },
})
