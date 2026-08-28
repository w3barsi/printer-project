import { Button } from "@dg/ui/components/button";
import { ButtonGroup } from "@dg/ui/components/button-group";
import { Card, CardHeader } from "@dg/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@dg/ui/components/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dg/ui/components/empty";
import { useIsMobile } from "@dg/ui/hooks/use-mobile";
import { cn } from "@dg/ui/lib/utils";
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
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpDownIcon,
  DownloadIcon,
  FolderOpenIcon,
  FolderUpIcon,
  XIcon,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import type { DriveItem } from "../types";
import { DeleteItemsDialog, MoveItemDialog, RenameItemDialog } from "./file-list-dialogs";
import { DeleteDropButton, DragPreview } from "./file-list-drag";
import { DriveFileRow, type DriveParentPath } from "./file-list-rows";

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "modified", label: "Date modified" },
  { value: "size", label: "Size" },
  { value: "owner", label: "Owner" },
  { value: "access", label: "Access" },
] as const;

type SortBy = (typeof sortOptions)[number]["value"];

const itemCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function getSizeInBytes(size: string) {
  const match = size.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return 0;

  const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
  return Number(match[1]) * units[match[2].toUpperCase() as keyof typeof units];
}

function getModifiedTime(updated: string) {
  const normalized = updated.toLowerCase();
  const relativeMatch = normalized.match(
    /(\d+)\s+(minute|hour|day|week|month|year)s? ago/,
  );

  if (relativeMatch) {
    const unitMilliseconds = {
      minute: 60_000,
      hour: 3_600_000,
      day: 86_400_000,
      week: 604_800_000,
      month: 2_629_800_000,
      year: 31_557_600_000,
    };
    return (
      Date.now() -
      Number(relativeMatch[1]) *
        unitMilliseconds[relativeMatch[2] as keyof typeof unitMilliseconds]
    );
  }

  if (normalized.includes("less than a minute ago")) return Date.now();

  const relativeDay = normalized.match(/^(today|yesterday),\s*(.+)$/);
  if (relativeDay) {
    const date = new Date();
    if (relativeDay[1] === "yesterday") date.setDate(date.getDate() - 1);
    const time = new Date(`${date.toDateString()} ${relativeDay[2]}`).getTime();
    if (!Number.isNaN(time)) return time;
  }

  const timestamp = new Date(updated).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function DriveFileList({
  items,
  title,
  headerActions,
  interactive = false,
  parentPath,
  onDeleteItems,
  onMoveItems,
  onDownloadItem,
  onDownloadItems,
  onRenameItem,
  onShareItem,
  onOpenItem,
  onOpenParent,
  publicSafe = false,
  moveDestinations = [],
  deleteDescription,
  renderItemActions,
}: {
  items: DriveItem[];
  title: string;
  headerActions?: ReactNode;
  interactive?: boolean;
  parentPath?: DriveParentPath;
  onDeleteItems?: (itemIds: string[]) => void | Promise<void>;
  onMoveItems?: (
    itemIds: string[],
    destinationFolderId: string | null,
  ) => boolean | Promise<boolean>;
  onDownloadItem?: (item: DriveItem) => void | Promise<void>;
  onDownloadItems?: (items: DriveItem[]) => void | Promise<void>;
  onRenameItem?: (itemId: string, name: string) => void | Promise<void>;
  onShareItem?: (item: DriveItem) => void;
  onOpenItem?: (item: DriveItem) => void;
  onOpenParent?: () => void;
  publicSafe?: boolean;
  moveDestinations?: Array<{ id: string; name: string }>;
  deleteDescription?: string;
  renderItemActions?: (
    item: DriveItem,
    controls: { keepMenuOpen: () => void },
  ) => ReactNode;
}) {
  const dndContextId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [hasCoarsePointer, setHasCoarsePointer] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<string[]>([]);
  const [renameRequest, setRenameRequest] = useState<DriveItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [moveRequest, setMoveRequest] = useState<DriveItem | null>(null);
  const [moveDestinationId, setMoveDestinationId] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("modified");
  const lastDragEndedAt = useRef(0);
  const usesDirectNavigation = isMobile || hasCoarsePointer;
  const selectionEnabled = interactive && !usesDirectNavigation;
  const dragEnabled = selectionEnabled && !!onMoveItems;
  const displayedItems = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.kind === "folder" && b.item.kind !== "folder") return -1;
      if (a.item.kind !== "folder" && b.item.kind === "folder") return 1;

      let comparison = 0;
      if (sortBy === "name") comparison = itemCollator.compare(a.item.name, b.item.name);
      if (sortBy === "modified") {
        comparison = getModifiedTime(b.item.updated) - getModifiedTime(a.item.updated);
      }
      if (sortBy === "size") {
        comparison = getSizeInBytes(b.item.size) - getSizeInBytes(a.item.size);
      }
      if (sortBy === "owner")
        comparison = itemCollator.compare(a.item.owner, b.item.owner);
      if (sortBy === "access")
        comparison = itemCollator.compare(a.item.access, b.item.access);

      return comparison || a.index - b.index;
    })
    .map(({ item }) => item);
  const selectedItems = displayedItems.filter((item) => selectedIds.includes(item.id));
  const selectedFolderCount = selectedItems.filter(
    (item) => item.kind === "folder",
  ).length;
  const downloadSelectionLabel =
    selectedFolderCount === selectedItems.length
      ? `Download ${selectedItems.length === 1 ? "folder" : "folders"}`
      : selectedFolderCount === 0
        ? `Download ${selectedItems.length === 1 ? "file" : "files"}`
        : "Download items";
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

  useEffect(() => {
    if (!selectionEnabled) return;
    const container = cardRef.current?.closest('[data-slot="container"]');
    if (!container) return;

    function handleContainerClick(event: Event) {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-file-list-item], [data-file-list-selection-actions]")
      ) {
        return;
      }
      setSelectedIds([]);
      setSelectionAnchor(null);
    }

    container.addEventListener("click", handleContainerClick);
    return () => container.removeEventListener("click", handleContainerClick);
  }, [selectionEnabled]);

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

  function requestRename(item: DriveItem) {
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

  function openItem(item: DriveItem) {
    onOpenItem?.(item);
  }

  function openParentFolder() {
    if (!parentPath) return;
    onOpenParent?.();
  }

  function handleItemClick(event: MouseEvent<HTMLDivElement>, item: DriveItem) {
    if (!interactive) {
      openItem(item);
      return;
    }
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

  function handleItemKeyDown(event: KeyboardEvent<HTMLDivElement>, item: DriveItem) {
    if (!interactive) {
      if (event.key === "Enter") {
        event.preventDefault();
        openItem(item);
      }
      return;
    }

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
    <DndContext
      id={dndContextId}
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragId(null)}
    >
      <Card ref={cardRef} className="gap-0 bg-background py-0">
        <CardHeader className="py-6">
          {selectionEnabled && selectedIds.length > 0 ? (
            <div
              className="flex min-h-9 w-full items-center gap-2"
              data-file-list-selection-actions
            >
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
                {selectedIds.length} {selectedIds.length === 1 ? "item" : "items"}{" "}
                selected
              </span>
              {onDownloadItems && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void onDownloadItems(selectedItems)}
                >
                  <DownloadIcon data-icon="inline-start" />
                  {downloadSelectionLabel}
                </Button>
              )}
              <div className="ml-auto">
                <DeleteDropButton
                  itemCount={selectedIds.length}
                  dragEnabled={dragEnabled}
                  onClick={() => setDeleteRequest(selectedIds)}
                />
              </div>
            </div>
          ) : (
            <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <ButtonGroup>
                  <Button variant="outline">
                    <ArrowLeftIcon />
                  </Button>

                  <Button variant="outline">
                    <ArrowRightIcon />
                  </Button>
                </ButtonGroup>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={
                    parentPath
                      ? `Open parent folder ${parentPath.name}`
                      : "No parent folder"
                  }
                  disabled={!parentPath}
                  onClick={openParentFolder}
                >
                  <FolderUpIcon />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Sort by ${sortOptions.find((option) => option.value === sortBy)?.label}`}
                      />
                    }
                  >
                    <ArrowUpDownIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-48">
                    <DropdownMenuRadioGroup
                      value={sortBy}
                      onValueChange={(value) => setSortBy(value as SortBy)}
                    >
                      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                      {sortOptions.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {headerActions && <div className="ml-auto">{headerActions}</div>}
            </div>
          )}
        </CardHeader>
        <section
          aria-labelledby="files-heading"
          className={cn("flex flex-col", interactive && "flex-1")}
          onClick={(event) => {
            if (!selectionEnabled) return;
            if (
              event.target instanceof Element &&
              event.target.closest("[data-file-list-item]")
            ) {
              return;
            }
            clearSelection();
          }}
        >
          <h2 id="files-heading" className="sr-only">
            {title}
          </h2>
          {displayedItems.length === 0 && !parentPath ? (
            <Empty className="border-t bg-card py-14">
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
              className="flex flex-1 flex-col"
              role={selectionEnabled ? "listbox" : "list"}
              aria-label={title}
              aria-multiselectable={selectionEnabled || undefined}
            >
              <div
                className={cn(
                  "grid min-h-11 grid-cols-[minmax(0,1fr)_32px] items-center border-y bg-card px-6 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
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

              {displayedItems.map((item) => (
                <DriveFileRow
                  key={item.id}
                  item={item}
                  interactive={interactive || !!onOpenItem}
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
                  onDownload={
                    onDownloadItem ? () => void onDownloadItem(item) : undefined
                  }
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
                  renderItemActions={renderItemActions}
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
    </DndContext>
  );
}
