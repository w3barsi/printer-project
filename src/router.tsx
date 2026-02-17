import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { DefaultCatchBoundary } from "./components/default-catch-boundary";
import { DefaultNotFound } from "./components/default-not-found";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
  if (!CONVEX_URL) {
    console.error("missing envar VITE_CONVEX_URL");
  }

  const convexQueryClient = new ConvexQueryClient(CONVEX_URL, { expectAuth: true });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  });

  convexQueryClient.connect(queryClient);

  const router = createRouter({
    routeTree,
    context: {
      queryClient,
      convexQueryClient,
    },
    defaultPreload: "intent",
    // react-query will handle data fetching & caching
    // https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#passing-all-loader-events-to-an-external-cache
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: DefaultNotFound,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}
