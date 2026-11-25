import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { Button } from "@dg/ui-coss/components/button";
import { Card, CardContent, CardHeader } from "@dg/ui-coss/components/card";
import { Checkbox } from "@dg/ui-coss/components/checkbox";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@dg/ui-coss/components/menu";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@dg/ui-coss/components/table";
import { cn } from "@dg/ui-coss/lib/utils";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import {
  CheckSquareIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { AddItemDialog } from "@/components/jo/add-item-dialog";
import { DeleteItemsAlertDialog } from "@/components/jo/delete-items-alert-dialog";
import { EditItemDialog } from "@/components/jo/edit-item-dialog";
import { EditItemsDialog } from "@/components/jo/edit-items-dialog";
import { formatCurrency } from "@/components/jo/job-order-formatters";
import type { Item } from "@/types/convex";

export function OrderItemsCard({ joId }: { joId: Id<"jo"> }) {
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));
  const items = jo?.items ?? [];
  const editable = jo !== null && jo.status !== "unconfirmed";

  const toggleItemChecked = useMutation(api.items.toggleItemChecked).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.jo.getOneComplete, { id: joId });
      if (!current) return;

      localStore.setQuery(
        api.jo.getOneComplete,
        { id: joId },
        {
          ...current,
          items: current.items.map((item) =>
            item._id === args.itemId ? { ...item, checked: !item.checked } : item,
          ),
        },
      );
    },
  );
  const reorderItems = useMutation(api.items.reorderItems).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.jo.getOneComplete, { id: joId });
      if (!current) return;

      const itemsById = new Map(current.items.map((item) => [item._id, item]));
      const items = args.itemIds.flatMap((itemId, index) => {
        const item = itemsById.get(itemId);
        return item ? [{ ...item, orderWeight: index }] : [];
      });

      localStore.setQuery(api.jo.getOneComplete, { id: joId }, { ...current, items });
    },
  );

  const [selectedIds, setSelectedIds] = useState<Id<"items">[]>([]);
  const [anchorId, setAnchorId] = useState<Id<"items"> | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [activeDrag, setActiveDrag] = useState<{
    items: Item[];
    width?: number;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    itemId: Id<"items">;
    position: "before" | "after";
  } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertDialogOpen, setIsDeleteAlertDialogOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const lastDragEndedAt = useRef(0);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const selectedItems = items.filter((currentItem) =>
    selectedIds.includes(currentItem._id),
  );

  // Drop ids that no longer exist; a live query update can remove items
  // underneath an active selection.
  useEffect(() => {
    setSelectedIds((current) => {
      const next = current.filter((itemId) =>
        items.some((currentItem) => currentItem._id === itemId),
      );
      return next.length === current.length ? current : next;
    });
  }, [items]);

  useEffect(() => {
    if (editable) return;
    setSelectedIds([]);
    setAnchorId(null);
  }, [editable]);

  useHotkeys(
    "escape",
    () => {
      setSelectedIds([]);
      setAnchorId(null);
    },
    {
      enabled:
        selectedIds.length > 0 &&
        !isEditDialogOpen &&
        !isDeleteAlertDialogOpen &&
        !isBulkEditOpen &&
        !isBulkDeleteOpen,
    },
  );

  if (jo === null) {
    return null;
  }

  function clearSelection() {
    setSelectedIds([]);
    setAnchorId(null);
  }

  function toggleSelection(itemId: Id<"items">) {
    setSelectedIds((current) =>
      current.includes(itemId)
        ? current.filter((selectedId) => selectedId !== itemId)
        : [...current, itemId],
    );
    setAnchorId(itemId);
  }

  function selectRange(itemId: Id<"items">) {
    const anchorIndex = anchorId
      ? items.findIndex((currentItem) => currentItem._id === anchorId)
      : -1;
    const itemIndex = items.findIndex((currentItem) => currentItem._id === itemId);

    if (anchorIndex === -1 || itemIndex === -1) {
      setSelectedIds([itemId]);
      setAnchorId(itemId);
      return;
    }

    const start = Math.min(anchorIndex, itemIndex);
    const end = Math.max(anchorIndex, itemIndex);
    setSelectedIds(items.slice(start, end + 1).map((currentItem) => currentItem._id));
  }

  function handleRowClick(event: React.MouseEvent<HTMLTableRowElement>, rowItem: Item) {
    if (!editable) return;
    if (performance.now() - lastDragEndedAt.current < 150) return;

    if (event.shiftKey) {
      selectRange(rowItem._id);
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      toggleSelection(rowItem._id);
      return;
    }

    setSelectedIds([rowItem._id]);
    setAnchorId(rowItem._id);
  }

  function handleDragStart(event: DragStartEvent) {
    const itemId = event.active.data.current?.itemId as Id<"items"> | undefined;
    const draggedItem = items.find((currentItem) => currentItem._id === itemId);
    if (!draggedItem || !itemId) return;

    let dragItems: Item[];
    if (selectedIds.includes(itemId)) {
      dragItems = items.filter((currentItem) => selectedIds.includes(currentItem._id));
    } else {
      clearSelection();
      dragItems = [draggedItem];
    }

    // dnd-kit hasn't populated `active.rect.current.initial` yet when
    // onDragStart fires, so measure the row element directly.
    const row = document.querySelector<HTMLTableRowElement>(
      `[data-order-item="${itemId}"]`,
    );
    const rect = row?.getBoundingClientRect();

    setActiveDrag({
      items: dragItems,
      width: rect?.width,
    });
  }

  function handleDragOver(event: DragOverEvent) {
    const activeId = event.active.data.current?.itemId as Id<"items"> | undefined;
    const overId = event.over?.data.current?.itemId as Id<"items"> | undefined;

    if (!activeId || !overId) {
      setDropTarget(null);
      return;
    }

    const movingIds = activeDrag
      ? activeDrag.items.map((dragItem) => dragItem._id)
      : [activeId];
    const movingSet = new Set(movingIds);
    const overIndex = items.findIndex((currentItem) => currentItem._id === overId);

    if (movingSet.has(overId) || overIndex === -1) {
      setDropTarget(null);
      return;
    }

    const movingIndexes = items
      .map((currentItem, index) => (movingSet.has(currentItem._id) ? index : -1))
      .filter((index) => index !== -1);

    if (movingIndexes.length === 0) {
      setDropTarget(null);
      return;
    }

    const firstMovingIndex = Math.min(...movingIndexes);
    const lastMovingIndex = Math.max(...movingIndexes);

    // Hovering between the moving rows is a no-op, not a drop target.
    if (overIndex > firstMovingIndex && overIndex < lastMovingIndex) {
      setDropTarget(null);
      return;
    }

    setDropTarget({
      itemId: overId,
      position: overIndex > lastMovingIndex ? "after" : "before",
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = event.active.data.current?.itemId as Id<"items"> | undefined;
    const overId = event.over?.data.current?.itemId as Id<"items"> | undefined;
    const draggedItems = activeDrag?.items ?? [];
    lastDragEndedAt.current = performance.now();
    setActiveDrag(null);
    setDropTarget(null);

    if (!activeId || !overId) return;

    const movingIds =
      draggedItems.length > 0 ? draggedItems.map((dragItem) => dragItem._id) : [activeId];
    const movingSet = new Set(movingIds);
    if (movingSet.has(overId)) return;

    const order = items.map((currentItem) => currentItem._id);
    const rest = order.filter((itemId) => !movingSet.has(itemId));
    const targetIndex = rest.indexOf(overId);
    if (targetIndex === -1) return;

    const overIndex = order.indexOf(overId);
    const movingIndexes = order
      .map((itemId, index) => (movingSet.has(itemId) ? index : -1))
      .filter((index) => index !== -1);
    if (movingIndexes.length === 0) return;

    const firstMovingIndex = Math.min(...movingIndexes);
    const lastMovingIndex = Math.max(...movingIndexes);
    if (overIndex > firstMovingIndex && overIndex < lastMovingIndex) return;

    const position = overIndex > lastMovingIndex ? "after" : "before";
    const insertAt = position === "after" ? targetIndex + 1 : targetIndex;
    const nextOrder = [
      ...rest.slice(0, insertAt),
      ...order.filter((itemId) => movingSet.has(itemId)),
      ...rest.slice(insertAt),
    ];

    if (nextOrder.every((itemId, index) => itemId === order[index])) return;

    reorderItems({ joId, itemIds: nextOrder });
  }

  function handleDragCancel() {
    lastDragEndedAt.current = performance.now();
    setActiveDrag(null);
    setDropTarget(null);
  }

  return (
    <>
      <EditItemDialog
        open={isEditDialogOpen}
        setOpen={setIsEditDialogOpen}
        item={item}
        joId={joId}
      />
      <DeleteItemsAlertDialog
        open={isDeleteAlertDialogOpen}
        setOpen={setIsDeleteAlertDialogOpen}
        items={item ? [item] : []}
        joId={joId}
      />
      <EditItemsDialog
        open={isBulkEditOpen}
        setOpen={setIsBulkEditOpen}
        items={selectedItems}
        joId={joId}
        onUpdated={clearSelection}
      />
      <DeleteItemsAlertDialog
        open={isBulkDeleteOpen}
        setOpen={setIsBulkDeleteOpen}
        items={selectedItems}
        joId={joId}
        onDeleted={clearSelection}
      />
      <Card className="pt-6 pb-0">
        <CardHeader>
          {selectedItems.length > 0 ? (
            <div className="flex min-h-9 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Clear selection"
                onClick={clearSelection}
              >
                <XIcon />
              </Button>
              <span className="px-1 text-sm font-medium">
                {selectedItems.length} {selectedItems.length === 1 ? "item" : "items"}{" "}
                selected
              </span>
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkEditOpen(true)}
                >
                  <PencilIcon />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setIsBulkDeleteOpen(true)}
                >
                  <Trash2Icon />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Order Items</h3>
              {editable ? <AddItemDialog joId={joId} /> : null}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 md:pl-4" />
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                    Item Name
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase">
                    Quantity
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">
                    Unit Price
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">
                    Total
                  </TableHead>
                  <TableHead className="w-12 text-xs font-semibold text-muted-foreground uppercase" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((currentItem) => (
                  <OrderItemRow
                    key={currentItem._id}
                    item={currentItem}
                    editable={editable}
                    isSelected={selectedIds.includes(currentItem._id)}
                    isMoving={
                      activeDrag?.items.some(
                        (dragItem) => dragItem._id === currentItem._id,
                      ) ?? false
                    }
                    dropPosition={
                      dropTarget?.itemId === currentItem._id
                        ? dropTarget.position
                        : undefined
                    }
                    onClick={(event) => handleRowClick(event, currentItem)}
                    onToggleChecked={() => toggleItemChecked({ itemId: currentItem._id })}
                    onToggleSelected={() => toggleSelection(currentItem._id)}
                    onEdit={() => {
                      setIsEditDialogOpen(true);
                      setItem(currentItem);
                    }}
                    onDelete={() => {
                      setIsDeleteAlertDialogOpen(true);
                      setItem(currentItem);
                    }}
                  />
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="border-t-2">
                  <TableCell colSpan={4} className="text-lg font-semibold md:pl-4" />
                  <TableCell className="text-right">
                    <span className="text-xs text-muted-foreground">
                      Total Order Value
                    </span>
                    <p className="text-lg">{formatCurrency(jo.totalOrderValue)}</p>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
            <DragOverlay dropAnimation={null}>
              {activeDrag ? (
                <div
                  style={{ width: activeDrag.width }}
                  className="pointer-events-none flex flex-col gap-1 rounded-lg bg-background/90 p-2 text-sm shadow-xl ring-1 ring-foreground/10"
                >
                  {activeDrag.items.slice(0, 3).map((dragItem) => (
                    <div key={dragItem._id} className="flex items-center gap-3 px-1">
                      <GripVerticalIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 truncate font-medium">
                        {dragItem.name}
                      </span>
                      <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                        {dragItem.quantity} × {formatCurrency(dragItem.price)}
                      </span>
                    </div>
                  ))}
                  {activeDrag.items.length > 3 ? (
                    <p className="px-1 text-xs text-muted-foreground">
                      +{activeDrag.items.length - 3} more selected
                    </p>
                  ) : null}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>
    </>
  );
}

function OrderItemRow({
  item,
  editable,
  isSelected,
  isMoving,
  dropPosition,
  onClick,
  onToggleChecked,
  onToggleSelected,
  onEdit,
  onDelete,
}: {
  item: Item;
  editable: boolean;
  isSelected: boolean;
  isMoving: boolean;
  dropPosition?: "before" | "after";
  onClick: (event: React.MouseEvent<HTMLTableRowElement>) => void;
  onToggleChecked: () => void;
  onToggleSelected: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
  } = useDraggable({
    id: `order-item:${item._id}`,
    data: { itemId: item._id },
    disabled: !editable,
  });
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `order-item-target:${item._id}`,
    data: { itemId: item._id },
    disabled: !editable,
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
      data-order-item={item._id}
      data-state={isSelected ? "selected" : undefined}
      aria-selected={isSelected}
      {...(editable ? attributes : {})}
      {...(editable ? listeners : {})}
      role="row"
      onClick={onClick}
      className={cn(
        "group",
        editable && "cursor-grab select-none",
        isMoving && "opacity-35",
      )}
    >
      <TableCell
        className="w-10 cursor-pointer md:pl-4"
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {dropPosition ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 z-[1000] h-0.5 bg-primary",
              dropPosition === "before" ? "top-0" : "bottom-0",
            )}
          />
        ) : null}
        <Checkbox
          checked={item.checked ?? false}
          onCheckedChange={onToggleChecked}
          aria-label={`Toggle "${item.name}"`}
          className="cursor-pointer"
        />
      </TableCell>
      <TableCell className={cn("font-medium", item.checked && "text-muted-foreground")}>
        {item.name}
      </TableCell>
      <TableCell className="text-center">{item.quantity}</TableCell>
      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(item.quantity * item.price)}
      </TableCell>
      <TableCell
        className="w-12 cursor-pointer text-right"
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {editable ? (
          <Menu>
            <MenuTrigger
              render={<Button variant="ghost" size="icon" className="cursor-pointer" />}
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </MenuTrigger>
            <MenuPopup align="end">
              <MenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSelected();
                }}
              >
                <CheckSquareIcon />
                {isSelected ? "Deselect" : "Select"}
              </MenuItem>
              <MenuItem onClick={onEdit}>
                <PencilIcon />
                Edit
              </MenuItem>
              <MenuItem variant="destructive" onClick={onDelete}>
                <Trash2Icon />
                Delete
              </MenuItem>
            </MenuPopup>
          </Menu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
