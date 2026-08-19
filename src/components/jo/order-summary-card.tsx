import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";

import { formatCurrency } from "@/components/jo/job-order-formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
