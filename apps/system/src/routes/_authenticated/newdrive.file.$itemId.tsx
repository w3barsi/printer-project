import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/newdrive/file/$itemId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/drive/file/$itemId",
      params: { itemId: params.itemId },
      replace: true,
    });
  },
});
