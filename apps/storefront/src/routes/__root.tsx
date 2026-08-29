import type { ConvexQueryClient } from "@convex-dev/react-query";
import { Toaster } from "@dg/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";

interface StorefrontRouterContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<StorefrontRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DARCYGRAPHiX Advertising & Printing" },
      {
        name: "description",
        content: "Custom signage, printing, and advertising services from DARCYGRAPHiX.",
      },
      { name: "theme-color", content: "#fff5f1" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/DG_SHORT_BORDERED.png" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { convexQueryClient } = Route.useRouteContext();

  return (
    <ConvexProvider client={convexQueryClient.convexClient}>
      <RootDocument>
        <Outlet />
        <Toaster />
      </RootDocument>
    </ConvexProvider>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
