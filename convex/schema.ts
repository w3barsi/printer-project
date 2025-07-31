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

  invoice: defineTable({
    updatedAt: v.optional(v.number()),

    joId: v.id("jo"),
    total: v.number(),
    createdBy: v.optional(v.id("users")),
  }),

  items: defineTable({
    updatedAt: v.optional(v.number()),

    joId: v.id("jo"),
    name: v.string(),
    quantity: v.number(),
    price: v.number(),
    createdBy: v.optional(v.id("users")),
  }).index("by_joId", ["joId"]),

  users: defineTable({ nickname: v.optional(v.string()) }),
})
