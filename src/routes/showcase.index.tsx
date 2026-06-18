import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/showcase/")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "services" });
  },
});
