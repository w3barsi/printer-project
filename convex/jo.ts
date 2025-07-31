import { v } from "convex/values"

import { paginationOptsValidator } from "convex/server"
import type { Doc } from "./_generated/dataModel"
import { internalMutation, query } from "./_generated/server"
import { authedMutation, betterAuthComponent } from "./auth"

export type Item = Doc<"items">
export type Jo = Doc<"jo">
export type JoWithItems = {
  jo: Jo
  items: Item[]
}

export const deleteJo = authedMutation({
  args: v.object({ joId: v.id("jo") }),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.joId)
  },
})

export const createJo = authedMutation({
  args: v.object({
    name: v.string(),
    contactNumber: v.optional(v.string()),
    pickupDate: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const { name, pickupDate, contactNumber } = args

    const userMetadata = await betterAuthComponent.getAuthUser(ctx)

    const lastJoNumber = await ctx.db
      .query("jo")
      .withIndex("by_joNumber")
      .order("desc")
      .first()
    const joNumber = lastJoNumber ? lastJoNumber.joNumber + 1 : 1

    const joId = await ctx.db.insert("jo", {
      joNumber,
      name,
      pickupDate,
      contactNumber,
      status: "pending",
      createdBy: userMetadata?.userId,
    })
    return joId
  },
})

export const createRandomJo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const name = generateFakeName()
    const lastJoNumber = await ctx.db
      .query("jo")
      .withIndex("by_joNumber")
      .order("desc")
      .first()
    const joNumber = lastJoNumber ? lastJoNumber.joNumber + 1 : 1

    const joId = await ctx.db.insert("jo", {
      joNumber,
      name,
      pickupDate: new Date().getTime(),
      status: "pending",
    })
    return joId
  },
})

export const getRecent = query({
  args: {},
  handler: async (ctx) => {
    const recent = await ctx.db.query("jo").order("desc").take(5)
    return recent.map((jo) => ({ id: jo._id, name: jo.name }))
  },
})

export const getWithPages = query({
  args: { page: v.number() },
  handler: async (ctx, { page }) => {
    const pageSize = 10
    const allJos = await ctx.db.query("jo").order("desc").collect()
    const total = allJos.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const josOnPage = allJos.slice(start, end)

    const joWithItems = josOnPage.map(async (jo) => {
      const items = await ctx.db
        .query("items")
        .withIndex("by_joId", (q) => q.eq("joId", jo._id))
        .collect()
      return {
        ...jo,
        items,
      }
    })

    const pageWithItems = await Promise.all(joWithItems)
    return {
      page: pageWithItems,
      total,
    }
  },
})

export const getWithPagination = query({
  args: v.object({ paginationOptions: paginationOptsValidator }),
  handler: async (ctx, { paginationOptions: { cursor, numItems } }) => {
    const res = await ctx.db.query("jo").order("desc").paginate({ cursor, numItems })
    const { page, isDone, continueCursor } = res

    const joWithItems = page.map(async (jo) => {
      const items = await ctx.db
        .query("items")
        .withIndex("by_joId", (q) => q.eq("joId", jo._id))
        .collect()

      return { ...jo, items }
    })

    const all = await Promise.all(joWithItems)

    return {
      jos: all,
      nextCursor: isDone ? undefined : continueCursor,
    }
  },
})

export const getWithItems = query({
  args: {},
  handler: async (ctx) => {
    const jos = await ctx.db.query("jo").order("desc").collect()

    const joWithItems = jos.map(async (jo) => {
      const items = await ctx.db
        .query("items")
        .withIndex("by_joId", (q) => q.eq("joId", jo._id))
        .collect()

      return { ...jo, items }
    })

    const all = await Promise.all(joWithItems)

    return all
  },
})

export const getOneWithItems = query({
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

    return { ...jo, items }
  },
})

function generateFakeName() {
  const firstNames = [
    "Alice",
    "Bob",
    "Charlie",
    "David",
    "Eve",
    "Frank",
    "Grace",
    "Heidi",
  ]
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
  ]

  const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)]

  return `${randomFirstName} ${randomLastName}`
}
