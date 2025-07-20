import { convexAdapter } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth"
import type { GenericCtx } from "../../convex/_generated/server"
import { betterAuthComponent } from "../../convex/auth"

const URL = process.env.VERCEL_URL ?? "http://localhost:3000"

export const createAuth = (ctx: GenericCtx) =>
  // Configure your Better Auth instance here
  betterAuth({
    // All auth requests will be proxied through your TanStack Start server
    logger: {
      level: "debug",
    },
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
      // The Convex plugin is required
      convex(),
    ],
  })
