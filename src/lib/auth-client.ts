import { convexClient } from "@convex-dev/better-auth/client/plugins"
import { adminClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  plugins: [adminClient(), convexClient()],
})
