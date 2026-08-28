import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/newdrive/")({
  beforeLoad: () => {
    throw redirect({ to: "/drive", replace: true });
  },
});
