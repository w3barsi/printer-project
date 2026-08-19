import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  HistoryIcon,
  PackageCheckIcon,
  PackageIcon,
  PackageMinusIcon,
  PackagePlusIcon,
  PencilLineIcon,
  RefreshCwIcon,
  Trash2Icon,
  TruckIcon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";

import { DeleteInventoryActivityDialog } from "@/components/inventory/delete-activity-dialog";
import {
  InventoryStockActions,
  type InventoryListItem,
} from "@/components/inventory/item-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type InventoryActivity = Doc<"inventoryActivities"> & {
  jobOrderExists: boolean;
};

const operationLabels: Record<InventoryActivity["operation"], string> = {
  item_created: "Item created",
  stock_added: "Stock added",
  stock_removed: "Stock used",
  quantity_corrected: "Count corrected",
  details_updated: "Details updated",
};

const movementLabels: Record<InventoryActivity["operation"], string> = {
  item_created: "Opening stock",
  stock_added: "Stock added",
  stock_removed: "Stock used",
  quantity_corrected: "Count adjustment",
  details_updated: "No stock change",
};

const operationIcons: Record<InventoryActivity["operation"], typeof PackageIcon> = {
  item_created: PackageCheckIcon,
  stock_added: PackagePlusIcon,
  stock_removed: PackageMinusIcon,
  quantity_corrected: RefreshCwIcon,
  details_updated: PencilLineIcon,
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
      <SheetContent className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-5 py-5 pr-14 sm:px-6 sm:py-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Inventory item</Badge>
            <span className="text-xs text-muted-foreground">
              Added {dateTimeFormatter.format(item._creationTime)}
            </span>
          </div>
          <SheetTitle className="text-2xl tracking-tight">{item.name}</SheetTitle>
          <SheetDescription>{item.supplierName}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-7 p-4 sm:p-6">
            <section aria-labelledby="inventory-balance-heading">
              <div className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-4 rounded-xl border bg-muted/40 p-5">
                  <div className="flex flex-col gap-1">
                    <h2
                      id="inventory-balance-heading"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Current stock
                    </h2>
                    <p className="text-4xl font-semibold tracking-tight tabular-nums">
                      {item.quantity.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background/60 p-3">
                    <PackageIcon className="size-7 text-muted-foreground" />
                  </div>
                </div>
                <InventoryStockActions item={item} />
              </div>
            </section>

            <section
              className="flex flex-col gap-3"
              aria-labelledby="item-details-heading"
            >
              <h2 id="item-details-heading" className="font-semibold">
                Item details
              </h2>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 border-y py-5 sm:grid-cols-2">
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
  const { user } = useRouteContext({ from: "/app" });
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [activityToDelete, setActivityToDelete] = useState<InventoryActivity | null>(
    null,
  );
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
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="item-activity-heading" className="text-lg font-semibold tracking-tight">
            Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            A chronological ledger of every stock change.
          </p>
        </div>
        {data && <Badge variant="secondary">Page {cursorHistory.length + 1}</Badge>}
      </div>

      {!data ? (
        <ActivitySkeleton />
      ) : data.page.length ? (
        <div className="overflow-hidden rounded-xl border">
          {data.page.map((activity) => (
            <ActivityEntry
              key={activity._id}
              activity={activity}
              canDelete={user.role === "admin"}
              onDelete={() => setActivityToDelete(activity)}
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

      <DeleteInventoryActivityDialog
        activity={activityToDelete}
        onOpenChange={(open) => {
          if (!open) setActivityToDelete(null);
        }}
      />
    </section>
  );
}

function ActivityEntry({
  activity,
  canDelete,
  onDelete,
}: {
  activity: InventoryActivity;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const itemChanged =
    activity.itemNameBefore !== undefined &&
    activity.itemNameBefore !== activity.itemNameAfter;
  const supplierChanged =
    activity.operation === "details_updated" &&
    activity.supplierIdBefore !== activity.supplierIdAfter;
  const delta =
    activity.quantityDelta > 0
      ? `+${activity.quantityDelta.toLocaleString()}`
      : activity.quantityDelta.toLocaleString();
  const OperationIcon = operationIcons[activity.operation];
  const isStockUsed = activity.operation === "stock_removed";
  const isStockAdded = activity.operation === "stock_added";
  const hasStockChange = activity.operation !== "details_updated";

  return (
    <article className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-3 border-b p-4 last:border-b-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5 sm:p-5">
      <div className="border-r pr-3 sm:pr-5">
        {hasStockChange ? (
          <p
            className={cn(
              "text-xl font-medium tracking-tight tabular-nums sm:text-2xl",
              isStockUsed && "text-destructive",
              isStockAdded && "text-emerald-700 dark:text-emerald-400",
            )}
          >
            {delta}
          </p>
        ) : (
          <p className="text-xl font-medium tracking-tight text-muted-foreground tabular-nums sm:text-2xl">
            0
          </p>
        )}
        <p
          className={cn(
            "mt-1 text-xs leading-tight font-medium text-muted-foreground",
            isStockUsed && "text-destructive",
            isStockAdded && "text-emerald-700 dark:text-emerald-400",
          )}
        >
          {movementLabels[activity.operation]}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
              <OperationIcon className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold">
              {operationLabels[activity.operation]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <time className="text-xs whitespace-nowrap text-muted-foreground">
              {dateTimeFormatter.format(activity._creationTime)}
            </time>
            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Delete ${operationLabels[activity.operation]} activity`}
                onClick={onDelete}
              >
                <Trash2Icon />
              </Button>
            )}
          </div>
        </div>

        {hasStockChange && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Balance</span>
            <span className="font-medium tabular-nums">
              {activity.quantityBefore.toLocaleString()}
            </span>
            <ArrowRightIcon className="size-3.5 text-muted-foreground" />
            <span className="font-semibold tabular-nums">
              {activity.quantityAfter.toLocaleString()}
            </span>
          </div>
        )}

        {(itemChanged || supplierChanged) && (
          <div className="mt-3 flex flex-col gap-1 border-l-2 pl-3 text-sm">
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
                  {activity.supplierNameBefore ?? "No supplier"}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {activity.supplierNameAfter ?? "No supplier"}
                </span>
              </p>
            )}
          </div>
        )}

        <p className={cn("mt-3 text-sm", !activity.reason && "text-muted-foreground")}>
          {activity.reason ?? "No reason provided"}
        </p>
        {activity.jobOrderId && activity.jobOrderNumber !== undefined && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {activity.jobOrderExists ? (
              <Link
                to="/app/jo/$joId"
                params={{ joId: activity.jobOrderId }}
                className="font-medium underline-offset-4 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                JO #{activity.jobOrderNumber}
              </Link>
            ) : (
              <span className="font-medium">JO #{activity.jobOrderNumber}</span>
            )}
            <span className="min-w-0 truncate text-muted-foreground">
              {activity.jobOrderName}
            </span>
            {!activity.jobOrderExists && (
              <Badge variant="outline">Deleted Job Order</Badge>
            )}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Recorded by {activity.actorName}
        </p>
      </div>
    </article>
  );
}

function ActivitySkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-3 border-b p-4 last:border-b-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5 sm:p-5"
        >
          <div className="flex flex-col gap-2 border-r pr-3 sm:pr-5">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-7 w-32" />
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
