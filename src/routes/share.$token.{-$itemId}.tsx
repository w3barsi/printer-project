import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PublicShareBrowser } from "@/components/new-drive/public-share-browser";
import { shareApi } from "@/lib/share-api";

// TanStack adds this route to the generated tree through its normal tooling.
// @ts-expect-error The generated route tree is intentionally not modified here.
export const Route = createFileRoute("/share/$token/{-$itemId}")({
  component: SharePage,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const routeParams = params as unknown as { token: string; itemId?: string };
    const root = await qc.ensureQueryData(
      convexQuery(shareApi.getSharedRoot, { token: routeParams.token }),
    );
    if (root.status !== "available") return root;
    const itemId = routeParams.itemId;
    if (itemId) {
      await Promise.all([
        qc.ensureQueryData(
          convexQuery(shareApi.listSharedItems, {
            token: routeParams.token,
            parentId: itemId,
          }),
        ),
        qc.ensureQueryData(
          convexQuery(shareApi.getSharedFilePreview, {
            token: routeParams.token,
            itemId,
          }),
        ),
      ]);
    } else if (root.item.kind === "folder") {
      await qc.ensureQueryData(
        convexQuery(shareApi.listSharedItems, { token: routeParams.token }),
      );
    } else {
      await qc.ensureQueryData(
        convexQuery(shareApi.getSharedFilePreview, {
          token: routeParams.token,
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
  const params = Route.useParams() as { token: string; itemId?: string };
  return <PublicShareBrowser token={params.token} itemId={params.itemId} />;
}
