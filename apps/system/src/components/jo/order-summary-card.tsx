import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@dg/ui/components/card";
import { Separator } from "@dg/ui/components/separator";
import { cn } from "@dg/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";

import { formatCurrency } from "@/components/jo/job-order-formatters";

export function OrderSummaryCard({ joId }: { joId: Id<"jo"> }) {
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));

  if (!jo) {
    return <div> Error JO Not Found</div>;
  }

  const balance = jo.totalPayments - jo.totalOrderValue;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 md:gap-4">
          <div className="flex items-center justify-between">
            <p>Total Order Value</p>
            <p className="font-mono text-xl">{formatCurrency(jo.totalOrderValue)}</p>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p>Total Payments</p>
            <p className="font-mono text-xl">{formatCurrency(jo.totalPayments)}</p>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p>Balance</p>
            <p
              className={cn(
                "font-mono text-xl",
                balance >= 0 ? "text-green-600" : "text-red-700",
              )}
            >
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
