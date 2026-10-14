import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import { createFileRoute } from "@tanstack/react-router";
import { CalculatorIcon } from "lucide-react";
import { Suspense } from "react";

import { PresetManagerDialog } from "@/components/3d/pricing/preset-manager-dialog";
import { CreatePricingItemDialog } from "@/components/3d/pricing/pricing-item-dialogs";
import {
  PRICING_ITEMS_PAGE_SIZE,
  PricingItemsTable,
  PricingItemsTableSkeleton,
} from "@/components/3d/pricing/pricing-items-table";
import { DefaultCatchBoundary } from "@/components/default-catch-boundary";
import { Container } from "@/components/layouts/container";

export const Route = createFileRoute("/_authenticated/3d/pricing")({
  component: ThreeDPricingPage,
  errorComponent: DefaultCatchBoundary,
  loader: async ({ context: { queryClient: qc } }) => {
    await qc.ensureQueryData(
      convexQuery(api.printPricing.items.listItems, {
        paginationOpts: {
          numItems: PRICING_ITEMS_PAGE_SIZE,
          cursor: null,
        },
      }),
    );

    return {
      crumb: [
        { value: "3D", href: "/3d", type: "static" },
        { value: "3D Pricing", href: "/3d/pricing", type: "static" },
      ],
    };
  },
  head: () => ({
    meta: [{ title: "3D Pricing | DG" }],
  }),
});

function ThreeDPricingPage() {
  return (
    <Container className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CalculatorIcon className="text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">3D Pricing</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Price prints from material, machine, labor, and profit settings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PresetManagerDialog />
          <CreatePricingItemDialog />
        </div>
      </div>

      <Suspense fallback={<PricingItemsTableSkeleton />}>
        <PricingItemsTable />
      </Suspense>
    </Container>
  );
}
