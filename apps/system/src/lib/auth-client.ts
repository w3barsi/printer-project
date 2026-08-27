import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { ac, adminRole, cashierRole, userRole } from "@dg/auth";
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient({
      ac,
      roles: {
        admin: adminRole,
        user: userRole,
        cashier: cashierRole,
      },
    }),
    convexClient(),
  ],
});
