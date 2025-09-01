import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import { DataModel } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

export const expenseToCashflow = migrations.define({
  table: "expenses",
  migrateOne: async (ctx, expense) => {
    await ctx.db.insert("cashflow", {
      createdBy: expense.createdBy,
      createdAt: expense._creationTime,
      amount: expense.amount,
      cashflowType: "Expense",
      description: expense.description,
    });
  },
});

export const deleteExpenses = migrations.define({
  table: "expenses",
  migrateOne: async (ctx, expense) => {
    await ctx.db.delete(expense._id);
  },
});

export const addCreatedAtToPayments = migrations.define({
  table: "payment",
  migrateOne: async (ctx, payment) => {
    await ctx.db.patch(payment._id, { createdAt: payment._creationTime });
  },
});
