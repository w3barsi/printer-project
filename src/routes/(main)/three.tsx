import { createFileRoute } from "@tanstack/react-router";

import { Container } from "@/components/layouts/container";

export const Route = createFileRoute("/(main)/three")({
  component: RouteComponent,
  loader: () => ({
    crumb: [{ value: "3D Viewer", href: "/three", type: "static" }],
  }),
  head: () => ({
    meta: [{ title: "3D Viewer | DG" }],
  }),
});

function RouteComponent() {
  return <Container className="flex h-full flex-col gap-4">To be made</Container>;
}
