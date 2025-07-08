import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/jo")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="flex justify-center">
			<Outlet />
		</div>
	)
}
