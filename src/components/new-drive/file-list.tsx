// oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpDownIcon,
  FolderOpenIcon,
  FolderUpIcon,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useIsMobile } from "@/hooks/use-mobile";
import type { NewDriveItem } from "@/lib/new-drive-items";
import { cn } from "@/lib/utils";

import { ButtonGroup } from "../ui/button-group";
import { Card, CardHeader } from "../ui/card";
import { DeleteItemsDialog, MoveItemDialog, RenameItemDialog } from "./file-list-dialogs";
import { DeleteDropButton, DragPreview } from "./file-list-drag";
import {
  NewDriveFileRow,
  ParentFolderRow,
  type NewDriveParentPath,
} from "./file-list-rows";

export function NewDriveFileList({
  items,
  title,
  interactive = false,
  parentPath,
  onDeleteItems,
  onMoveItems,
  onRenameItem,
  onShareItem,
  onOpenItem,
  onOpenParent,
  publicSafe = false,
  moveDestinations = [],
  deleteDescription,
}: {
  items: NewDriveItem[];
  title: string;
  interactive?: boolean;
  parentPath?: NewDriveParentPath;
  onDeleteItems?: (itemIds: string[]) => void | Promise<void>;
  onMoveItems?: (
    itemIds: string[],
    destinationFolderId: string | null,
  ) => boolean | Promise<boolean>;
  onRenameItem?: (itemId: string, name: string) => void | Promise<void>;
  onShareItem?: (item: NewDriveItem) => void;
  onOpenItem?: (item: NewDriveItem) => void;
  onOpenParent?: () => void;
  publicSafe?: boolean;
  moveDestinations?: Array<{ id: string; name: string }>;
  deleteDescription?: string;
}) {
  const dndContextId = useId();
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
  const [moveRequest, setMoveRequest] = useState<NewDriveItem | null>(null);
  const [moveDestinationId, setMoveDestinationId] = useState("");
  const [isMoving, setIsMoving] = useState(false);
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

  async function confirmMove() {
    if (!onMoveItems || !moveRequest || !moveDestinationId) return;
    setIsMoving(true);
    try {
      const didMove = await onMoveItems([moveRequest.id], moveDestinationId);
      if (!didMove) throw new Error("Item cannot be moved there");
      toast.success(`${moveRequest.name} moved`, { position: "bottom-right" });
      setMoveRequest(null);
      setMoveDestinationId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Item could not be moved", {
        position: "bottom-right",
      });
    } finally {
      setIsMoving(false);
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
    if (onOpenItem) {
      onOpenItem(item);
      return;
    }
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
    const isParentTarget = event.over?.data.current?.isParent === true;
    const isTrashTarget = event.over?.data.current?.isTrash === true;
    setActiveDragId(null);
    lastDragEndedAt.current = performance.now();

    if (!dragEnabled || typeof draggedItemId !== "string") return;

    const itemIds = selectedIds.includes(draggedItemId) ? selectedIds : [draggedItemId];
    if (isTrashTarget) {
      setDeleteRequest(itemIds);
      return;
    }
    if (!isParentTarget && typeof destinationFolderId !== "string") return;
    if (
      typeof destinationFolderId === "string" &&
      itemIds.includes(destinationFolderId)
    ) {
      return;
    }

    const destination = isParentTarget
      ? parentPath
      : displayedItems.find((item) => item.id === destinationFolderId);
    if (!destination || ("kind" in destination && destination.kind !== "folder")) return;

    try {
      const destinationId = isParentTarget ? parentPath?.folderId : destinationFolderId;
      const didMove = (await onMoveItems?.(itemIds, destinationId ?? null)) ?? false;
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
    <Card className="bg-background">
      <CardHeader>
        <div className="flex gap-2">
          <ButtonGroup>
            <Button variant="outline">
              <ArrowLeftIcon />
            </Button>

            <Button variant="outline">
              <ArrowRightIcon />
            </Button>
          </ButtonGroup>
          <Button variant="outline">
            <FolderUpIcon />
          </Button>
        </div>
      </CardHeader>
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
          id={dndContextId}
          sensors={sensors}
          collisionDetection={pointerWithin}
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
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_32px] px-4 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
                  publicSafe
                    ? "md:grid-cols-[minmax(220px,1.7fr)_minmax(130px,.85fr)_80px_32px]"
                    : "md:grid-cols-[minmax(220px,1.7fr)_minmax(90px,.65fr)_minmax(130px,.85fr)_80px_110px_32px]",
                )}
                role="presentation"
              >
                <span>Name</span>
                {!publicSafe && <span className="hidden md:block">Owner</span>}
                <span className="hidden md:block">Last modified</span>
                <span className="hidden md:block">Size</span>
                {!publicSafe && <span className="hidden md:block">Access</span>}
                <span className="sr-only">Actions</span>
              </div>

              {parentPath && (
                <ParentFolderRow
                  parentPath={parentPath}
                  onOpen={onOpenParent}
                  publicSafe={publicSafe}
                  dragEnabled={dragEnabled}
                  lastDragEndedAt={lastDragEndedAt}
                />
              )}

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
                  onShare={onShareItem ? () => onShareItem(item) : undefined}
                  onMove={
                    onMoveItems && moveDestinations.some(({ id }) => id !== item.id)
                      ? () => {
                          setMoveRequest(item);
                          setMoveDestinationId("");
                        }
                      : undefined
                  }
                  canDelete={!!onDeleteItems}
                  publicSafe={publicSafe}
                />
              ))}
            </div>
          )}
          <DragOverlay modifiers={[snapCenterToCursor]}>
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
        <DeleteItemsDialog
          itemIds={deleteRequest}
          itemName={displayedItems.find((item) => item.id === deleteRequest[0])?.name}
          description={deleteDescription}
          isDeleting={isDeleting}
          onOpenChange={(open) => !open && !isDeleting && setDeleteRequest([])}
          onConfirm={() => void confirmDelete()}
        />
        <RenameItemDialog
          item={renameRequest}
          value={renameValue}
          isRenaming={isRenaming}
          onOpenChange={(open) => !open && !isRenaming && setRenameRequest(null)}
          onValueChange={setRenameValue}
          onSubmit={confirmRename}
        />
        <MoveItemDialog
          item={moveRequest}
          destinationId={moveDestinationId}
          destinations={moveDestinations}
          isMoving={isMoving}
          onOpenChange={(open) => !open && !isMoving && setMoveRequest(null)}
          onDestinationChange={setMoveDestinationId}
          onConfirm={() => void confirmMove()}
        />
      </section>
    </Card>
  );
}
