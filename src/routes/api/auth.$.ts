import { createServerFileRoute } from "@tanstack/react-start/server"
import { reactStartHandler } from "@convex-dev/better-auth/react-start"

export const ServerRoute = createServerFileRoute("/api/auth/$").methods({
	GET: ({ request }) => {
		console.log("AUTH GET REACHED")
		return reactStartHandler(request)
	},
	POST: ({ request }) => {
		console.log("AUTH POST REACHED")
		return reactStartHandler(request)
	},
})
