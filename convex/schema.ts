import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const cashflowType = v.optional(
  // CA = Cash Advance
  // COH = Cash On Hand
  v.union(v.literal("Expense"), v.literal("CA"), v.literal("COH")),
);

export default defineSchema({
  file: defineTable({
    createdBy: v.id("users"),
    parent: v.union(v.literal("private"), v.literal("public"), v.id("folder")),
    name: v.string(),
    key: v.string(),
    type: v.string(),
    size: v.number(),

    toDelete: v.optional(v.boolean()),
  })
    .index("by_parent", ["parent"])
    .index("by_toDelete", ["toDelete"]),

  folder: defineTable({
    createdBy: v.id("users"),
    parent: v.union(v.literal("private"), v.literal("public"), v.id("folder")),
    name: v.string(),

    toDelete: v.optional(v.boolean()),
  })
    .index("by_parent", ["parent"])
    .index("by_toDelete", ["toDelete"]),

  products: defineTable({
    title: v.string(),
    quantity: v.optional(v.string()),
    price: v.number(),
  }),

  jo: defineTable({
    updatedAt: v.optional(v.number()),

    name: v.string(),
    joNumber: v.number(),
    pickupDate: v.optional(v.number()),
    pickupTime: v.optional(v.string()),
    contactNumber: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in-progress"),
      v.literal("completed"),
    ),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_joNumber", ["joNumber"])
    .index("by_lastUpdated", ["updatedAt"]),

  payment: defineTable({
    createdBy: v.id("users"),
    createdAt: v.number(),

    joId: v.id("jo"),
    // full payment
    full: v.optional(v.boolean()),
    // mode of payment
    mop: v.optional(v.union(v.literal("cash"), v.literal("bank"))),
    note: v.optional(v.string()),
    amount: v.number(),
  })
    .index("by_joId", ["joId"])
    .index("by_created_at", ["createdAt"]),

  cashflow: defineTable({
    createdBy: v.id("users"),
    createdAt: v.number(),
    amount: v.number(),
    cashflowType,
    description: v.string(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_cashflow_type", ["cashflowType"]),

  expenses: defineTable({
    createdBy: v.id("users"),

    amount: v.number(),
    description: v.string(),
  }),

  items: defineTable({
    updatedAt: v.optional(v.number()),

    joId: v.id("jo"),
    name: v.string(),
    quantity: v.number(),
    price: v.number(),
    createdBy: v.optional(v.id("users")),
  }).index("by_joId", ["joId"]),

  users: defineTable({
    name: v.string(),
    username: v.optional(v.union(v.null(), v.string())),
    displayUsername: v.optional(v.union(v.null(), v.string())),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.union(v.null(), v.string())),
    phoneNumber: v.optional(v.union(v.null(), v.string())),
    role: v.optional(v.union(v.null(), v.string())),
    banned: v.optional(v.union(v.null(), v.boolean())),
    banReason: v.optional(v.union(v.null(), v.string())),
    createdAt: v.optional(v.union(v.null(), v.float64())),
  })
    .index("email_name", ["email", "name"])
    .index("name", ["name"])
    .index("phoneNumber", ["phoneNumber"])
    .index("username", ["username"]),
});
