import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { ac, adminRole, cashierRole, userRole } from "@dg/auth";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { admin, username } from "better-auth/plugins";
import {
  customCtx,
  customMutation,
  customQuery,
  type CustomCtx,
} from "convex-helpers/server/customFunctions";

import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { mutation, query, env } from "./_generated/server";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";

// Typesafe way to pass Convex functions defined in this file
const authFunctions: AuthFunctions = internal.auth;

// Initialize the component
export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    // verbose: true,
    authFunctions,
    local: {
      schema: authSchema,
    },
    triggers: {
      user: {
        onCreate: async (ctx, authUser) => {
          await ctx.db.insert("users", {
            authId: authUser._id,
            name: authUser.name,
          });
        },

        onUpdate: async (ctx, authUser) => {
          const user = await ctx.db
            .query("users")
            .withIndex("by_authId", (q) => q.eq("authId", authUser._id))
            .unique();
          if (!user) throw new Error("Application user not found");

          return await ctx.db.patch("users", user._id, { name: authUser.name });
        },
        onDelete: async () => {
          // Keep actor records so historical attribution remains available.
        },
      },
    },
  },
);

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const baseURL =
    env.SERVER_URL ??
    (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3001");
  return {
    database: authComponent.adapter(ctx),
    // All auth requests will be proxied through your TanStack Start server
    baseURL,
    trustedOrigins: [baseURL],
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 10,
      },
      expiresIn: 60 * 60 * 24 * 30, // 30 days
    },

    // Simple non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      username(),
      admin({
        ac,
        roles: {
          admin: adminRole,
          user: userRole,
          cashier: cashierRole,
        },
      }),
      // The Convex plugin is required
      convex({
        authConfig,
        jwksRotateOnTokenGenerationError: true,
      }),
    ],
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};

export type SessionWithRole = ReturnType<typeof createAuth>["$Infer"]["Session"];

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authUser._id))
      .unique();
    if (!appUser) throw new Error("Application user not found");

    return { ...authUser, actorId: appUser._id };
  },
});

export const authedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    return { authUser };
  }),
);

export const authedQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    return { authUser };
  }),
);

export type AuthenticatedQueryCtx = CustomCtx<typeof authedQuery>;

export async function requireAppUser(
  ctx: Pick<AuthenticatedQueryCtx, "authUser" | "db">,
) {
  if (!ctx.authUser) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", ctx.authUser!._id))
    .unique();

  if (!user) throw new Error("Application user not found");
  return user;
}
