import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GetDriveType } from "@/types/convex";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArchiveIcon,
  DownloadIcon,
  FileAudioIcon,
  FileIcon,
  FileTextIcon,
  FileVideoIcon,
  FolderIcon,
  ImageIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import type { ComponentProps } from "react";

export function DetailsView() {
  const { data } = useSuspenseQuery(
    convexQuery(api.drive.getDrive, { parent: "private" as const }),
  );
  return (
    <DndContext
      onDragStart={(event) => {
        const { active } = event;
        console.log("Dragged item:", active.id);
      }}
      onDragEnd={(event) => {
        const { active, over } = event;
        console.log("Dragged item:", active.id);
        console.log("Dropped over:", over?.id);
      }}
    >
      {data.map((d) => {
        if (d.type === "folder") return <Folder key={d._id} d={d} />;
        return <File key={d._id} d={d} />;
      })}
    </DndContext>
  );
}

function Folder({ d }: { d: GetDriveType }) {
  const {
    setNodeRef: setDraggableRef,
    listeners,
    attributes,
    transform,
  } = useDraggable({
    id: `${d._id}-drag`,
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `${d._id}-drop`,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };
  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
  };

  return (
    <EntryWrapper
      style={style}
      ref={setNodeRef}
      className={cn(isOver && "border-blue-500")}
      {...listeners}
      {...attributes}
    >
      <Entry d={d} />
    </EntryWrapper>
  );
}
function File({ d }: { d: GetDriveType }) {
  const { setNodeRef, listeners, attributes, transform } = useDraggable({
    id: `${d._id}-drag`,
  });

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
  };

  return (
    <EntryWrapper style={style} ref={setNodeRef} {...listeners} {...attributes}>
      <Entry d={d} />
    </EntryWrapper>
  );
}

function EntryWrapper({ className, children }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-border hover:bg-muted/30 group bg-card flex cursor-pointer items-center gap-4 rounded-lg border p-2 transition-all duration-200 select-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Entry({ d }: { d: GetDriveType }) {
  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex-shrink-0">{getFileIcon(d.type.split("/")[0])}</div>
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
          <div className="font-mono">{bytesToMB(d.size)}</div>
        </div>
        <div className="min-w-[120px] text-right">
          <div>{new Date(d._creationTime).toLocaleString()}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
          <DownloadIcon className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontalIcon className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

function bytesToMB(bytes?: number) {
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
    case "pdf":
    case "doc":
      return <FileTextIcon {...iconProps} />;
    case "image":
      return <ImageIcon {...iconProps} />;
    case "video":
      return <FileVideoIcon {...iconProps} />;
    case "audio":
      return <FileAudioIcon {...iconProps} />;
    case "archive":
      return <ArchiveIcon {...iconProps} />;
    default:
      return <FileIcon {...iconProps} />;
  }
}
