import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { Button } from "@dg/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, PackageXIcon } from "lucide-react";

import { DefaultCatchBoundary } from "@/components/default-catch-boundary";
import { InventoryItemDetails } from "@/components/inventory/item-details";
import { Container } from "@/components/layouts/container";

export const Route = createFileRoute("/_authenticated/inventory_/$id")({
  component: InventoryItemPage,
  errorComponent: DefaultCatchBoundary,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const inventoryItemId = params.id as Id<"inventoryItems">;
    const item = await qc.ensureQueryData(
      convexQuery(api.inventory.getItem, { inventoryItemId }),
    );

    return {
      inventoryItemId,
      itemName: item?.name,
      crumb: [
        { value: "Inventory", href: "/inventory", type: "static" },
        {
          value: item?.name ?? "Item unavailable",
          href: `/inventory/${params.id}`,
          type: "static",
        },
      ],
    };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.itemName ?? "Inventory item"} | DG` }],
  }),
});

function InventoryItemPage() {
  const { inventoryItemId } = Route.useLoaderData();
  const { data: item } = useSuspenseQuery(
    convexQuery(api.inventory.getItem, { inventoryItemId }),
  );

  if (!item) {
    return (
      <Container className="flex min-h-[calc(100svh-4.1rem)] items-center justify-center px-4 py-10">
        <div className="max-w-md text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-card text-muted-foreground">
            <PackageXIcon />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Inventory item unavailable
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This item may have been deleted or is no longer available.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            nativeButton={false}
            render={<Link to="/inventory" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Back to inventory
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-4">
      <InventoryItemDetails item={item} />
    </Container>
  );
}
