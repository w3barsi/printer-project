import { createFileRoute } from "@tanstack/react-router"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { CanvasPrinterComponent } from "./-components/canvas-printer"

export const Route = createFileRoute("/printer/$joId")({
	component: RouteComponent,
	notFoundComponent: () => <div>Not Found</div>,
	loader: async ({ context }) => {
		await context.queryClient.prefetchQuery(
			convexQuery(api.jo.getJosWithItems, {}),
		)
	},
})
// --- Main Page Component ---
function RouteComponent() {
	const { joId } = Route.useParams()

	return <CanvasPrinterComponent joId={joId} />
}
