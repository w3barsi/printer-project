import { v } from "convex/values"
import { createAuth } from "../../src/lib/auth"
import { mutation } from "../_generated/server"
import { authedMutation, authedQuery, betterAuthComponent } from "../auth"

export const listUsers = authedQuery({
  args: {},
  handler: async (ctx) => {
    const auth = createAuth(ctx)
    const headers = await betterAuthComponent.getHeaders(ctx)
    const users = await auth.api.listUsers({
      query: {},
      headers,
    })
    console.log(users)
    return users
  },
})

export const createUser = authedMutation({
  args: { name: v.string(), email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const auth = createAuth(ctx)
    const headers = await betterAuthComponent.getHeaders(ctx)
    const user = await auth.api.createUser({
      body: {
        password: args.password,
        name: args.name,
        email: args.email,
      },
      headers,
    })
    return user
  },
})

export const setRole = mutation({
  args: { userId: v.string(), role: v.union(v.literal("user"), v.literal("admin")) },
  handler: async (ctx, args) => {
    const auth = createAuth(ctx)
    console.log(args.userId)
    const headers = await betterAuthComponent.getHeaders(ctx)
    await auth.api.setRole({
      body: {
        userId: args.userId,
        role: args.role,
      },
      headers,
    })
    return { ok: true }
  },
})

export const banOrUnbanUser = mutation({
  args: { userId: v.string(), isBanned: v.boolean() },
  handler: async (ctx, args) => {
    const auth = createAuth(ctx)
    const headers = await betterAuthComponent.getHeaders(ctx)
    if (args.isBanned) {
      await auth.api.unbanUser({
        body: {
          userId: args.userId,
        },
        headers,
      })
    } else {
      await auth.api.banUser({
        body: {
          userId: args.userId,
        },
        headers,
      })
    }
    return { ok: true }
  },
})
