import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";

import { formatOptionalDate } from "@/components/jo/job-order-formatters";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function JobOrderSummaries({ joId }: { joId: Id<"jo"> }) {
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));

  if (!jo) {
    return <div> Error JO Not Found</div>;
  }

  const itemCount = jo.items.reduce((acc, curr) => acc + curr.quantity, 0);
  const createdAt = new Date(Number(jo._creationTime)).toLocaleDateString();

  return (
    <div>
      <div>
        <Card className="block p-0 md:hidden">
          <CardContent className="flex gap-2 p-4">
            <div className="flex w-full flex-col items-center">
              <h3 className="text-muted-foreground">PICKUP DATE</h3>
              <p>{formatOptionalDate(jo.pickupDate)}</p>
            </div>
            <Separator orientation="vertical" />
            <div className="flex w-full flex-col items-center">
              <h3 className="text-muted-foreground">PICKUP DATE</h3>
              <p>{createdAt}</p>
            </div>
            <Separator orientation="vertical" />
            <div className="flex w-full flex-col items-center">
              <h3 className="text-muted-foreground">TOTAL ITEMS</h3>
              <p>
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="hidden w-full flex-col gap-2 md:flex md:flex-row md:gap-4">
        <Card className="flex-1 gap-0">
          <CardHeader>
            <CardDescription>PICKUP DATE</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl">{formatOptionalDate(jo.pickupDate)}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 gap-0">
          <CardHeader>
            <CardDescription>CREATED AT</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl">{createdAt}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 gap-0">
          <CardHeader>
            <CardDescription>TOTAL ITEMS</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
