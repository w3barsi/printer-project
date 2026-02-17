import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
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

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { ThemeProvider } from "@/contexts/theme-context";

import { authClient } from "@/lib/auth-client.ts";
import { getToken } from "@/lib/auth-server";
import { createServerFn } from "@tanstack/react-start";
import appCss from "../styles.css?url";

// import { fetchAuth } from "@/server/functions.ts"

interface MyRouterContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return (await getToken()) ?? null;
});
const authQueryOptions = queryOptions({
  queryKey: ["auth"],
  queryFn: getAuth,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async (ctx) => {
    const token = await ctx.context.queryClient.ensureQueryData(authQueryOptions);

    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return { isAuthenticated: !!token, token };
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
        name: "mobile-web-app-capable",
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
      {
        rel: "apple-touch-icon",
        href: "/logo512.png",
      },
    ],
    scripts: [
      {
        src: "https://cdn.jsdelivr.net/npm/ios-pwa-splash@1.0.0/cdn.min.js",
      },
      {
        children: "iosPWASplash('/logo512.png', '#000000')",
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
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
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
