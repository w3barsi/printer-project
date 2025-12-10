import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ConvexReactClient } from "convex/react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { ThemeProvider } from "@/contexts/theme-context";

import { authClient } from "@/lib/auth-client.ts";
import { authQueryOptions, type AuthQueryResult } from "@/lib/auth/queries";
import appCss from "../styles.css?url";

// import { fetchAuth } from "@/server/functions.ts"

interface MyRouterContext {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
  user: AuthQueryResult["user"] | null;
  token: string | null;
  impersonatedBy: string | null | undefined;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async (ctx) => {
    const { user, token, impersonatedBy } =
      await ctx.context.queryClient.ensureQueryData(authQueryOptions()); // we're using react-query for caching, see router.tsx

    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    console.log(
      "[BEFORE-LOAD] ",
      user ? `User is populated ${JSON.stringify(user)}` : "No user",
      `\n[TOKEN] ${token}`,
    );

    return { user, token, impersonatedBy };
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
        title: "DARCYGRAPHiX Advertising",
      },
      {
        name: "theme-color",
        content: "#1a1a1a",
      },
      {
        name: "description",
        content: "Business management system for DARCYGRAPHiX Advertising",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "DARCYGRAPHiX",
      },
      {
        name: "apple-mobile-web-app-orientations",
        content: "portrait,landscape",
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
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered: ", registration);
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError);
        });
    }
  }, []);

  return (
    <ConvexBetterAuthProvider client={context.convexClient} authClient={authClient}>
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

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // suppress since we're updating the "dark" class in ThemeProvider
    <html suppressHydrationWarning lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
        <TanStackDevtools
          plugins={[
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
