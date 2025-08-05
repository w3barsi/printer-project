import { v } from "convex/values"
import { Id } from "./_generated/dataModel"
import { authedMutation, authedQuery } from "./auth"

export const addExpense = authedMutation({
  args: {
    amount: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("expenses", {
      amount: args.amount,
      description: args.description,
      createdBy: ctx.user.subject as Id<"users">,
    })
  },
})

export const deleteExpense = authedMutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.expenseId)
  },
})

export const listDayData = authedQuery({
  args: {
    dayStart: v.number(),
    dayEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payment")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", args.dayStart))
      .filter((q) => q.lte(q.field("_creationTime"), args.dayEnd))
      .collect()

    const shapedPayments = payments.map(async (p) => {
      const user = (await ctx.db.get(p.createdBy)) ?? { name: "Unknown" }
      const jo = (await ctx.db.get(p.joId)) ?? { name: "Unknown", joNumber: "Unknown" }
      return {
        ...p,
        createdByName: user.name,
        joName: jo.name,
        joNumber: jo.joNumber,
      }
    })

    const finalPayments = await Promise.all(shapedPayments)

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", args.dayStart))
      .filter((q) => q.lte(q.field("_creationTime"), args.dayEnd))
      .collect()

    const expensesWithType = expenses.map(async (e) => {
      const user = (await ctx.db.get(e.createdBy)) ?? { name: "Unknown" }
      return {
        ...e,
        createdByName: user.name,
      }
    })

    // ShiftKExpenseType taken from here
    const finalExpenses = await Promise.all(expensesWithType)

    const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0)
    const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0)

    return {
      expensesData: finalExpenses,
      expensesTotal,
      paymentsData: finalPayments,
      paymentsTotal,
      net: paymentsTotal - expensesTotal,
    }
  },
})
