import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(main)/jo/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div id="jo-print" className="h-full w-full items-center justify-center p-4 lg:flex">
      <p className="pb-32">No Job Order Selected</p>
    </div>
  )
}
