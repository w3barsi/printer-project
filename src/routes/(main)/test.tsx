import { createFileRoute } from "@tanstack/react-router"
import { Container } from "@/components/layouts/container"

export const Route = createFileRoute("/(main)/test")({
	component: RouteComponent,
})

function RouteComponent() {
	return <Container>Hello "/jo/test"!</Container>
}
