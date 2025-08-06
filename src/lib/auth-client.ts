import { convexClient } from "@convex-dev/better-auth/client/plugins"
import { adminClient, usernameClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { ac, adminRole, basicRole } from "./auth"

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient({
      ac,
      roels: {
        admin: adminRole,
        user: basicRole,
        cashier: basicRole,
      },
    }),
    convexClient(),
  ],
})
