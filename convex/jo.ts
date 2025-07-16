import { v } from "convex/values"
import {
	getAll,
	getManyFrom,
	getManyVia,
	getOneFrom,
} from "convex-helpers/server/relationships"

import { mutation, query } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"

export type Item = Doc<"items">
export type Jo = Doc<"jo">
export type JoWithItems = {
	jo: Jo
	items: Item[]
}

export const createJo = mutation({
	args: { joNumber: v.number(), name: v.string(), pickupDate: v.string() },
	handler: async (ctx, args) => {
		const { joNumber, name, pickupDate } = args
		const joId = await ctx.db.insert("jo", {
			joNumber,
			name,
			pickupDate,
			status: "pending",
		})
		return joId
	},
})

export const getRecent = query({
	args: {},
	handler: async (ctx) => {
		const recent = await ctx.db.query("jo").take(5)
		return recent.map((jo) => ({ id: jo._id, name: jo.name }))
	},
})

export const getJosWithItems = query({
	args: {},
	handler: async (ctx) => {
		const jos = await ctx.db.query("jo").collect()
		const joWithItems = jos.map(async (jo) => {
			const items = await ctx.db
				.query("items")
				.withIndex("by_joId", (q) => q.eq("joId", jo._id))
				.collect()

			return { jo, items }
		})

		const all = await Promise.all(joWithItems)

		return all
	},
})

export const getOneJoWithItems = query({
	args: { id: v.id("jo") },
	handler: async (ctx, args) => {
		const jo = await ctx.db
			.query("jo")
			.withIndex("by_id", (q) => q.eq("_id", args.id))
			.first()
		if (!jo) {
			return null
		}

		const items = await ctx.db
			.query("items")
			.withIndex("by_joId", (q) => q.eq("joId", jo._id))
			.collect()

		return { jo, items }
	},
})
