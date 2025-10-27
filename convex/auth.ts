import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { admin, username } from "better-auth/plugins";
import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";

import { ac, adminRole, basicRole } from "../src/lib/auth-utils";
import { components, internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
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
          const userId = await ctx.db.insert("users", {
            name: authUser.name,
            username: authUser.username,
            displayUsername: authUser.displayUsername,
            email: authUser.email,
            emailVerified: authUser.emailVerified,
            image: authUser.image,
            createdAt: authUser.createdAt,
            role: authUser.role,
            banned: authUser.banned,
            banReason: authUser.banReason,
          });

          await ctx.runMutation(components.betterAuth.auth.setUserId, {
            authId: authUser._id,
            userId,
          });
        },

        onUpdate: async (ctx, newDoc, oldDoc) => {
          return ctx.db.patch(oldDoc.userId as Id<"users">, {
            name: newDoc.name,
            username: newDoc.username,
            displayUsername: newDoc.displayUsername,
            email: newDoc.email,
            emailVerified: newDoc.emailVerified,
            image: newDoc.image,
            createdAt: newDoc.createdAt,
            role: newDoc.role,
            banned: newDoc.banned,
            banReason: newDoc.banReason,
          });
        },
        onDelete: async (ctx, authUser) => {
          await ctx.db.delete(authUser.userId as Id<"users">);
        },
      },
    },
  },
);

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

const URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) =>
  // Configure your Better Auth instance here
  betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    database: authComponent.adapter(ctx),
    user: {
      additionalFields: {
        userId: {
          type: "string",
          required: false,
        },
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
          input: false, // prevent users from setting role themselves
        },
      },
    },
    // All auth requests will be proxied through your TanStack Start server
    baseURL: URL,
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
          user: basicRole,
          cashier: basicRole,
        },
      }),
      // The Convex plugin is required
      convex(),
    ],
  });

export type SessionWithRole = ReturnType<typeof createAuth>["$Infer"]["Session"];

export const authedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    console.log("[USER] ", user);
    if (!user) throw new Error("[Custom Mutation] Authentication required");
    return { user };
  }),
);

export const authedQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("[Custom Query] Authentication required");
    return { user };
  }),
);
