import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { DefaultCatchBoundary } from "./components/default-catch-boundary";
import { DefaultNotFound } from "./components/default-not-found";
import { env } from "./env/client";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const convexQueryClient = new ConvexQueryClient(env.VITE_CONVEX_URL);
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
    context: { queryClient, convexQueryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: DefaultNotFound,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    handleRedirects: true,
    wrapQueryClient: true,
  });

  return router;
}
