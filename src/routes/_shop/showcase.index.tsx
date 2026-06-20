import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_shop/showcase/")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "services" });
  },
});
