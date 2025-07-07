import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	useRouteContext,
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

import { createServerFn } from "@tanstack/react-start"
import {
	fetchSession,
	getCookieName,
} from "@convex-dev/better-auth/react-start"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { getCookie, getWebRequest } from "@tanstack/react-start/server"
import { createAuth } from "@convex/auth.ts"
import Header from "../components/Header"

import TanStackQueryLayout from "../integrations/tanstack-query/layout.tsx"

import appCss from "../styles.css?url"

import type { QueryClient } from "@tanstack/react-query"
import type { ConvexReactClient } from "convex/react"
import type { ConvexQueryClient } from "@convex-dev/react-query"
import { authClient } from "@/lib/auth-client.ts"

const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
	const sessionCookieName = await getCookieName(createAuth)
	const token = getCookie(sessionCookieName)
	const request = getWebRequest()
	const { session } = await fetchSession(createAuth, request)
	return {
		userId: session?.user.id,
		token,
	}
})

interface MyRouterContext {
	queryClient: QueryClient
	convexClient: ConvexReactClient
	convexQueryClient: ConvexQueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
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
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	beforeLoad: async (ctx) => {
		const auth = await fetchAuth()
		const { userId, token } = auth

		if (token) {
			ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
		}

		return { userId, token }
	},
	component: RootComponent,
})

function RootComponent() {
	const context = useRouteContext({ from: Route.id })
	return (
		<ConvexBetterAuthProvider
			client={context.convexClient}
			authClient={authClient}
		>
			<RootDocument>
				<Header />

				<Outlet />
				<TanStackRouterDevtools />

				<TanStackQueryLayout />
			</RootDocument>
		</ConvexBetterAuthProvider>
	)
}

function RootDocument({ children }: { children: React.ReactNode }) {
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
	)
}
