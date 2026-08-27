import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Doc, Id } from "@dg/backend/dataModel";
import { Badge } from "@dg/ui/components/badge";
import { Button } from "@dg/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dg/ui/components/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@dg/ui/components/combobox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dg/ui/components/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dg/ui/components/select";
import { Skeleton } from "@dg/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@dg/ui/components/table";
import { cn } from "@dg/ui/lib/utils";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { ArrowLeftIcon, ArrowRightIcon, HistoryIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { DeleteInventoryActivityDialog } from "@/components/inventory/delete-activity-dialog";

const PAGE_SIZE = 25;

type InventoryAction = "add" | "remove" | "update";
type ActionFilter = InventoryAction | "all";
type InventoryActivity = Doc<"inventoryActivities"> & {
  jobOrderExists: boolean;
};

type InventoryItemOption = {
  id: Id<"inventoryItems"> | null;
  label: string;
  supplierName?: string;
};

const allItemsOption: InventoryItemOption = {
  id: null,
  label: "All items",
};

const actionFilterItems: Array<{ label: string; value: ActionFilter }> = [
  { label: "All actions", value: "all" },
  { label: "Added", value: "add" },
  { label: "Used", value: "remove" },
  { label: "Updated", value: "update" },
];

const operationLabels: Record<InventoryActivity["operation"], string> = {
  item_created: "Item created",
  stock_added: "Stock added",
  stock_removed: "Stock used",
  quantity_corrected: "Count corrected",
  details_updated: "Details updated",
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function InventoryActivityLog() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [activityToDelete, setActivityToDelete] = useState<InventoryActivity | null>(
    null,
  );
  const [inventoryItemId, setInventoryItemId] = useState<Id<"inventoryItems"> | null>(
    null,
  );
  const [action, setAction] = useState<ActionFilter>("all");
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.inventory.listActivities, {
      paginationOpts: {
        numItems: PAGE_SIZE,
        cursor,
      },
      ...(inventoryItemId ? { inventoryItemId } : {}),
      ...(action === "all" ? {} : { action }),
    }),
  );

  function resetPagination() {
    setCursorHistory([]);
  }

  function handleItemChange(itemId: Id<"inventoryItems"> | null) {
    setInventoryItemId(itemId);
    resetPagination();
  }

  function handleActionChange(nextAction: ActionFilter) {
    setAction(nextAction);
    resetPagination();
  }

  if (
    data.page.length === 0 &&
    cursorHistory.length === 0 &&
    !inventoryItemId &&
    action === "all"
  ) {
    return (
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>No activity recorded yet</EmptyTitle>
              <EmptyDescription>
                Creating an item or changing stock will create the first ledger entry.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="flex flex-col gap-1">
              <CardTitle>Inventory ledger</CardTitle>
              <CardDescription>A trail of stock and item-detail changes.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <InventoryItemFilter
                value={inventoryItemId}
                onValueChange={handleItemChange}
              />
              <Select
                items={actionFilterItems}
                value={action}
                onValueChange={(value) => {
                  if (value) handleActionChange(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {actionFilterItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.page.length ? (
            <TableWrapper className="rounded-none border-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="md:pl-4">Event</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">
                      Balance
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Reason</TableHead>
                    <TableHead className="hidden md:table-cell">Recorded by</TableHead>
                    <TableHead className="hidden xl:table-cell xl:pr-4">When</TableHead>
                    {user.role === "admin" && (
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.page.map((activity) => (
                    <ActivityRow
                      key={activity._id}
                      activity={activity}
                      canDelete={user.role === "admin"}
                      onDelete={() => setActivityToDelete(activity)}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          ) : (
            <Empty className="min-h-64">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HistoryIcon />
                </EmptyMedia>
                <EmptyTitle>No matching activity</EmptyTitle>
                <EmptyDescription>
                  Try a different item or action filter.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {data.page.length} entr{data.page.length === 1 ? "y" : "ies"}
          {isFetching ? " · Updating" : ""}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching || cursorHistory.length === 0}
            onClick={() => setCursorHistory((history) => history.slice(0, -1))}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Previous
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
            Next
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>

      <DeleteInventoryActivityDialog
        activity={activityToDelete}
        onOpenChange={(open) => {
          if (!open) setActivityToDelete(null);
        }}
      />
    </div>
  );
}

function ActivityRow({
  activity,
  canDelete,
  onDelete,
}: {
  activity: InventoryActivity;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const itemChanged =
    activity.itemNameBefore && activity.itemNameBefore !== activity.itemNameAfter;
  const supplierChanged =
    activity.operation === "details_updated" &&
    activity.supplierIdBefore !== activity.supplierIdAfter;
  const delta =
    activity.quantityDelta > 0
      ? `+${activity.quantityDelta.toLocaleString()}`
      : activity.quantityDelta.toLocaleString();

  return (
    <TableRow>
      <TableCell className="md:pl-4">
        <div className="flex flex-col items-start gap-1">
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
          <span className="text-xs text-muted-foreground md:hidden">
            {dateTimeFormatter.format(activity._creationTime)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex min-w-36 flex-col">
          <span className="font-medium">{activity.itemNameAfter}</span>
          <span className="text-xs text-muted-foreground">
            {activity.supplierNameAfter ?? "No supplier"}
          </span>
          {activity.jobOrderId && activity.jobOrderNumber !== undefined && (
            <JobOrderReference activity={activity} />
          )}
          <span className="text-xs text-muted-foreground md:hidden">
            Recorded by {activity.actorName} · Balance{" "}
            {activity.quantityAfter.toLocaleString()}
          </span>
          <span
            className={cn(
              "line-clamp-2 text-xs md:hidden",
              !activity.reason && "text-muted-foreground",
            )}
          >
            {activity.reason ?? "No reason provided"}
          </span>
          {(itemChanged || supplierChanged) && (
            <span className="mt-1 text-xs text-muted-foreground">
              Previously{" "}
              {[
                itemChanged ? activity.itemNameBefore : null,
                supplierChanged ? (activity.supplierNameBefore ?? "No supplier") : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-medium tabular-nums",
          activity.quantityDelta === 0 && "text-muted-foreground",
        )}
      >
        {delta}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums sm:table-cell">
        <span className="font-medium">{activity.quantityAfter.toLocaleString()}</span>
        <span className="block text-xs text-muted-foreground">
          from {activity.quantityBefore.toLocaleString()}
        </span>
      </TableCell>
      <TableCell className="hidden max-w-64 lg:table-cell">
        <span className={cn("line-clamp-2", !activity.reason && "text-muted-foreground")}>
          {activity.reason ?? "No reason provided"}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span>{activity.actorName}</span>
        <span className="block text-xs text-muted-foreground lg:hidden">
          {activity.reason ?? "No reason provided"}
        </span>
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell xl:pr-4">
        {dateTimeFormatter.format(activity._creationTime)}
      </TableCell>
      {canDelete && (
        <TableCell className="pr-2 text-right">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${operationLabels[activity.operation]} activity for ${activity.itemNameAfter}`}
            onClick={onDelete}
          >
            <Trash2Icon />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

function JobOrderReference({ activity }: { activity: InventoryActivity }) {
  const content = (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1 text-xs">
      <span className="font-medium">JO #{activity.jobOrderNumber}</span>
      <span className="truncate text-muted-foreground">{activity.jobOrderName}</span>
      {!activity.jobOrderExists && (
        <Badge variant="outline" className="mt-0.5">
          Deleted Job Order
        </Badge>
      )}
    </span>
  );

  return activity.jobOrderExists && activity.jobOrderId ? (
    <Link
      to="/jo/$joId"
      params={{ joId: activity.jobOrderId }}
      className="w-fit max-w-full underline-offset-4 hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      {content}
    </Link>
  ) : (
    content
  );
}

function InventoryItemFilter({
  value,
  onValueChange,
}: {
  value: Id<"inventoryItems"> | null;
  onValueChange: (value: Id<"inventoryItems"> | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState<string>();
  const { data: items, isPending } = useQuery(
    convexQuery(api.inventory.searchItemOptions, {
      query: search,
    }),
  );
  const itemOptions: InventoryItemOption[] =
    items?.map((item) => ({
      id: item._id,
      label: item.name,
      supplierName: item.supplierName,
    })) ?? [];
  const selectedOption = value
    ? (itemOptions.find((option) => option.id === value) ??
      (selectedName ? { id: value, label: selectedName } : null))
    : allItemsOption;
  const options = search ? itemOptions : [allItemsOption, ...itemOptions];

  if (selectedOption?.id && !options.some((option) => option.id === selectedOption.id)) {
    options.push(selectedOption);
  }

  return (
    <Combobox<InventoryItemOption>
      items={options}
      value={selectedOption}
      inputValue={search}
      open={open}
      filter={null}
      autoHighlight
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.id ?? "all-items"}
      isItemEqualToValue={(option, selectedValue) => option.id === selectedValue.id}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
      onInputValueChange={setSearch}
      onValueChange={(option) => {
        if (!option) return;

        onValueChange(option.id);
        setSelectedName(option.id ? option.label : undefined);
        setOpen(false);
        setSearch("");
      }}
    >
      <ComboboxTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal sm:w-56"
          />
        }
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {selectedOption?.label ?? "All items"}
        </span>
      </ComboboxTrigger>
      <ComboboxContent className="w-(--anchor-width) min-w-(--anchor-width) p-0">
        <ComboboxInput
          showTrigger={false}
          placeholder="Search inventory..."
          aria-label="Search inventory items"
          className="w-full"
        />
        <ComboboxEmpty>{isPending ? "Loading items..." : "No item found."}</ComboboxEmpty>
        <ComboboxList>
          {(option: InventoryItemOption) => (
            <ComboboxItem key={option.id ?? "all-items"} value={option}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{option.label}</span>
                {option.supplierName && (
                  <span className="truncate text-xs text-muted-foreground">
                    {option.supplierName}
                  </span>
                )}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function InventoryActivityLogSkeleton() {
  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="border-b py-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="grid grid-cols-4 items-center gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-32 max-w-full" />
            <Skeleton className="ml-auto h-5 w-10" />
            <Skeleton className="ml-auto h-5 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
