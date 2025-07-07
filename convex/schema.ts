import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
	products: defineTable({
		title: v.string(),
		imageId: v.optional(v.string()),
		price: v.number(),
	}),
	users: defineTable({}),
})
