import { convexAdapter } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth"
import { admin, username } from "better-auth/plugins"
import type { GenericCtx } from "../../convex/_generated/server"
import { betterAuthComponent } from "../../convex/auth"
import { ac, adminRole, basicRole } from "./auth-access-controls"

const URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000"

export const createAuth = (ctx: GenericCtx) =>
  // Configure your Better Auth instance here
  betterAuth({
    user: {
      additionalFields: {
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
        maxAge: 5 * 60,
      },
    },

    database: convexAdapter(ctx, betterAuthComponent),

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
  })

export type SessionWithRole = ReturnType<typeof createAuth>["$Infer"]["Session"]
