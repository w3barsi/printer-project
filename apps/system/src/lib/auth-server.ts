import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { ConvexError } from "convex/values";

import { serverEnv } from "@/env/server";

function isAuthError(error: unknown) {
  const message =
    (error instanceof ConvexError && error.data) ||
    (error instanceof Error && error.message) ||
    "";

  return /auth/i.test(message);
}

const auth = convexBetterAuthReactStart({
  convexUrl: serverEnv.VITE_CONVEX_URL,
  convexSiteUrl: serverEnv.VITE_CONVEX_SITE_URL,
  jwtCache: {
    enabled: true,
    isAuthError,
  },
});

export const getToken = auth.getToken;
export const handler = auth.handler;
