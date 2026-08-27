import { Badge } from "@dg/ui/components/badge";
import { Button } from "@dg/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dg/ui/components/dropdown-menu";
import { cn } from "@dg/ui/lib/utils";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  DownloadIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FolderIcon,
  FolderInputIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react";
import {
  useCallback,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import type { NewDriveItem } from "../types";

export type NewDriveParentPath = {
  spaceId: string;
  name: string;
  folderId: string | null;
};

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
  onDownload,
  onRename,
  onShare,
  onMove,
  canDelete,
  publicSafe,
  renderItemActions,
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
  onDownload?: () => void;
  onRename?: () => void;
  onShare?: () => void;
  onMove?: () => void;
  canDelete: boolean;
  publicSafe: boolean;
  renderItemActions?: (
    item: NewDriveItem,
    controls: { keepMenuOpen: () => void },
  ) => ReactNode;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
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
  const hasActions =
    !!onDownload ||
    !!onRename ||
    !!onMove ||
    !!onShare ||
    canDelete ||
    !!renderItemActions;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-file-list-item
      className={cn(
        "group grid min-h-14 grid-cols-[minmax(0,1fr)_32px] items-center gap-3 border-b border-border/60 bg-transparent px-6 py-2.5 transition-[color,background-color,box-shadow,opacity] duration-200 last:border-b-0 hover:bg-muted/35",
        publicSafe
          ? "md:grid-cols-[minmax(220px,1.7fr)_minmax(130px,.85fr)_80px_32px]"
          : "md:grid-cols-[minmax(220px,1.7fr)_minmax(90px,.65fr)_minmax(130px,.85fr)_80px_110px_32px]",
        interactive && "cursor-pointer select-none",
        isSelected && selectionEnabled && "bg-muted/70",
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
          <p className="truncate text-sm font-medium">{item.name}</p>
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
          <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
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
            <DropdownMenuContent align="end" className="w-max">
              <DropdownMenuGroup>
                {onDownload && (
                  <DropdownMenuItem onClick={onDownload}>
                    <DownloadIcon />
                    {item.kind === "folder" ? "Download Folder" : "Download File"}
                  </DropdownMenuItem>
                )}
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
                {renderItemActions?.(item, {
                  keepMenuOpen: () => setActionsOpen(true),
                })}
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
