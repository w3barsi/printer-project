import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { formatPeso } from "@dg/backend/printPricing";
import { Badge } from "@dg/ui-coss/components/badge";
import { Button } from "@dg/ui-coss/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dg/ui-coss/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dg/ui-coss/components/empty";
import { Input } from "@dg/ui-coss/components/input";
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@dg/ui-coss/components/menu";
import { Skeleton } from "@dg/ui-coss/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dg/ui-coss/components/table";
import { toastManager } from "@dg/ui-coss/components/toast";
import { cn } from "@dg/ui-coss/lib/utils";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArchiveIcon,
  BoxesIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useState } from "react";

import {
  CreatePricingGroupDialog,
  DeletePricingGroupDialog,
  RenamePricingGroupDialog,
  type PricingGroup,
  type PricingGroupDraftItem,
} from "@/components/3d/pricing/pricing-group-dialogs";
import {
  PricingItemActions,
  type PricingListItem,
} from "@/components/3d/pricing/pricing-item-dialogs";
import { useDebounce } from "@/hooks/use-debounce";

type PricingItemOption = {
  _id: Id<"printPricingItems">;
  name: string;
  latestTotal?: number;
};

type ItemDragData = {
  kind: "item";
  itemId: Id<"printPricingItems">;
  itemName: string;
  latestTotal?: number;
  groupId?: Id<"printPricingGroups">;
};

type GroupDropData = {
  kind: "group";
  groupId: Id<"printPricingGroups">;
};

type PricingEntry =
  | { kind: "group"; sortAt: number; group: PricingGroup }
  | { kind: "item"; sortAt: number; item: PricingListItem };

function formatPricingDate(value?: number) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export function PricingItemsTable() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const searchQuery = debouncedSearch.trim();
  const isSearching = searchQuery.length > 0;
  const { data: items } = useSuspenseQuery(
    convexQuery(api.printPricing.items.listUngroupedItems, {}),
  );
  const { data: groups } = useSuspenseQuery(
    convexQuery(api.printPricing.groups.listGroups, {}),
  );
  const [activeDrag, setActiveDrag] = useState<ItemDragData | null>(null);
  const [pendingGroup, setPendingGroup] = useState<{
    items: PricingGroupDraftItem[];
  } | null>(null);
  const moveItem = useMutation({
    mutationFn: useConvexMutation(api.printPricing.groups.moveItemToGroup),
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not move item to group",
        type: "error",
      });
    },
  });
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const searchResults = useQuery({
    ...convexQuery(api.printPricing.items.searchItems, { query: searchQuery }),
    enabled: isSearching,
  });
  const entries: PricingEntry[] = [
    ...groups.map((group) => ({
      kind: "group" as const,
      sortAt: group.updatedAt,
      group,
    })),
    ...items.map((item) => ({
      kind: "item" as const,
      sortAt: item.updatedAt,
      item,
    })),
  ].sort((a, b) => b.sortAt - a.sortAt);
  const hasRows = entries.length > 0;

  function handleDragStart(event: DragStartEvent) {
    const active = event.active.data.current as ItemDragData | undefined;

    if (active?.kind !== "item") return;

    setActiveDrag(active);
  }

  function handleDragEnd(event: DragEndEvent) {
    const active = event.active.data.current as ItemDragData | undefined;
    const over = event.over?.data.current as ItemDragData | GroupDropData | undefined;

    setActiveDrag(null);

    if (active?.kind !== "item" || !over) return;

    if (over.kind === "group") {
      if (active.groupId === over.groupId) return;

      moveItem.mutate({ itemId: active.itemId, groupId: over.groupId });
      return;
    }

    if (active.itemId === over.itemId) return;

    if (over.groupId) {
      if (active.groupId === over.groupId) return;

      moveItem.mutate({ itemId: active.itemId, groupId: over.groupId });
      return;
    }

    setPendingGroup({
      items: [
        {
          _id: active.itemId,
          name: active.itemName,
          latestTotal: active.latestTotal,
        },
        {
          _id: over.itemId,
          name: over.itemName,
          latestTotal: over.latestTotal,
        },
      ],
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="flex flex-col gap-3">
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle>Priced items</CardTitle>
                <CardDescription>
                  Drag an item onto another to group them, or onto a group to add it.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search items..."
                  className="pl-9"
                  aria-label="Search pricing items"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isSearching ? (
              <PricingItemSearchResults
                query={searchQuery}
                results={searchResults.data}
                isPending={searchResults.isPending}
              />
            ) : !hasRows ? (
              <div className="p-6">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ArchiveIcon />
                    </EmptyMedia>
                    <EmptyTitle>No pricing items yet</EmptyTitle>
                    <EmptyDescription>
                      Add an item to price a print and start its price history.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="md:pl-4">Item</TableHead>
                    <TableHead className="text-right">Latest price</TableHead>
                    <TableHead>Last priced</TableHead>
                    <TableHead className="hidden md:table-cell">Updated</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) =>
                    entry.kind === "group" ? (
                      <PricingGroupRows
                        key={`group:${entry.group._id}`}
                        group={entry.group}
                      />
                    ) : (
                      <PricingItemRow key={`item:${entry.item._id}`} item={entry.item} />
                    ),
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div className="pointer-events-none w-64 rounded-xl bg-background/80 p-2 opacity-80 shadow-xl ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
              <span className="min-w-0 truncate text-sm font-medium">
                {activeDrag.itemName}
              </span>
              {activeDrag.latestTotal !== undefined ? (
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  {formatPeso(activeDrag.latestTotal)}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {pendingGroup ? (
        <CreatePricingGroupDialog
          items={pendingGroup.items}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setPendingGroup(null);
          }}
        />
      ) : null}
    </DndContext>
  );
}

function PricingGroupRows({ group }: { group: PricingGroup }) {
  const [action, setAction] = useState<"rename" | "delete" | null>(null);
  const { setNodeRef, isOver } = useDroppable({
    id: `price-group:${group._id}`,
    data: { kind: "group", groupId: group._id },
  });

  return (
    <>
      <TableRow
        ref={setNodeRef}
        className={cn(
          isOver && "bg-primary/10 outline-1 -outline-offset-1 outline-primary/40",
        )}
      >
        <TableCell className="md:pl-4">
          <div className="flex min-w-0 items-center gap-1">
            <span className="inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground sm:size-7">
              <BoxesIcon className="h-4 w-4" />
            </span>
            <span className="truncate font-semibold">{group.name}</span>
            <Badge variant="outline" size="sm" className="ml-1 shrink-0">
              {group.items.length} item{group.items.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="tabular-nums">
              {formatPeso(group.total)}
            </Badge>
            {group.unpricedCount > 0 ? (
              <span className="text-xs text-muted-foreground">
                {group.unpricedCount} not priced
              </span>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatPricingDate(group.latestCalculatedAt)}
        </TableCell>
        <TableCell className="hidden text-muted-foreground md:table-cell">
          {formatPricingDate(group.updatedAt)}
        </TableCell>
        <TableCell className="pr-2 text-right">
          <Menu>
            <MenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
              <MoreHorizontalIcon />
              <span className="sr-only">Actions for {group.name}</span>
            </MenuTrigger>
            <MenuPopup align="end" className="w-44">
              <MenuGroup>
                <MenuItem onClick={() => setAction("rename")}>
                  <PencilIcon />
                  Rename group
                </MenuItem>
                <MenuItem variant="destructive" onClick={() => setAction("delete")}>
                  <Trash2Icon />
                  Delete group
                </MenuItem>
              </MenuGroup>
            </MenuPopup>
          </Menu>
        </TableCell>
      </TableRow>

      {group.items.map((item, index) => (
        <PricingItemRow
          key={item._id}
          item={item}
          isLastInGroup={index === group.items.length - 1}
        />
      ))}

      {action === "rename" ? (
        <RenamePricingGroupDialog
          group={group}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAction(null);
          }}
        />
      ) : action === "delete" ? (
        <DeletePricingGroupDialog
          group={group}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAction(null);
          }}
        />
      ) : null}
    </>
  );
}

function PricingItemRow({
  item,
  isLastInGroup = false,
}: {
  item: PricingListItem;
  isLastInGroup?: boolean;
}) {
  const navigate = useNavigate();
  const isGrouped = item.groupId !== undefined;
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: `price-item:${item._id}`,
    data: {
      kind: "item",
      itemId: item._id,
      itemName: item.name,
      latestTotal: item.latestTotal,
      groupId: item.groupId,
    },
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `price-item-target:${item._id}`,
    data: {
      kind: "item",
      itemId: item._id,
      itemName: item.name,
      latestTotal: item.latestTotal,
      groupId: item.groupId,
    },
  });
  const removeFromGroup = useMutation({
    mutationFn: useConvexMutation(api.printPricing.groups.removeItemFromGroup),
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not remove item from group",
        type: "error",
      });
    },
  });
  const setRowRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
    },
    [setDraggableRef, setDroppableRef],
  );

  return (
    <TableRow
      ref={setRowRef}
      {...attributes}
      {...listeners}
      role="link"
      tabIndex={0}
      className={cn(
        "cursor-pointer select-none",
        isGrouped && "border-b-0 bg-black/5 dark:bg-black/30",
        isGrouped && "hover:bg-black/[2%]! dark:hover:bg-black/20!",
        isGrouped && isLastInGroup && "border-b",
        isDragging && "opacity-40",
        isOver &&
          !isDragging &&
          "bg-primary/5 outline-1 -outline-offset-1 outline-primary/40",
      )}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("a, button")) {
          return;
        }
        void navigate({
          to: "/3d/pricing/$itemId",
          params: { itemId: item._id },
        });
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.target !== event.currentTarget) return;
        void navigate({
          to: "/3d/pricing/$itemId",
          params: { itemId: item._id },
        });
      }}
    >
      <TableCell className={cn("relative", isGrouped ? "pl-12" : "md:pl-4")}>
        {isGrouped ? (
          <span
            aria-hidden
            className="absolute inset-y-0 left-6 w-px bg-border md:left-7"
          />
        ) : null}
        <div className="flex min-w-0 items-center">
          <Link
            to="/3d/pricing/$itemId"
            params={{ itemId: item._id }}
            className="truncate font-medium underline-offset-4 hover:underline"
          >
            {item.name}
          </Link>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {item.latestTotal !== undefined ? (
          <Badge variant="secondary" className="tabular-nums">
            {formatPeso(item.latestTotal)}
          </Badge>
        ) : (
          <span className="text-muted-foreground">Not priced yet</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatPricingDate(item.latestCalculatedAt)}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {formatPricingDate(item.updatedAt)}
      </TableCell>
      <TableCell
        className="pr-2 text-right"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <PricingItemActions
          item={item}
          onRemoveFromGroup={
            isGrouped ? () => removeFromGroup.mutate({ itemId: item._id }) : undefined
          }
        />
      </TableCell>
    </TableRow>
  );
}

function PricingItemSearchResults({
  query,
  results,
  isPending,
}: {
  query: string;
  results: PricingItemOption[] | undefined;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-4/5" />
      </div>
    );
  }

  if (!results?.length) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        No items match &quot;{query}&quot;.
      </p>
    );
  }

  return (
    <div className="divide-y">
      {results.map((item) => (
        <Link
          key={item._id}
          to="/3d/pricing/$itemId"
          params={{ itemId: item._id }}
          className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
        >
          <span className="min-w-0 truncate font-medium">{item.name}</span>
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {item.latestTotal !== undefined
              ? formatPeso(item.latestTotal)
              : "Not priced yet"}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function PricingItemsTableSkeleton() {
  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="border-b py-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="grid grid-cols-3 items-center gap-4">
            <Skeleton className="h-5 w-32 max-w-full" />
            <Skeleton className="h-5 w-28 max-w-full" />
            <Skeleton className="ml-auto h-6 w-12" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
