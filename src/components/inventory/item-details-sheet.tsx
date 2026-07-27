import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  HistoryIcon,
  PackageIcon,
  TruckIcon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";

import type { InventoryListItem } from "@/components/inventory/item-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ACTIVITY_PAGE_SIZE = 10;

type InventoryActivity = Doc<"inventoryActivities">;

const operationLabels: Record<InventoryActivity["operation"], string> = {
  item_created: "Item created",
  stock_added: "Stock added",
  stock_removed: "Stock removed",
  quantity_corrected: "Count corrected",
  details_updated: "Details updated",
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function InventoryItemDetailsSheet({
  item,
  open,
  onOpenChange,
}: {
  item: InventoryListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="border-b pr-14">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Inventory item</Badge>
            <span className="text-xs text-muted-foreground">
              Added {dateTimeFormatter.format(item._creationTime)}
            </span>
          </div>
          <SheetTitle className="text-xl">{item.name}</SheetTitle>
          <SheetDescription>{item.supplierName}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-6 p-4 sm:p-6">
            <section aria-labelledby="inventory-balance-heading">
              <div className="flex items-end justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-col gap-1">
                  <h2
                    id="inventory-balance-heading"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Current stock
                  </h2>
                  <p className="text-4xl font-bold tracking-tight tabular-nums">
                    {item.quantity.toLocaleString()}
                  </p>
                </div>
                <PackageIcon className="size-8 text-muted-foreground" />
              </div>
            </section>

            <section
              className="flex flex-col gap-3"
              aria-labelledby="item-details-heading"
            >
              <h2 id="item-details-heading" className="font-semibold">
                Item details
              </h2>
              <dl className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2">
                <Detail icon={TruckIcon} label="Supplier" value={item.supplierName} />
                <Detail icon={UserIcon} label="Created by" value={item.createdByName} />
                <Detail
                  icon={HistoryIcon}
                  label="Created"
                  value={dateTimeFormatter.format(item._creationTime)}
                />
                <Detail icon={PackageIcon} label="Item ID" value={item._id} breakAll />
              </dl>
            </section>

            <Separator />

            <ItemActivity item={item} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  breakAll = false,
}: {
  icon: typeof PackageIcon;
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={cn("font-medium", breakAll && "text-xs break-all")}>{value}</dd>
      </div>
    </div>
  );
}

function ItemActivity({ item }: { item: InventoryListItem }) {
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isFetching } = useQuery(
    convexQuery(api.inventory.listActivities, {
      paginationOpts: {
        numItems: ACTIVITY_PAGE_SIZE,
        cursor,
      },
      inventoryItemId: item._id,
    }),
  );

  return (
    <section className="flex flex-col gap-4" aria-labelledby="item-activity-heading">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="item-activity-heading" className="font-semibold">
            Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            Stock movements and detail changes for this item.
          </p>
        </div>
        {data && <Badge variant="secondary">Page {cursorHistory.length + 1}</Badge>}
      </div>

      {!data ? (
        <ActivitySkeleton />
      ) : data.page.length ? (
        <div className="flex flex-col">
          {data.page.map((activity, index) => (
            <ActivityEntry
              key={activity._id}
              activity={activity}
              isLast={index === data.page.length - 1}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <HistoryIcon className="mx-auto mb-2 size-5 text-muted-foreground" />
          <p className="font-medium">No activity recorded</p>
          <p className="text-sm text-muted-foreground">
            Changes to this item will appear here.
          </p>
        </div>
      )}

      {data && (cursorHistory.length > 0 || !data.isDone) && (
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
    </section>
  );
}

function ActivityEntry({
  activity,
  isLast,
}: {
  activity: InventoryActivity;
  isLast: boolean;
}) {
  const itemChanged =
    activity.itemNameBefore !== undefined &&
    activity.itemNameBefore !== activity.itemNameAfter;
  const supplierChanged =
    activity.supplierNameBefore !== undefined &&
    activity.supplierNameBefore !== activity.supplierNameAfter;
  const delta =
    activity.quantityDelta > 0
      ? `+${activity.quantityDelta.toLocaleString()}`
      : activity.quantityDelta.toLocaleString();

  return (
    <article className="relative flex gap-3 pb-5">
      {!isLast && <div className="absolute top-3 bottom-0 left-2 border-l" />}
      <div className="relative mt-1 size-4 shrink-0 rounded-full border-4 border-background bg-muted-foreground" />
      <div className="min-w-0 flex-1 rounded-lg border p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                activity.action === "remove"
                  ? "destructive"
                  : activity.action === "update"
                    ? "outline"
                    : "secondary"
              }
            >
              {operationLabels[activity.operation]}
            </Badge>
            <span
              className={cn(
                "font-semibold tabular-nums",
                activity.quantityDelta === 0 && "text-muted-foreground",
              )}
            >
              {delta}
            </span>
          </div>
          <time className="text-xs text-muted-foreground">
            {dateTimeFormatter.format(activity._creationTime)}
          </time>
        </div>

        <p className="mt-2 text-sm">
          {activity.quantityBefore.toLocaleString()}{" "}
          <span className="text-muted-foreground">{">"}</span>{" "}
          <span className="font-medium">{activity.quantityAfter.toLocaleString()}</span>
        </p>

        {(itemChanged || supplierChanged) && (
          <div className="mt-2 flex flex-col gap-1 text-sm">
            {itemChanged && (
              <p>
                Name:{" "}
                <span className="text-muted-foreground">{activity.itemNameBefore}</span>{" "}
                to <span className="font-medium">{activity.itemNameAfter}</span>
              </p>
            )}
            {supplierChanged && (
              <p>
                Supplier:{" "}
                <span className="text-muted-foreground">
                  {activity.supplierNameBefore}
                </span>{" "}
                to <span className="font-medium">{activity.supplierNameAfter}</span>
              </p>
            )}
          </div>
        )}

        <p className={cn("mt-2 text-sm", !activity.reason && "text-muted-foreground")}>
          {activity.reason ?? "No reason provided"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Recorded by {activity.actorName}
        </p>
      </div>
    </article>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="mt-1 size-4 rounded-full" />
          <div className="flex flex-1 flex-col gap-3 rounded-lg border p-3">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
