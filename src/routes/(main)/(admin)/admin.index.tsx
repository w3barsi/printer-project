import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/(main)/(admin)/admin/")({
  component: RouteComponent,
  beforeLoad: () => {
    throw redirect({ to: "/admin/users" })
  },
})

function RouteComponent() {
  return <div>Hello "/(main)/(admin)/admin/"!</div>
}
