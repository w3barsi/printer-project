import { convexQuery } from "@convex-dev/react-query";
import { shareApi } from "@dg/drive/share-api";
import { createFileRoute } from "@tanstack/react-router";

import { PublicShareBrowser } from "@/components/public-share-browser";

export const Route = createFileRoute("/share/$token/{-$itemId}")({
  component: SharePage,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const root = await qc.ensureQueryData(
      convexQuery(shareApi.getSharedRoot, { token: params.token }),
    );
    if (root.status !== "available") return root;
    const itemId = params.itemId;
    if (itemId) {
      await Promise.all([
        qc.ensureQueryData(
          convexQuery(shareApi.listSharedItems, {
            token: params.token,
            parentId: itemId,
          }),
        ),
        qc.ensureQueryData(
          convexQuery(shareApi.getSharedFilePreview, {
            token: params.token,
            itemId,
          }),
        ),
      ]);
    } else if (root.item.kind === "folder") {
      await qc.ensureQueryData(
        convexQuery(shareApi.listSharedItems, { token: params.token }),
      );
    } else {
      await qc.ensureQueryData(
        convexQuery(shareApi.getSharedFilePreview, {
          token: params.token,
          itemId: root.item._id,
        }),
      );
    }
    return root;
  },
  head: () => ({
    meta: [
      { title: "Shared item | DG" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function SharePage() {
  const params = Route.useParams();
  return <PublicShareBrowser token={params.token} itemId={params.itemId} />;
}
