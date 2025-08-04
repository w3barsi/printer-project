import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(main)/(cashier)/cashflow")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/(main)/(cashier)/cashflow"!</div>;
}
