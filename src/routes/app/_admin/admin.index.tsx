import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/_admin/admin/")({
  component: RouteComponent,
  beforeLoad: () => {
    throw redirect({ to: "/app/admin/users" });
  },
});

function RouteComponent() {
  return <div>Hello "/app/_admin/admin/"!</div>;
}
