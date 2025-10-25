import type { GetDriveType } from "@/types/convex";
import type { Id } from "@convex/_generated/dataModel";
import type { ComponentPropsWithRef } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  CopyIcon,
  DownloadIcon,
  FileArchiveIcon,
  FileAudioIcon,
  FileIcon,
  FileTextIcon,
  FileVideoIcon,
  FolderIcon,
  ImageIcon,
  MoreHorizontalIcon,
  PenLineIcon,
  TrashIcon,
} from "lucide-react";

import type { Parent } from "../ui/upload-dropzone";
import { Button } from "@/components/ui/button";
import { useSelected } from "@/contexts/SelectedContext";
import { useDeleteFilesOrFolders } from "@/lib/convex/optimistic-mutations";
import { useGetParentFolder } from "@/lib/get-parent-folder";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { RenameDialog } from "./rename-dialog";

export function EntryWrapper({
  className,
  isDragging,
  d,
  ...props
}: { isDragging?: boolean; d: GetDriveType } & ComponentPropsWithRef<"div">) {
  const navigate = useNavigate();

  const [openRename, setOpenRename] = useState(false);

  const { isSelected, addSelected, removeSelected, selected, clearSelected } =
    useSelected();

  const parent = useGetParentFolder();

  const deleteMutate = useDeleteFilesOrFolders(parent);

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (selected.length === 1 && !e.ctrlKey && isSelected(d._id)) return clearSelected();
    if (selected.length === 0 && !e.ctrlKey) return addSelected(d._id);
    if (selected.length > 0 && !e.ctrlKey) {
      clearSelected();
      addSelected(d._id);
    }
    // if (selected.length > 0 && !e.ctrlKey) return clearSelected();
    if (!e.ctrlKey) return;

    if (isSelected(d._id)) {
      removeSelected(d._id);
    } else {
      addSelected(d._id);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.ctrlKey) return;
    if (d.isFile) return window.open(`https://drive.darcygraphix.com/${d.key}`);

    navigate({ to: "/drive/{-$drive}", params: { drive: d._id } });
  };

  const link = d.isFile
    ? `https://drive.darcygraphix.com/${d.key}`
    : `https://system.darcygraphix.com/drive/${d._id}`;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        onContextMenu={() => {
          if (!isSelected(d._id)) {
            clearSelected();
            addSelected(d._id);
          }
        }}
      >
        <div
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          className={cn(
            "border-border hover:bg-muted/30 bg-card flex h-14 cursor-pointer items-center gap-4 rounded-lg border px-4 transition-colors duration-200 select-none",
            isDragging && "hover:bg-muted",
            className,
          )}
          {...props}
        >
          <Entry d={d} />
          <RenameDialog d={d} openRename={openRename} setOpenRename={setOpenRename} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>
          <DownloadIcon />
          Download
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => setOpenRename(true)}>
          <PenLineIcon />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onSelect={async () => await navigator.clipboard.writeText(link)}>
          <CopyIcon />
          Copy Link
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuItem
          variant="destructive"
          onClick={() => {
            deleteMutate({ ids: selected });
            clearSelected();
          }}
        >
          <TrashIcon className="text-red-500" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function Entry({ d }: { d: GetDriveType }) {
  const { drive } = useParams({ from: "/(main)/drive/{-$drive}" });
  const parent: Parent = drive ? (drive as Id<"folder">) : "private";
  const mutate = useDeleteFilesOrFolders(parent);

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex-shrink-0">{getFileIcon(d.type)}</div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">{d.name}</h3>
          <p className="text-muted-foreground text-xs">
            {getFileTypeLabel(d.type.split("/")[0])}
          </p>
        </div>
      </div>

      {/* File Details */}
      <div className="text-muted-foreground flex items-center gap-6 text-sm">
        <div className="text-right">
          <div className="font-mono">{bytesToMB(d.isFile ? d.size : undefined)}</div>
        </div>
        <div className="min-w-[120px] text-right">
          <div>{new Date(d._creationTime).toLocaleString()}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                mutate({ ids: [d._id] });
              }}
            >
              <TrashIcon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

export function bytesToMB(bytes?: number) {
  if (!bytes) return "-";
  if (bytes <= 0) return "0 MB";
  return `${Math.round((bytes / (1024 * 1024)) * 100) / 100} MB`;
}

function getFileTypeLabel(type: string) {
  switch (type) {
    case "folder":
      return "";
    case "pdf":
      return "PDF Document";
    case "doc":
      return "Word Document";
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "archive":
      return "Archive";
    default:
      return "File";
  }
}

function getFileIcon(type: string) {
  const iconProps = { className: "h-4 w-4 text-muted-foreground" };

  switch (type) {
    case "folder":
      return <FolderIcon className="size-4 text-blue-500" />;
    case "application/pdf":
    case "application/msword":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.ms-excel":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/vnd.ms-powerpoint":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    case "text/plain":
      return <FileTextIcon {...iconProps} />;
    case "image/jpeg":
    case "image/jpg":
    case "image/png":
    case "image/webp":
    case "image/gif":
      return <ImageIcon {...iconProps} />;
    case "video/mp4":
    case "video/avi":
    case "video/mov":
    case "video/wmv":
      return <FileVideoIcon {...iconProps} />;
    case "audio/mp3":
    case "audio/wav":
    case "audio/flac":
      return <FileAudioIcon {...iconProps} />;
    case "application/zip":
    case "application/x-zip-compressed":
    case "application/x-rar-compressed":
      return <FileArchiveIcon {...iconProps} />;
    default:
      if (type.startsWith("image/")) return <ImageIcon {...iconProps} />;
      if (type.startsWith("video/")) return <FileVideoIcon {...iconProps} />;
      if (type.startsWith("audio/")) return <FileAudioIcon {...iconProps} />;
      return <FileIcon {...iconProps} />;
  }
}
