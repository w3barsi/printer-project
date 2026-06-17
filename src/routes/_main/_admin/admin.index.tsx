import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/_admin/admin/")({
  component: RouteComponent,
  beforeLoad: () => {
    throw redirect({ to: "/admin/users" });
  },
});

function RouteComponent() {
  return <div>Hello "/_main/_admin/admin/"!</div>;
}
