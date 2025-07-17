import {
	HeadContent,
	Outlet,
	ScriptOnce,
	Scripts,
	createRootRouteWithContext,
	useRouteContext,
} from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { getCookie, getWebRequest } from "@tanstack/react-start/server"
import appCss from "../styles.css?url"
import type { ConvexQueryClient } from "@convex-dev/react-query"
import type { QueryClient } from "@tanstack/react-query"
import type { ConvexReactClient } from "convex/react"
import { authClient } from "@/lib/auth-client.ts"
import { fetchSession, getCookieName } from "@/lib/auth-utils"

// import { fetchAuth } from "@/server/functions.ts"

const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
	const sessionCookieName = await getCookieName()
	const token = getCookie(sessionCookieName)
	const request = getWebRequest()
	const { session } = await fetchSession(request)
	console.log("[BEFORE-LOAD (fetchAuth)] ", "fetching auth details")
	return {
		user: session?.user ?? undefined,
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
	beforeLoad: async (ctx) => {
		const auth = await ctx.context.queryClient.fetchQuery({
			queryKey: ["user"],
			queryFn: ({ signal }) => fetchAuth({ signal }),
		}) // we're using react-query for caching, see router.tsx

		const { user, token } = auth

		if (token) {
			ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
		}

		// const user = await ctx.context.queryClient.fetchQuery(
		// 	convexQuery(api.auth.getCurrentUser, {}),
		// )
		console.log("[BEFORE-LOAD] ", user ? "User is populated" : "No user")

		return { user: user, token: token }
	},
	component: RootComponent,
})

function RootComponent() {
	const context = useRouteContext({ from: Route.id })
	const theme = Route.useLoaderData()
	return (
		<ConvexBetterAuthProvider
			client={context.convexClient}
			authClient={authClient}
		>
			<RootDocument>
				<Outlet />
				{/* <TanStackRouterDevtools /> */}
				{/* <TanStackQueryLayout /> */}
			</RootDocument>
		</ConvexBetterAuthProvider>
	)
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
	)
}
