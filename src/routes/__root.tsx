import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { authClient } from "@/lib/auth-client.ts";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { fetchSession, getCookieName } from "@convex-dev/better-auth/react-start";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  ScriptOnce,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getWebRequest } from "@tanstack/react-start/server";
import type { ConvexReactClient } from "convex/react";
import type { SessionWithRole } from "../../convex/auth";
import appCss from "../styles.css?url";

// import { fetchAuth } from "@/server/functions.ts"

export const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { createAuth } = await import("../../convex/auth");
  const { session: rawSession } = await fetchSession(getWebRequest());
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

export type AuthType = Awaited<ReturnType<typeof fetchAuth>>;

interface MyRouterContext {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
  user: Awaited<ReturnType<typeof fetchAuth>>["user"] | null;
  token: string | null;
  impersonatedBy: string | null | undefined;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async (ctx) => {
    const auth = await ctx.context.queryClient.ensureQueryData({
      queryKey: ["user"],
      queryFn: ({ signal }) => fetchAuth({ signal }),
      revalidateIfStale: true,
    }); // we're using react-query for caching, see router.tsx

    const { user, token } = auth;

    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    console.log(
      "[BEFORE-LOAD] ",
      user ? `User is populated ${JSON.stringify(user)}` : "No user",
    );

    return { user: user, token: token, impersonatedBy: auth.impersonatedBy };
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "preload",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
        as: "style",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });

  return (
    <ConvexBetterAuthProvider client={context.convexClient} authClient={authClient}>
      <TooltipProvider>
        <DeviceProvider>
          <RootDocument>
            <Toaster richColors position="top-center" />
            <Outlet />
            <ReactQueryDevtools />
            <TanStackRouterDevtools position="bottom-right" />
          </RootDocument>
        </DeviceProvider>
      </TooltipProvider>
    </ConvexBetterAuthProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ScriptOnce>
          {`document.documentElement.classList.toggle(
            'dark',
            localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
            )`}
        </ScriptOnce>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
