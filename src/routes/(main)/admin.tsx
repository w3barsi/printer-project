import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(main)/admin")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(main)/admin"!</div>
}
