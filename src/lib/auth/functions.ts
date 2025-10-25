import { fetchSession, getCookieName } from "@convex-dev/better-auth/react-start";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequest } from "@tanstack/react-start/server";

import type { SessionWithRole } from "../../../convex/auth";

// import { fetchAuth } from "@/server/functions.ts"

export const $fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { createAuth } = await import("../../../convex/auth");
  const { session: rawSession } = await fetchSession(getRequest());
  const session = rawSession as SessionWithRole;
  const sessionCookieName = getCookieName(createAuth);
  const token = getCookie(sessionCookieName);
  console.log("[BEFORE-LOAD (fetchAuth)] ", "fetching auth details");
  return {
    user: session?.user,
    impersonatedBy: session?.session.impersonatedBy,
    token,
  };
});
