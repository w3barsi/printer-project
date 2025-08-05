import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
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

    full: v.optional(v.boolean()),
    // mode of payment
    mop: v.optional(v.union(v.literal("cash"), v.literal("bank"))),
    note: v.optional(v.string()),
    amount: v.number(),
    joId: v.id("jo"),
  }).index("by_joId", ["joId"]),

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
})
