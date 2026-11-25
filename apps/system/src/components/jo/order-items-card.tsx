import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { Button } from "@dg/ui-coss/components/button";
import { Card, CardContent, CardHeader } from "@dg/ui-coss/components/card";
import { Checkbox } from "@dg/ui-coss/components/checkbox";
import { Menu, MenuPopup, MenuItem, MenuTrigger } from "@dg/ui-coss/components/menu";
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
  GripVerticalIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useState } from "react";

import { AddItemDialog } from "@/components/jo/add-item-dialog";
import { DeleteItemAlertDialog } from "@/components/jo/delete-item-alert-dialog";
import { EditItemDialog } from "@/components/jo/edit-item-dialog";
import { formatCurrency } from "@/components/jo/job-order-formatters";
import type { Item } from "@/types/convex";

export function OrderItemsCard({ joId }: { joId: Id<"jo"> }) {
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));
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
  const [item, setItem] = useState<Item | null>(null);
  const [activeDrag, setActiveDrag] = useState<{
    item: Item;
    width?: number;
    height?: number;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    itemId: Id<"items">;
    position: "before" | "after";
  } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertDialogOpen, setIsDeleteAlertDialogOpen] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  if (jo === null) {
    return null;
  }

  const items = jo.items;
  const editable = jo.status !== "unconfirmed";

  function handleDragStart(event: DragStartEvent) {
    const itemId = event.active.data.current?.itemId as Id<"items"> | undefined;
    const draggedItem = items.find((currentItem) => currentItem._id === itemId);
    if (!draggedItem || !itemId) return;

    // dnd-kit hasn't populated `active.rect.current.initial` yet when
    // onDragStart fires, so measure the row element directly.
    const row = document.querySelector<HTMLTableRowElement>(
      `[data-order-item="${itemId}"]`,
    );
    const rect = row?.getBoundingClientRect();

    setActiveDrag({
      item: draggedItem,
      width: rect?.width,
      height: rect?.height,
    });
  }

  function handleDragOver(event: DragOverEvent) {
    const activeId = event.active.data.current?.itemId as Id<"items"> | undefined;
    const overId = event.over?.data.current?.itemId as Id<"items"> | undefined;

    if (!activeId || !overId || activeId === overId) {
      setDropTarget(null);
      return;
    }

    const fromIndex = items.findIndex((currentItem) => currentItem._id === activeId);
    const toIndex = items.findIndex((currentItem) => currentItem._id === overId);

    if (fromIndex === -1 || toIndex === -1) {
      setDropTarget(null);
      return;
    }

    setDropTarget({
      itemId: overId,
      // Moving down lands after the hovered item, moving up lands before it.
      position: fromIndex < toIndex ? "after" : "before",
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    setDropTarget(null);

    const activeId = event.active.data.current?.itemId as Id<"items"> | undefined;
    const overId = event.over?.data.current?.itemId as Id<"items"> | undefined;

    if (!activeId || !overId || activeId === overId) return;

    const itemIds = items.map((currentItem) => currentItem._id);
    const fromIndex = itemIds.indexOf(activeId);
    const toIndex = itemIds.indexOf(overId);

    if (fromIndex === -1 || toIndex === -1) return;

    itemIds.splice(toIndex, 0, ...itemIds.splice(fromIndex, 1));
    reorderItems({ joId, itemIds });
  }

  return (
    <>
      <EditItemDialog
        open={isEditDialogOpen}
        setOpen={setIsEditDialogOpen}
        item={item}
        joId={joId}
      />
      <DeleteItemAlertDialog
        open={isDeleteAlertDialogOpen}
        setOpen={setIsDeleteAlertDialogOpen}
        item={item}
        joId={joId}
      />
      <Card className="pt-6 pb-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Order Items</h3>
            {editable ? <AddItemDialog joId={joId} /> : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              setActiveDrag(null);
              setDropTarget(null);
            }}
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
                {items.map((item) => (
                  <OrderItemRow
                    key={item._id}
                    item={item}
                    editable={editable}
                    dropPosition={
                      dropTarget?.itemId === item._id ? dropTarget.position : undefined
                    }
                    onToggleChecked={() => toggleItemChecked({ itemId: item._id })}
                    onEdit={() => {
                      setIsEditDialogOpen(true);
                      setItem(item);
                    }}
                    onDelete={() => {
                      setIsDeleteAlertDialogOpen(true);
                      setItem(item);
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
                  style={{ width: activeDrag.width, height: activeDrag.height }}
                  className="pointer-events-none flex items-center gap-3 rounded-lg bg-background/90 px-3 text-sm shadow-xl ring-1 ring-foreground/10"
                >
                  <GripVerticalIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate font-medium">
                    {activeDrag.item.name}
                  </span>
                  <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                    {activeDrag.item.quantity} × {formatCurrency(activeDrag.item.price)}
                  </span>
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
  dropPosition,
  onToggleChecked,
  onEdit,
  onDelete,
}: {
  item: Item;
  editable: boolean;
  dropPosition?: "before" | "after";
  onToggleChecked: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
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
      {...(editable ? attributes : {})}
      {...(editable ? listeners : {})}
      className={cn(
        "group",
        editable && "cursor-grab select-none",
        isDragging && "opacity-40",
      )}
    >
      <TableCell
        className="w-10 cursor-pointer md:pl-4"
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
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
      >
        {editable ? (
          <Menu>
            <MenuTrigger
              render={<Button variant="ghost" size="icon" className="cursor-pointer" />}
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </MenuTrigger>
            <MenuPopup align="end">
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
