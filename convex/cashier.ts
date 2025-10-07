import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { authedMutation, authedQuery } from "./auth";
import { cashflowType } from "./schema";

export const createCashOnHand = authedMutation({
  args: {
    amount: v.number(),
    description: v.string(),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const dateStart = args.date;
    const dateEnd = dateStart + 24 * 60 * 60 * 1000 - 1;

    const a = await ctx.db
      .query("cashflow")
      .withIndex("by_cashflow_type", (q) => q.eq("cashflowType", "COH"))
      .filter((q) => q.gte(q.field("createdAt"), dateStart))
      .filter((q) => q.lte(q.field("createdAt"), dateEnd))
      .first();

    if (a) {
      throw new Error("Cash on hand already exists");
    }

    await ctx.db.insert("cashflow", {
      amount: args.amount,
      description: args.description,
      createdBy: ctx.user.userId as Id<"users">,
      createdAt: dateStart,
      cashflowType: "COH",
    });
  },
});

export const createCashflow = authedMutation({
  args: {
    amount: v.number(),
    description: v.string(),
    type: cashflowType,
    date: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.amount > 5_000_000) {
      throw new Error("Cashflow amount cannot be greater than 5,000,000");
    }
    await ctx.db.insert("cashflow", {
      amount: args.amount,
      description: args.description,
      createdBy: ctx.user.userId as Id<"users">,
      createdAt: args.date,
      cashflowType: args.type ?? "Expense",
    });
  },
});

export const deleteCashflowExpense = authedMutation({
  args: {
    expenseId: v.id("cashflow"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.expenseId);
  },
});

export const getCashflow = authedQuery({
  args: {
    dayStart: v.number(),
  },
  handler: async (ctx, args) => {
    const { dayStart } = args;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    const rawPayments = await ctx.db
      .query("payment")
      .withIndex("by_created_at", (q) => q.gte("createdAt", dayStart))
      .filter((q) => q.lte(q.field("createdAt"), dayEnd))
      .collect();

    const payments = await Promise.all(
      rawPayments.map(async (p) => {
        const user = (await ctx.db.get(p.createdBy)) ?? { name: "Unknown" };
        const jo = (await ctx.db.get(p.joId)) ?? { name: "Unknown", joNumber: "Unknown" };
        return {
          type: "Payment" as const,
          ...p,
          createdAt: p._creationTime,
          createdByName: user.name,
          joName: jo.name,
          joNumber: jo.joNumber,
        };
      }),
    );

    const rawCashflow = await ctx.db
      .query("cashflow")
      .withIndex("by_created_at", (q) => q.gte("createdAt", dayStart))
      .filter((q) => q.lte(q.field("createdAt"), dayEnd))
      .collect();

    const cashflow = await Promise.all(
      rawCashflow.map(async (e) => {
        const user = (await ctx.db.get(e.createdBy)) ?? { name: "Unknown" };
        return {
          ...e,
          type: "Cashflow" as const,
          createdByName: user.name,
        };
      }),
    );

    const expenses = cashflow.filter((e) => e.cashflowType !== "COH");
    const data = [...payments, ...expenses].sort((a, b) => a.createdAt - b.createdAt);

    const startingCash = cashflow.filter((d) => d.cashflowType === "COH");

    const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0);
    const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);

    return {
      data,
      paymentsTotal,
      expensesTotal,
      startingCash: startingCash.length > 0 ? startingCash[0] : undefined,
    };
  },
});

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
      .collect();

    const shapedPayments = payments.map(async (p) => {
      const user = (await ctx.db.get(p.createdBy)) ?? { name: "Unknown" };
      const jo = (await ctx.db.get(p.joId)) ?? { name: "Unknown", joNumber: "Unknown" };
      return {
        ...p,
        createdByName: user.name,
        joName: jo.name,
        joNumber: jo.joNumber,
      };
    });

    const finalPayments = await Promise.all(shapedPayments);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", args.dayStart))
      .filter((q) => q.lte(q.field("_creationTime"), args.dayEnd))
      .collect();

    const expensesWithType = expenses.map(async (e) => {
      const user = (await ctx.db.get(e.createdBy)) ?? { name: "Unknown" };
      return {
        ...e,
        createdByName: user.name,
      };
    });

    // ShiftKExpenseType taken from here
    const finalExpenses = await Promise.all(expensesWithType);

    const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0);
    const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);

    return {
      expensesData: finalExpenses,
      expensesTotal,
      paymentsData: finalPayments,
      paymentsTotal,
      net: paymentsTotal - expensesTotal,
    };
  },
});
