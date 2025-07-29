import { reactStartHandler } from "@/lib/auth-utils"
import { createServerFileRoute } from "@tanstack/react-start/server"

export const ServerRoute = createServerFileRoute("/api/auth/$").methods({
  GET: ({ request }) => {
    console.log("GET /api/auth/$")
    return reactStartHandler(request)
  },
  POST: ({ request }) => {
    console.log("POST /api/auth/$")
    return reactStartHandler(request)
  },
})
