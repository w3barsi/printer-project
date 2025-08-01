import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(main)/(admin)/admin/users")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/(main)/(admin)/admin/users"!</div>;
}
