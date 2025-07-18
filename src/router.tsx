import { routerWithQueryClient } from "@tanstack/react-router-with-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"

import "./styles.css"
import { QueryClient } from "@tanstack/react-query"
import { ConvexQueryClient } from "@convex-dev/react-query"
import { ConvexProvider, ConvexReactClient } from "convex/react"

import { routeTree } from "./routeTree.gen"
import { NotFound } from "./components/not-found"

// Create a new router instance
export function createRouter() {
	const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!
	if (!CONVEX_URL) {
		console.error("missing envar VITE_CONVEX_URL")
	}

	const convex = new ConvexReactClient(CONVEX_URL, {
		unsavedChangesWarning: false,
	})

	const convexQueryClient = new ConvexQueryClient(convex)

	const queryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
	})

	convexQueryClient.connect(queryClient)

	const router = routerWithQueryClient(
		createTanStackRouter({
			routeTree,
			defaultPreload: "intent",
			defaultPreloadStaleTime: 0,
			context: { queryClient, convexClient: convex, convexQueryClient },
			scrollRestoration: true,
			defaultNotFoundComponent: NotFound,
			Wrap: ({ children }) => (
				<ConvexProvider client={convexQueryClient.convexClient}>
					{children}
				</ConvexProvider>
			),
		}),
		queryClient,
	)

	return router
}
// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>
	}
}
