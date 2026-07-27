import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronsUpDownIcon,
  HistoryIcon,
} from "lucide-react";
import { useId, useState } from "react";

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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type InventoryAction = "add" | "remove" | "update";
type ActionFilter = InventoryAction | "all";
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

export function InventoryActivityLog() {
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
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
              <CardDescription>
                An immutable trail of stock and item-detail changes.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <InventoryItemFilter
                value={inventoryItemId}
                onValueChange={handleItemChange}
              />
              <Select
                value={action}
                onValueChange={(value) => handleActionChange(value as ActionFilter)}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="add">Added</SelectItem>
                    <SelectItem value="remove">Removed</SelectItem>
                    <SelectItem value="update">Updated</SelectItem>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.page.map((activity) => (
                    <ActivityRow key={activity._id} activity={activity} />
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
    </div>
  );
}

function ActivityRow({ activity }: { activity: InventoryActivity }) {
  const itemChanged =
    activity.itemNameBefore && activity.itemNameBefore !== activity.itemNameAfter;
  const supplierChanged =
    activity.supplierNameBefore &&
    activity.supplierNameBefore !== activity.supplierNameAfter;
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
            {activity.supplierNameAfter}
          </span>
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
                supplierChanged ? activity.supplierNameBefore : null,
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
    </TableRow>
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
  const listId = useId();
  const { data: items, isPending } = useQuery(
    convexQuery(api.inventory.searchItemOptions, {
      query: search,
    }),
  );
  const selectedItem = items?.find((item) => item._id === value);
  const selectedLabel = selectedItem?.name ?? selectedName;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className="w-full justify-between font-normal sm:w-56"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? selectedLabel : "All items"}
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search inventory..."
          />
          <CommandList id={listId}>
            <CommandEmpty>
              {isPending ? "Loading items..." : "No item found."}
            </CommandEmpty>
            <CommandGroup>
              {!search && (
                <CommandItem
                  value="all-items"
                  data-checked={!value}
                  onSelect={() => {
                    onValueChange(null);
                    setSelectedName(undefined);
                    setOpen(false);
                  }}
                >
                  All items
                </CommandItem>
              )}
              {items?.map((item) => (
                <CommandItem
                  key={item._id}
                  value={item._id}
                  data-checked={value === item._id}
                  onSelect={() => {
                    onValueChange(item._id);
                    setSelectedName(item.name);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{item.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.supplierName}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
