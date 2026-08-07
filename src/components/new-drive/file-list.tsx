import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpDownIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react";
import {
  useCallback,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import type { NewDriveItem } from "@/lib/new-drive-items";
import { cn } from "@/lib/utils";

export function NewDriveFileList({
  items,
  title,
  interactive = false,
  onDeleteItems,
  onMoveItems,
}: {
  items: NewDriveItem[];
  title: string;
  interactive?: boolean;
  onDeleteItems?: (itemIds: string[]) => void | Promise<void>;
  onMoveItems?: (itemIds: string[], destinationFolderId: string) => boolean;
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [hasCoarsePointer, setHasCoarsePointer] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const lastDragEndedAt = useRef(0);
  const usesDirectNavigation = isMobile || hasCoarsePointer;
  const selectionEnabled = interactive && !usesDirectNavigation;
  const dragEnabled = selectionEnabled && !!onMoveItems;
  const displayedItems = items;
  const selectedItems = displayedItems.filter((item) => selectedIds.includes(item.id));
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updatePointer = () => setHasCoarsePointer(mediaQuery.matches);
    mediaQuery.addEventListener("change", updatePointer);
    updatePointer();
    return () => mediaQuery.removeEventListener("change", updatePointer);
  }, []);

  useEffect(() => {
    if (usesDirectNavigation) {
      setSelectedIds([]);
      setSelectionAnchor(null);
    }
  }, [usesDirectNavigation]);

  function clearSelection() {
    setSelectedIds([]);
    setSelectionAnchor(null);
  }

  async function confirmDelete() {
    if (!onDeleteItems || deleteRequest.length === 0) return;
    setIsDeleting(true);
    try {
      await onDeleteItems(deleteRequest);
      toast.success(
        `${deleteRequest.length} ${deleteRequest.length === 1 ? "item" : "items"} deleted`,
        { position: "bottom-right" },
      );
      setDeleteRequest([]);
      clearSelection();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Items could not be deleted", {
        position: "bottom-right",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  function selectRange(itemId: string) {
    const anchorIndex = selectionAnchor
      ? displayedItems.findIndex((item) => item.id === selectionAnchor)
      : -1;
    const itemIndex = displayedItems.findIndex((item) => item.id === itemId);

    if (anchorIndex === -1 || itemIndex === -1) {
      setSelectedIds([itemId]);
      setSelectionAnchor(itemId);
      return;
    }

    const start = Math.min(anchorIndex, itemIndex);
    const end = Math.max(anchorIndex, itemIndex);
    setSelectedIds(displayedItems.slice(start, end + 1).map((item) => item.id));
  }

  function toggleSelection(itemId: string) {
    setSelectedIds((current) =>
      current.includes(itemId)
        ? current.filter((selectedId) => selectedId !== itemId)
        : [...current, itemId],
    );
    setSelectionAnchor(itemId);
  }

  function openItem(item: NewDriveItem) {
    if (item.kind === "folder") {
      navigate({
        to: "/app/newdrive/$spaceId/{-$folderId}",
        params: { spaceId: item.spaceId, folderId: item.id },
      });
      return;
    }

    toast.info("File preview is not connected yet", {
      description: item.name,
      position: "bottom-right",
    });
  }

  function handleItemClick(event: MouseEvent<HTMLDivElement>, item: NewDriveItem) {
    if (!interactive) return;
    if (performance.now() - lastDragEndedAt.current < 150) return;
    if (usesDirectNavigation) {
      openItem(item);
      return;
    }

    if (event.shiftKey) {
      selectRange(item.id);
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      toggleSelection(item.id);
      return;
    }

    setSelectedIds([item.id]);
    setSelectionAnchor(item.id);
  }

  function handleItemKeyDown(event: KeyboardEvent<HTMLDivElement>, item: NewDriveItem) {
    if (!interactive) return;

    if (event.key === "Enter") {
      event.preventDefault();
      openItem(item);
      return;
    }

    if (event.key === "Escape" && selectionEnabled) {
      event.preventDefault();
      clearSelection();
      return;
    }

    if (event.key !== " " || !selectionEnabled) return;

    event.preventDefault();
    if (event.shiftKey) {
      selectRange(item.id);
    } else if (event.ctrlKey || event.metaKey) {
      toggleSelection(item.id);
    } else {
      setSelectedIds([item.id]);
      setSelectionAnchor(item.id);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    if (!dragEnabled) return;
    const itemId = event.active.data.current?.itemId;
    if (typeof itemId !== "string") return;

    setActiveDragId(itemId);
    if (!selectedIds.includes(itemId)) {
      setSelectedIds([itemId]);
      setSelectionAnchor(itemId);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const draggedItemId = event.active.data.current?.itemId;
    const destinationFolderId = event.over?.data.current?.folderId;
    setActiveDragId(null);
    lastDragEndedAt.current = performance.now();

    if (
      !dragEnabled ||
      typeof draggedItemId !== "string" ||
      typeof destinationFolderId !== "string"
    ) {
      return;
    }

    const itemIds = selectedIds.includes(draggedItemId) ? selectedIds : [draggedItemId];
    if (itemIds.includes(destinationFolderId)) {
      toast.error("A folder cannot be moved into itself", { position: "bottom-right" });
      return;
    }

    const destination = displayedItems.find((item) => item.id === destinationFolderId);
    if (!destination || destination.kind !== "folder") return;

    const didMove = onMoveItems?.(itemIds, destinationFolderId) ?? false;
    if (!didMove) {
      toast.error("Items cannot be moved into that folder", {
        position: "bottom-right",
      });
      return;
    }
    toast.success(
      `${itemIds.length} ${itemIds.length === 1 ? "item" : "items"} moved to ${destination.name}`,
      { position: "bottom-right" },
    );
    clearSelection();
  }

  return (
    <section
      aria-labelledby="files-heading"
      className={cn("flex flex-col gap-3", interactive && "flex-1")}
      onClick={(event) => {
        if (selectionEnabled && event.target === event.currentTarget) clearSelection();
      }}
    >
      <h2 id="files-heading" className="sr-only">
        {title}
      </h2>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          {selectionEnabled && selectedIds.length > 0 && (
            <>
              <Badge variant="secondary">{selectedIds.length} selected</Badge>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete ${selectedIds.length} selected ${selectedIds.length === 1 ? "item" : "items"}`}
                onClick={() => setDeleteRequest(selectedIds)}
              >
                <Trash2Icon />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowUpDownIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Last modified</span>
          </Button>
        </div>
      </div>

      {displayedItems.length === 0 ? (
        <Empty className="rounded-lg bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpenIcon />
            </EmptyMedia>
            <EmptyTitle>No files or folders found</EmptyTitle>
            <EmptyDescription>
              Try a different search or add something to this folder.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          <div
            className="flex flex-col gap-1"
            role={selectionEnabled ? "listbox" : "list"}
            aria-label={title}
            aria-multiselectable={selectionEnabled || undefined}
            onClick={(event) => {
              if (selectionEnabled && event.target === event.currentTarget)
                clearSelection();
            }}
          >
            <div
              className="grid grid-cols-[minmax(0,1fr)_32px] px-4 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase md:grid-cols-[minmax(220px,1.7fr)_minmax(90px,.65fr)_minmax(130px,.85fr)_80px_110px_32px]"
              role="presentation"
            >
              <span>Name</span>
              <span className="hidden md:block">Owner</span>
              <span className="hidden md:block">Last modified</span>
              <span className="hidden md:block">Size</span>
              <span className="hidden md:block">Access</span>
              <span className="sr-only">Actions</span>
            </div>

            {displayedItems.map((item) => (
              <NewDriveFileRow
                key={item.id}
                item={item}
                interactive={interactive}
                selectionEnabled={selectionEnabled}
                dragEnabled={dragEnabled}
                isSelected={selectedIds.includes(item.id)}
                onClick={(event) => handleItemClick(event, item)}
                onDoubleClick={(event) => {
                  if (!selectionEnabled || event.ctrlKey || event.metaKey) return;
                  openItem(item);
                }}
                onKeyDown={(event) => handleItemKeyDown(event, item)}
                onContextMenu={() => {
                  if (selectionEnabled && !selectedIds.includes(item.id)) {
                    setSelectedIds([item.id]);
                    setSelectionAnchor(item.id);
                  }
                }}
                onDelete={() => setDeleteRequest([item.id])}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDragId && (
              <DragPreview
                items={
                  selectedIds.includes(activeDragId)
                    ? selectedItems
                    : displayedItems.filter((item) => item.id === activeDragId)
                }
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
      <AlertDialog
        open={deleteRequest.length > 0}
        onOpenChange={(open) => !open && !isDeleting && setDeleteRequest([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Delete {deleteRequest.length === 1 ? "this item" : "selected items"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRequest.length === 1 ? (
                <>
                  This will permanently remove{" "}
                  <strong>
                    {displayedItems.find((item) => item.id === deleteRequest[0])?.name}
                  </strong>
                  .
                </>
              ) : (
                `This will permanently remove ${deleteRequest.length} selected items.`
              )}{" "}
              Folders and everything inside them will be deleted. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {isDeleting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Trash2Icon data-icon="inline-start" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function NewDriveFileRow({
  item,
  interactive,
  selectionEnabled,
  dragEnabled,
  isSelected,
  onClick,
  onDoubleClick,
  onKeyDown,
  onContextMenu,
  onDelete,
}: {
  item: NewDriveItem;
  interactive: boolean;
  selectionEnabled: boolean;
  dragEnabled: boolean;
  isSelected: boolean;
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (event: MouseEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onContextMenu: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: `new-drive-item:${item.id}`,
    data: { itemId: item.id },
    disabled: !dragEnabled,
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `new-drive-folder:${item.id}`,
    data: { folderId: item.id },
    disabled: !dragEnabled || item.kind !== "folder" || isSelected,
  });
  const setNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
    },
    [setDraggableRef, setDroppableRef],
  );

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "group grid min-h-14 grid-cols-[minmax(0,1fr)_32px] items-center gap-3 rounded-lg bg-card px-4 py-2.5 transition-[color,background-color,box-shadow,opacity] duration-200 hover:bg-muted/50 md:grid-cols-[minmax(220px,1.7fr)_minmax(90px,.65fr)_minmax(130px,.85fr)_80px_110px_32px]",
        interactive && "cursor-pointer select-none",
        isSelected && selectionEnabled && "bg-muted/50 ring-1 ring-primary",
        isDragging && "opacity-35",
        isOver && "bg-primary/10 ring-2 ring-primary",
      )}
      role={selectionEnabled ? "option" : "listitem"}
      aria-selected={selectionEnabled ? isSelected : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      onContextMenu={onContextMenu}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ItemIcon kind={item.kind} />
        <div className="min-w-0">
          {item.kind === "folder" && !interactive ? (
            <Button
              variant="link"
              className="h-auto max-w-full justify-start p-0 font-medium"
              render={
                <Link
                  to="/app/newdrive/$spaceId/{-$folderId}"
                  params={{ spaceId: item.spaceId, folderId: item.id }}
                />
              }
            >
              <span className="truncate">{item.name}</span>
            </Button>
          ) : (
            <p className="truncate text-sm font-medium">{item.name}</p>
          )}
          <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
            {item.owner} / {item.updated} / {item.size}
          </p>
        </div>
      </div>
      <span className="hidden truncate text-xs text-muted-foreground md:block">
        {item.owner}
      </span>
      <span className="hidden truncate text-xs text-muted-foreground md:block">
        {item.updated}
      </span>
      <span className="hidden text-xs text-muted-foreground md:block">{item.size}</span>
      <div className="hidden md:block">
        <Badge
          variant="outline"
          className={cn(
            "h-6 rounded-md bg-background px-1.5 font-normal text-muted-foreground",
            item.access !== "Restricted" &&
              "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-400",
          )}
        >
          {item.access !== "Restricted" && <Share2Icon />}
          {item.access}
        </Badge>
      </div>
      <div
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground md:data-popup-open:opacity-100"
                aria-label={`More actions for ${item.name}`}
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <PencilIcon />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2Icon />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function DragPreview({ items }: { items: NewDriveItem[] }) {
  return (
    <div className="flex w-72 flex-col gap-1 rounded-xl bg-background p-2 shadow-xl ring-1 ring-foreground/10">
      {items.slice(0, 3).map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-lg bg-card px-3 py-2"
        >
          <ItemIcon kind={item.kind} />
          <span className="truncate text-sm font-medium">{item.name}</span>
        </div>
      ))}
      {items.length > 3 && (
        <p className="px-3 py-1 text-xs text-muted-foreground">
          +{items.length - 3} more selected
        </p>
      )}
    </div>
  );
}

function ItemIcon({ kind }: { kind: NewDriveItem["kind"] }) {
  if (kind === "folder") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
        <FolderIcon className="size-4 fill-current/10" />
      </span>
    );
  }

  const Icon =
    kind === "image" ? FileImageIcon : kind === "pdf" ? FileTextIcon : FileIcon;

  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Icon className="size-4" />
    </span>
  );
}
