import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { Badge } from "@dg/ui/components/badge";
import { Button } from "@dg/ui/components/button";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { CheckCircle2Icon } from "lucide-react";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";

import { DeleteJoAlertDialog } from "@/components/jo/delete-jo-alert-dialog";
import { InventoryUsedCard } from "@/components/jo/inventory-used-card";
import { JobOrderSummaries } from "@/components/jo/job-order-summaries";
import { OnlineOrderDetailsCard } from "@/components/jo/online-order-details-card";
import { OrderItemsCard } from "@/components/jo/order-items-card";
import { OrderSummaryCard } from "@/components/jo/order-summary-card";
import { PaymentsCard } from "@/components/jo/payment-card";
import { Container } from "@/components/layouts/container";
import { PrintJoButton } from "@/components/printer/print-jo-button";

export const Route = createFileRoute("/_authenticated/jo/$joId")({
  component: JoDetailComponent,
  loader: async ({ context, params }) => {
    const id = params.joId as Id<"jo">;

    const [jo] = await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.jo.getOneComplete, { id })),
      context.queryClient.ensureQueryData(
        convexQuery(api.shop.orders.getOnlineOrderDetails, { joId: id }),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.inventory.listUsageByJobOrder, {
          jobOrderId: id,
          paginationOpts: { numItems: 10, cursor: null },
        }),
      ),
    ]);

    return {
      joId: id,
      joNumber: jo?.joNumber,
      crumb: [
        { value: "Job Order", href: "/jo/", type: "static" },
        { value: params.joId, href: `/jo/${params.joId}`, type: "jo" },
      ],
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        name: "description",
        content: "My App is a web application",
      },
      {
        title: `Job Order #${loaderData?.joNumber} | DG`,
      },
    ],
  }),
});

function JoDetailComponent() {
  const { joId } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  useHotkeys("b", () => navigate({ to: "/jo" }));

  return (
    <Container className="pwa-padding flex flex-col">
      <JobOrderHeader />
      <div className="grid gap-2 md:gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-2 md:gap-4 lg:col-span-2">
          <JobOrderSummaries joId={joId} />
          <OnlineOrderDetailsCard joId={joId} />
          <OrderSummaryCard joId={joId} />
          <OrderItemsCard joId={joId} />
          <InventoryUsedCard joId={joId} />
        </div>
        <PaymentsCard joId={joId} />
      </div>
    </Container>
  );
}

function JobOrderHeader() {
  const { joId } = Route.useLoaderData();
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));
  const confirmOnlineOrder = useMutation(api.shop.orders.confirmOnlineOrder);
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);

  if (!jo) {
    return <div> Error JO Not Found</div>;
  }

  const balance = jo.totalPayments - jo.totalOrderValue;
  const getStatusBadge = () => {
    if (jo.status === "unconfirmed") {
      return (
        <Badge variant="destructive" className="bg-amber-500/10 text-amber-600">
          Unconfirmed
        </Badge>
      );
    }

    if (balance >= 0) {
      return (
        <Badge
          variant="destructive"
          className="bg-green-500/10 text-green-600 focus-visible:ring-green-500/20 dark:bg-green-500/20 dark:focus-visible:ring-green-500/40 [a]:hover:bg-green-500/20"
        >
          Paid
        </Badge>
      );
    } else if (jo.totalPayments > 0) {
      return (
        <Badge
          variant="destructive"
          className="bg-amber-500/10 text-amber-500 focus-visible:ring-amber-500/20 dark:bg-amber-500/20 dark:focus-visible:ring-amber-500/40 [a]:hover:bg-amber-500/20"
        >
          Partial
        </Badge>
      );
    } else {
      return <Badge variant="destructive">Unpaid</Badge>;
    }
  };

  async function handleConfirm() {
    setIsConfirming(true);
    try {
      await confirmOnlineOrder({ joId });
      await queryClient.invalidateQueries();
      toast.success("Online order confirmed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to confirm order.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="flex items-center justify-between py-4 md:py-0">
      <div className="flex flex-col pr-4 md:gap-0">
        <h1 className="text-2xl font-bold">{jo.name}</h1>
        <div className="flex gap-2">
          <p className="text-sm text-muted-foreground">Job Order #{jo.joNumber}</p>
          {getStatusBadge()}
          {jo.source === "online-order" ? <Badge variant="outline">Online</Badge> : null}
        </div>
      </div>
      <div className="flex gap-2">
        {jo.status === "unconfirmed" && jo.source === "online-order" ? (
          <Button onClick={handleConfirm} disabled={isConfirming}>
            <CheckCircle2Icon className="h-4 w-4" />
            {isConfirming ? "Confirming" : "Confirm Order"}
          </Button>
        ) : null}
        {jo.status !== "unconfirmed" ? <PrintJoButton jo={jo} /> : null}
        <DeleteJoAlertDialog
          joId={joId}
          joName={jo.name}
          joNumber={String(jo.joNumber)}
        />
      </div>
    </div>
  );
}
