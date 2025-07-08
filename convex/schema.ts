import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
	products: defineTable({
		title: v.string(),
		quantity: v.optional(v.string()),
		price: v.number(),
	}),

	jo: defineTable({
		name: v.string(),
		joNumber: v.number(),
		pickupDate: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("in-progress"),
			v.literal("completed"),
		),
	}),

	items: defineTable({
		joId: v.id("jo"),
		name: v.string(),
		quantity: v.number(),
		price: v.number(),
	}).index("by_joId", ["joId"]),

	users: defineTable({}),
})
