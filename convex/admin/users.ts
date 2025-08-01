import { v } from "convex/values"
import { createAuth } from "../../src/lib/auth"
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
    return users
  },
})

export const setRole = authedMutation({
  args: { userId: v.string(), role: v.union(v.literal("user"), v.literal("admin")) },
  handler: async (ctx, args) => {
    const auth = createAuth(ctx)
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

export const deleteUser = authedMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const auth = createAuth(ctx)
    const headers = await betterAuthComponent.getHeaders(ctx)
    await auth.api.banUser({
      body: {
        userId: args.userId,
      },
      headers,
    })
    return { ok: true }
  },
})
