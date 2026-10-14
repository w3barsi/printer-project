import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { Button } from "@dg/ui-coss/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, CalculatorIcon } from "lucide-react";

import { PricingItemDetails } from "@/components/3d/pricing/pricing-item-details";
import { DefaultCatchBoundary } from "@/components/default-catch-boundary";
import { Container } from "@/components/layouts/container";

export const Route = createFileRoute("/_authenticated/3d/pricing_/$itemId")({
  component: ThreeDPricingItemPage,
  errorComponent: DefaultCatchBoundary,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const itemId = params.itemId as Id<"printPricingItems">;
    const item = await qc.ensureQueryData(
      convexQuery(api.printPricing.items.getItem, { itemId }),
    );
    await qc.ensureQueryData(
      convexQuery(api.printPricing.calculations.listByItem, { itemId }),
    );

    return {
      itemId,
      itemName: item?.name,
      crumb: [
        { value: "3D", href: "/3d", type: "static" },
        { value: "3D Pricing", href: "/3d/pricing", type: "static" },
        {
          value: item?.name ?? "Item unavailable",
          href: `/3d/pricing/${params.itemId}`,
          type: "static",
        },
      ],
    };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.itemName ?? "Pricing item"} | DG` }],
  }),
});

function ThreeDPricingItemPage() {
  const { itemId } = Route.useLoaderData();
  const { data: item } = useSuspenseQuery(
    convexQuery(api.printPricing.items.getItem, { itemId }),
  );

  if (!item) {
    return (
      <Container className="flex min-h-[calc(100svh-4.1rem)] items-center justify-center px-4 py-10">
        <div className="max-w-md text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-card text-muted-foreground">
            <CalculatorIcon />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Pricing item unavailable
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This item may have been deleted or is no longer available.
          </p>
          <Button variant="outline" className="mt-6" render={<Link to="/3d/pricing" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            Back to 3D Pricing
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-4">
      <PricingItemDetails key={item._id} item={item} />
    </Container>
  );
}
