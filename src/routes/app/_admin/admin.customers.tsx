import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/_admin/admin/customers")({
  component: Outlet,
});
