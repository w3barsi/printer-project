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
  FolderUpIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react";
import {
  useCallback,
  type FormEvent,
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import type { NewDriveItem } from "@/lib/new-drive-items";
import { cn } from "@/lib/utils";

export function NewDriveFileList({
  items,
  title,
  interactive = false,
  parentPath,
  onDeleteItems,
  onMoveItems,
  onRenameItem,
}: {
  items: NewDriveItem[];
  title: string;
  interactive?: boolean;
  parentPath?: { spaceId: string; name: string; folderId: string | null };
  onDeleteItems?: (itemIds: string[]) => void | Promise<void>;
  onMoveItems?: (
    itemIds: string[],
    destinationFolderId: string,
  ) => boolean | Promise<boolean>;
  onRenameItem?: (itemId: string, name: string) => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [hasCoarsePointer, setHasCoarsePointer] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<string[]>([]);
  const [renameRequest, setRenameRequest] = useState<NewDriveItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
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

  async function confirmRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onRenameItem || !renameRequest || !renameValue.trim()) return;
    setIsRenaming(true);
    try {
      await onRenameItem(renameRequest.id, renameValue);
      toast.success(`Renamed to ${renameValue.trim()}`, { position: "bottom-right" });
      setRenameRequest(null);
      setIsRenaming(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Item could not be renamed", {
        position: "bottom-right",
      });
      setIsRenaming(false);
    }
  }

  function requestRename(item: NewDriveItem) {
    setRenameValue(item.name);
    setRenameRequest(item);
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

    navigate({
      to: "/app/newdrive/file/$itemId",
      params: { itemId: item.id },
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

  async function handleDragEnd(event: DragEndEvent) {
    const draggedItemId = event.active.data.current?.itemId;
    const destinationFolderId = event.over?.data.current?.folderId;
    const isTrashTarget = event.over?.data.current?.isTrash === true;
    setActiveDragId(null);
    lastDragEndedAt.current = performance.now();

    if (!dragEnabled || typeof draggedItemId !== "string") return;

    const itemIds = selectedIds.includes(draggedItemId) ? selectedIds : [draggedItemId];
    if (isTrashTarget) {
      setDeleteRequest(itemIds);
      return;
    }
    if (typeof destinationFolderId !== "string") return;
    if (itemIds.includes(destinationFolderId)) {
      toast.error("A folder cannot be moved into itself", { position: "bottom-right" });
      return;
    }

    const destination = displayedItems.find((item) => item.id === destinationFolderId);
    if (!destination || destination.kind !== "folder") return;

    try {
      const didMove = (await onMoveItems?.(itemIds, destinationFolderId)) ?? false;
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Items could not be moved", {
        position: "bottom-right",
      });
    }
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
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            {selectionEnabled && selectedIds.length > 0 && (
              <>
                <Badge variant="secondary">{selectedIds.length} selected</Badge>
                <DeleteDropButton
                  itemCount={selectedIds.length}
                  dragEnabled={dragEnabled}
                  onClick={() => setDeleteRequest(selectedIds)}
                />
              </>
            )}
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ArrowUpDownIcon data-icon="inline-start" />
              <span className="hidden sm:inline">Last modified</span>
            </Button>
          </div>
        </div>

        {displayedItems.length === 0 && !parentPath ? (
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

            {parentPath && <ParentFolderRow parentPath={parentPath} />}

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
                onRename={onRenameItem ? () => requestRename(item) : undefined}
              />
            ))}
          </div>
        )}
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
      <Dialog
        open={renameRequest !== null}
        onOpenChange={(open) => !open && !isRenaming && setRenameRequest(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>
              Enter a new name for {renameRequest?.name}.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={confirmRename}>
            <Input
              autoFocus
              aria-label="New item name"
              maxLength={255}
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isRenaming}
                onClick={() => setRenameRequest(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isRenaming ||
                  !renameValue.trim() ||
                  renameValue.trim() === renameRequest?.name
                }
              >
                {isRenaming && <Spinner data-icon="inline-start" />}
                Rename
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ParentFolderRow({
  parentPath,
}: {
  parentPath: { spaceId: string; name: string; folderId: string | null };
}) {
  const navigate = useNavigate();

  function openParentFolder() {
    navigate({
      to: "/app/newdrive/$spaceId/{-$folderId}",
      params: {
        spaceId: parentPath.spaceId,
        folderId: parentPath.folderId ?? undefined,
      },
    });
  }

  return (
    <div
      className="grid min-h-14 cursor-pointer grid-cols-[minmax(0,1fr)_32px] items-center gap-3 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-2.5 transition-colors duration-200 select-none hover:bg-muted/40 md:grid-cols-[minmax(220px,1.7fr)_minmax(90px,.65fr)_minmax(130px,.85fr)_80px_110px_32px]"
      role="link"
      tabIndex={0}
      aria-label={`Open parent folder ${parentPath.name}`}
      onDoubleClick={openParentFolder}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        openParentFolder();
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FolderUpIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Up one level
          </p>
          <p className="truncate text-sm font-medium">{parentPath.name}</p>
        </div>
      </div>
      <span className="hidden text-xs text-muted-foreground md:block">-</span>
      <span className="hidden text-xs text-muted-foreground md:block">-</span>
      <span className="hidden text-xs text-muted-foreground md:block">-</span>
      <span className="hidden text-xs text-muted-foreground md:block">-</span>
      <span aria-hidden="true" />
    </div>
  );
}

function DeleteDropButton({
  itemCount,
  dragEnabled,
  onClick,
}: {
  itemCount: number;
  dragEnabled: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "new-drive-trash",
    data: { isTrash: true },
    disabled: !dragEnabled,
  });

  return (
    <Button
      ref={setNodeRef}
      type="button"
      variant={isOver ? "destructive" : "outline"}
      size="icon-sm"
      className={cn(
        !isOver &&
          "text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive",
        isOver && "ring-2 ring-destructive/30",
      )}
      aria-label={
        isOver
          ? `Drop to delete ${itemCount} selected ${itemCount === 1 ? "item" : "items"}`
          : `Delete ${itemCount} selected ${itemCount === 1 ? "item" : "items"}`
      }
      onClick={onClick}
    >
      <Trash2Icon />
    </Button>
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
  onRename,
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
  onRename?: () => void;
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
            <Link
              to="/app/newdrive/$spaceId/{-$folderId}"
              params={{ spaceId: item.spaceId, folderId: item.id }}
              className={buttonVariants({
                variant: "link",
                className: "h-auto max-w-full justify-start p-0 font-medium",
              })}
            >
              <span className="truncate">{item.name}</span>
            </Link>
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
              {onRename && (
                <DropdownMenuItem onClick={onRename}>
                  <PencilIcon />
                  Rename
                </DropdownMenuItem>
              )}
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
    <div className="pointer-events-none flex w-72 flex-col gap-1 rounded-xl bg-background/80 p-2 opacity-80 shadow-xl ring-1 ring-foreground/10">
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
