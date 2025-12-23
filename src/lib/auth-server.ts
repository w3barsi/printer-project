import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { isAuthError } from "./utils";

export const { handler, getToken, fetchAuthQuery, fetchAuthAction, fetchAuthMutation } =
  convexBetterAuthReactStart({
    convexUrl: process.env.VITE_CONVEX_URL!,
    convexSiteUrl: process.env.VITE_CONVEX_SITE_URL!,
    jwtCache: {
      enabled: true,
      isAuthError,
    },
  });
