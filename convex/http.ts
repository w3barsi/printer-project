import { httpRouter } from "convex/server"
import { createAuth } from "../src/lib/auth"
import { betterAuthComponent } from "./auth"

const http = httpRouter()

betterAuthComponent.registerRoutes(http, createAuth, {
  cors: true,
})

export default http
