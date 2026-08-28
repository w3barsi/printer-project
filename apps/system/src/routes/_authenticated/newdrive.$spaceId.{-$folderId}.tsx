import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/newdrive/$spaceId/{-$folderId}")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/drive/$spaceId/{-$folderId}",
      params: { spaceId: params.spaceId, folderId: params.folderId },
      replace: true,
    });
  },
});
