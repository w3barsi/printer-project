import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/(main)/(cashier)")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/login" })
    if (context.user.role !== "cashier" && context.user.role !== "admin")
      throw redirect({ to: "/jo" })
  },
})
