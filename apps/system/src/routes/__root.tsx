import {
  ConvexBetterAuthProvider,
  type AuthClient as ConvexAuthClient,
} from "@convex-dev/better-auth/react";
import { convexQuery, type ConvexQueryClient } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import { TooltipProvider } from "@dg/ui/components/tooltip";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { ThemedToaster } from "@/components/themed-toaster";
import { DeviceProvider } from "@/contexts/device-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";

import appCss from "../styles.css?url";

interface SystemRouterContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return (await getToken()) ?? null;
});

const authQueryOptions = queryOptions({
  queryKey: ["auth"],
  queryFn: getAuth,
  staleTime: 5 * 60 * 1000,
});

export const Route = createRootRouteWithContext<SystemRouterContext>()({
  beforeLoad: async ({ context }) => {
    const token = await context.queryClient.ensureQueryData(authQueryOptions);
    let user = null;

    if (token) {
      context.convexQueryClient.serverHttpClient?.setAuth(token);
      user = await context.queryClient.ensureQueryData(
        convexQuery(api.auth.getCurrentUser, {}),
      );
    }

    return { isAuthenticated: Boolean(token), token, user };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DARCYGRAPHiX System" },
      {
        name: "description",
        content: "Business management system for DARCYGRAPHiX Advertising.",
      },
      { name: "theme-color", content: "#1a1a1a" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "DARCYGRAPHiX" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/logo512.png" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { convexQueryClient, token } = Route.useRouteContext();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return (
    <ConvexBetterAuthProvider
      client={convexQueryClient.convexClient}
      // The provider's broad plugin union does not accept Better Auth's inferred plugin tuple.
      authClient={authClient as unknown as ConvexAuthClient}
      initialToken={token}
    >
      <TooltipProvider>
        <DeviceProvider>
          <RootDocument>
            <Outlet />
          </RootDocument>
        </DeviceProvider>
      </TooltipProvider>
    </ConvexBetterAuthProvider>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <ThemedToaster richColors position="top-center" />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
