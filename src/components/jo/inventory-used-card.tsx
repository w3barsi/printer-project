import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, ArrowRightIcon, PackageMinusIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

const inventoryDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function InventoryUsedCard({ joId }: { joId: Id<"jo"> }) {
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.inventory.listUsageByJobOrder, {
      jobOrderId: joId,
      paginationOpts: { numItems: 10, cursor },
    }),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Inventory Used</CardTitle>
          <CardDescription>Stock usage recorded against this Job Order.</CardDescription>
        </div>
        {data.page.length > 0 && (
          <Badge variant="secondary">Page {cursorHistory.length + 1}</Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {data.page.length ? (
          <div className="flex flex-col gap-3">
            {data.page.map((activity) => (
              <article
                key={activity._id}
                className="flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{activity.itemNameAfter}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {activity.supplierNameAfter ?? "No supplier"}
                    </p>
                  </div>
                  <Badge variant="destructive" className="tabular-nums">
                    {Math.abs(activity.quantityDelta).toLocaleString()} used
                  </Badge>
                </div>
                <p className={cn("text-sm", !activity.reason && "text-muted-foreground")}>
                  {activity.reason ?? "No reason provided"}
                </p>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Recorded by {activity.actorName}</span>
                  <time>{inventoryDateTimeFormatter.format(activity._creationTime)}</time>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty className="min-h-48">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageMinusIcon />
              </EmptyMedia>
              <EmptyTitle>No inventory usage recorded for this Job Order</EmptyTitle>
              <EmptyDescription>
                Linked stock usage will appear here as immutable activity.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {(cursorHistory.length > 0 || !data.isDone) && (
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetching || cursorHistory.length === 0}
              onClick={() => setCursorHistory((history) => history.slice(0, -1))}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Newer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetching || data.isDone}
              onClick={() => {
                if (!data.isDone) {
                  setCursorHistory((history) => [...history, data.continueCursor]);
                }
              }}
            >
              Older
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
