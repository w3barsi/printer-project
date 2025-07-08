import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
	products: defineTable({
		title: v.string(),
		quantity: v.optional(v.string()),
		price: v.number(),
	}),

	jo: defineTable({
		joNumber: v.number(),
	}).index("by_joNumber", ["joNumber"]),
	items: defineTable({
		joNumber: v.id("jo"),
		name: v.string(),
		quantity: v.number(),
		price: v.number(),
	}).index("by_joNumber", ["joNumber"]),
	users: defineTable({}),
})
