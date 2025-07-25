import type { AuthFunctions, PublicAuthFunctions } from "@convex-dev/better-auth"
import { BetterAuth } from "@convex-dev/better-auth"
import { customCtx, customMutation } from "convex-helpers/server/customFunctions"
import { api, components, internal } from "./_generated/api"
import type { DataModel, Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"

// Typesafe way to pass Convex functions defined in this file
const authFunctions: AuthFunctions = internal.auth
const publicAuthFunctions: PublicAuthFunctions = api.auth

// Initialize the component
export const betterAuthComponent = new BetterAuth(components.betterAuth, {
  authFunctions,
  publicAuthFunctions,
  verbose: true,
})

// These are required named exports
export const { createUser, updateUser, deleteUser, createSession, isAuthenticated } =
  betterAuthComponent.createAuthFunctions<DataModel>({
    // Must create a user and return the user id
    onCreateUser: async (ctx, user) => {
      return ctx.db.insert("users", {})
    },

    // Delete the user when they are deleted from Better Auth
    onDeleteUser: async (ctx, userId) => {
      await ctx.db.delete(userId as Id<"users">)
    },
  })

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Get user data from Better Auth - email, name, image, etc.
    const userMetadata = await betterAuthComponent.getAuthUser(ctx)
    if (!userMetadata) {
      return null
    }
    // Get user data from your application's database
    // (skip this if you have no fields in your users table schema)
    const user = await ctx.db.get(userMetadata.userId as Id<"users">)
    return {
      ...user,
      ...userMetadata,
    }
  },
})

export const authedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error("Authentication required")
    return { user }
  }),
)
