import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FolderIcon,
  FolderInputIcon,
  FolderUpIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, type KeyboardEvent, type MouseEvent, type RefObject } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NewDriveItem } from "@/lib/new-drive-items";
import { cn } from "@/lib/utils";

export type NewDriveParentPath = {
  spaceId: string;
  name: string;
  folderId: string | null;
};

export function ParentFolderRow({
  parentPath,
  onOpen,
  publicSafe,
  dragEnabled,
  lastDragEndedAt,
}: {
  parentPath: NewDriveParentPath;
  onOpen?: () => void;
  publicSafe: boolean;
  dragEnabled: boolean;
  lastDragEndedAt: RefObject<number>;
}) {
  const navigate = useNavigate();
  const { setNodeRef, isOver } = useDroppable({
    id: "new-drive-parent",
    data: { folderId: parentPath.folderId, isParent: true },
    disabled: !dragEnabled,
  });

  function openParentFolder() {
    if (performance.now() - lastDragEndedAt.current < 150) return;
    if (onOpen) {
      onOpen();
      return;
    }
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
      ref={setNodeRef}
      className={cn(
        "grid min-h-14 cursor-pointer grid-cols-[minmax(0,1fr)_32px] items-center gap-3 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-2.5 transition-colors duration-200 select-none hover:bg-muted/40",
        publicSafe
          ? "md:grid-cols-[minmax(220px,1.7fr)_minmax(130px,.85fr)_80px_32px]"
          : "md:grid-cols-[minmax(220px,1.7fr)_minmax(90px,.65fr)_minmax(130px,.85fr)_80px_110px_32px]",
        isOver && "border-primary bg-primary/10 ring-2 ring-primary",
      )}
      role="link"
      tabIndex={0}
      aria-label={`Open parent folder ${parentPath.name}`}
      onClick={openParentFolder}
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
      {!publicSafe && (
        <span className="hidden text-xs text-muted-foreground md:block">-</span>
      )}
      {!publicSafe && (
        <span className="hidden text-xs text-muted-foreground md:block">-</span>
      )}
      <span className="hidden text-xs text-muted-foreground md:block">-</span>
      <span className="hidden text-xs text-muted-foreground md:block">-</span>
      <span aria-hidden="true" />
    </div>
  );
}

export function NewDriveFileRow({
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
  onShare,
  onMove,
  canDelete,
  publicSafe,
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
  onShare?: () => void;
  onMove?: () => void;
  canDelete: boolean;
  publicSafe: boolean;
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
  const hasActions = !!onRename || !!onMove || !!onShare || canDelete;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "group grid min-h-14 grid-cols-[minmax(0,1fr)_32px] items-center gap-3 rounded-lg bg-card px-4 py-2.5 transition-[color,background-color,box-shadow,opacity] duration-200 hover:bg-muted/50",
        publicSafe
          ? "md:grid-cols-[minmax(220px,1.7fr)_minmax(130px,.85fr)_80px_32px]"
          : "md:grid-cols-[minmax(220px,1.7fr)_minmax(90px,.65fr)_minmax(130px,.85fr)_80px_110px_32px]",
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
            {publicSafe
              ? `${item.updated} / ${item.size}`
              : `${item.owner} / ${item.updated} / ${item.size}`}
          </p>
        </div>
      </div>
      {!publicSafe && (
        <span className="hidden truncate text-xs text-muted-foreground md:block">
          {item.owner}
        </span>
      )}
      <span className="hidden truncate text-xs text-muted-foreground md:block">
        {item.updated}
      </span>
      <span className="hidden text-xs text-muted-foreground md:block">{item.size}</span>
      {!publicSafe && (
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
      )}
      {hasActions ? (
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
                {onMove && (
                  <DropdownMenuItem onClick={onMove}>
                    <FolderInputIcon />
                    Move
                  </DropdownMenuItem>
                )}
                {onShare && (
                  <DropdownMenuItem onClick={onShare}>
                    <Share2Icon />
                    Share
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem variant="destructive" onClick={onDelete}>
                    <Trash2Icon />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}

export function ItemIcon({ kind }: { kind: NewDriveItem["kind"] }) {
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
