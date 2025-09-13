import { Button } from "@/components/ui/button";
import { useSelected, type SelectedItem } from "@/contexts/SelectedContext";
import {
  useDeleteFilesOrFolders,
  useMoveFilesOrFolders,
} from "@/lib/convex/optimistic-mutations";
import { cn } from "@/lib/utils";
import type { GetDriveParentFolderType, GetDriveType } from "@/types/convex";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  CornerLeftUpIcon,
  FileArchiveIcon,
  FileAudioIcon,
  FileIcon,
  FileTextIcon,
  FileVideoIcon,
  FolderIcon,
  ImageIcon,
  MoreHorizontalIcon,
  TrashIcon,
} from "lucide-react";
import { useState, type ComponentPropsWithRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import type { Parent } from "../ui/upload-dropzone";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MultiDragPreview({ data }: { activeId: string; data: any }) {
  const { selected } = useSelected();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedItems = data.data.filter((item: any) => selected.includes(item._id));

  return (
    <div className="flex flex-col gap-2">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {selectedItems.map((item: any) => (
        <EntryWrapper d={item} key={item._id} className="opacity-80"></EntryWrapper>
      ))}
    </div>
  );
}

export function DetailsView() {
  const { drive } = useParams({ from: "/(main)/drive/{-$drive}" });
  const parent: Parent = drive ? (drive as Id<"folder">) : "private";

  const [activeId, setActiveId] = useState<string | null>(null);
  const [sharedTransform, setSharedTransform] = useState<{ x: number; y: number } | null>(
    null,
  );

  const { selected, clearSelected, addSelected } = useSelected();
  const { data } = useSuspenseQuery(convexQuery(api.drive.getDrive, { parent }));

  const mutate = useMoveFilesOrFolders(parent);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
      >
        <div className="flex justify-between gap-4 pb-3">
          <div className="flex gap-2">
            <Button>Create Folder</Button>
            <TrashButton />
          </div>
          <Input placeholder="Search..." className="max-w-sm" />
        </div>
        {data.currentFolder && <ParentFolder parentFolder={data.parentFolder} />}
        {data.data.map((d) => {
          if (d.type === "folder")
            return (
              <Folder
                key={d._id}
                d={d}
                activeId={activeId}
                sharedTransform={sharedTransform}
              />
            );
          return (
            <File
              key={d._id}
              d={d}
              activeId={activeId}
              sharedTransform={sharedTransform}
            />
          );
        })}
      </DndContext>
      <DragOverlay>
        {activeId && <MultiDragPreview activeId={activeId} data={data} />}
      </DragOverlay>
    </>
  );

  function handleDragMove(event: DragMoveEvent) {
    if (activeId && event.active.id === activeId) {
      setSharedTransform(event.delta);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const activeId = active.id.toString().split("-")[0];
    setActiveId(active.id as string);
    if (!selected.includes(activeId as Id<"folder"> | Id<"file">)) {
      addSelected(activeId as Id<"folder"> | Id<"file">);
    }
    console.log("Dragged item:", active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setSharedTransform(null);
    if (active && over) {
      const activeId = active.id.toString().split("-")[0];
      const overId = over.id.toString().split("-")[0];
      if (activeId === overId) return console.log("same id");
      // TODO: handle trash
      if (overId === "trash") return console.log("trash");

      console.log(overId, activeId);
      const ids =
        selected.length > 0 ? selected : [activeId as Id<"folder"> | Id<"file">];

      mutate({
        ids,
        parent: overId as Parent,
      });

      clearSelected();
    }
  }
}

function TrashButton() {
  const { setNodeRef, isOver, active } = useDroppable({
    id: "trash",
  });
  const { selected } = useSelected();

  return (
    <Button
      ref={setNodeRef}
      size="icon"
      variant="destructive"
      className={cn(
        "opacity-100",
        isOver && "!bg-red-500 outline outline-red-200",
        !active && selected.length === 0 && "opacity-0",
      )}
    >
      <TrashIcon />
    </Button>
  );
}

function ParentFolder({ parentFolder: p }: { parentFolder: GetDriveParentFolderType }) {
  const navigate = useNavigate();
  const { setNodeRef, isOver, over, active } = useDroppable({
    id: `${p._id}-drop`,
  });

  return (
    <div
      onDoubleClick={async () => {
        navigate({
          to: "/drive/{-$drive}",
          params: { drive: p._id === "private" ? undefined : p._id },
        });
        console.log("Double clicked");
      }}
      ref={setNodeRef}
      className={cn(
        "border-border hover:bg-muted/30 bg-card flex h-14 cursor-pointer items-center gap-4 rounded-lg border px-4 transition-colors duration-200 select-none",
        isOver &&
          over?.id.toString().split("-")[0] !== active?.id.toString().split("-")[0] &&
          "border-blue-500",
      )}
    >
      <CornerLeftUpIcon className="text-muted-foreground size-4" />
      <h3 className="truncate text-sm font-medium">{p.name}</h3>
    </div>
  );
}

function Folder({
  d,
  activeId,
  sharedTransform,
}: {
  d: GetDriveType;
  activeId: string | null;
  sharedTransform: { x: number; y: number } | null;
}) {
  const navigate = useNavigate();
  const id = `${d._id}-drag`;
  const {
    setNodeRef: setDraggableRef,
    listeners,
    attributes,
    transform,
    isDragging,
    over: draggableOver,
    active: draggableActive,
  } = useDraggable({
    id,
  });

  const {
    setNodeRef: setDroppableRef,
    isOver,
    over,
    active,
  } = useDroppable({
    id: `${d._id}-drop`,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const { selected } = useSelected();

  const isItemSelected = selected.includes(d._id);
  // Transform if this item is being dragged OR if it's selected and another selected item is being dragged
  const draggedItemId = activeId?.split("-")[0] as SelectedItem;
  const shouldTransform =
    isDragging || (isItemSelected && draggedItemId && selected.includes(draggedItemId));

  const style = {
    transform:
      shouldTransform && (transform || sharedTransform)
        ? `translate(${(transform || sharedTransform)?.x}px, ${(transform || sharedTransform)?.y}px)`
        : undefined,
  };

  return (
    <EntryWrapper
      d={d}
      onDoubleClick={async () => {
        navigate({ to: "/drive/{-$drive}", params: { drive: d._id } });
        console.log("Double clicked");
      }}
      style={style}
      ref={setNodeRef}
      className={cn(
        isItemSelected && "border-blue-800",
        isOver &&
          over?.id.toString().split("-")[0] !== active?.id.toString().split("-")[0] &&
          "border-blue-500",
        draggableOver?.id.toString() === "trash" &&
          draggableActive?.id.toString() === id &&
          "border-red-500",
        shouldTransform && !isDragging && "ring-opacity-50 ring-2 ring-blue-700",
      )}
      {...listeners}
      {...attributes}
      isDragging={isDragging}
    />
  );
}
function File({
  d,
  activeId,
  sharedTransform,
}: {
  d: GetDriveType;
  activeId: string | null;
  sharedTransform: { x: number; y: number } | null;
}) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: `${d._id}-drag`,
  });

  const { isSelected, selected } = useSelected();

  // Transform if this item is being dragged OR if it's selected and another selected item is being dragged
  const isItemSelected = selected.includes(d._id);
  const draggedItemId = activeId?.split("-")[0] as SelectedItem;
  const shouldTransform =
    isDragging || (isItemSelected && draggedItemId && selected.includes(draggedItemId));

  const style = {
    transform:
      shouldTransform && (transform || sharedTransform)
        ? `translate(${(transform || sharedTransform)?.x}px, ${(transform || sharedTransform)?.y}px)`
        : undefined,
  };

  if (!d.isFile) return <div>error</div>;

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.ctrlKey) return;
    window.open(`https://drive.darcygraphix.com/${d.key}`);
  };

  return (
    <EntryWrapper
      className={cn(
        "transition-none",
        isSelected(d._id) && "border-blue-800",
        shouldTransform && !isDragging && "ring-opacity-50 ring-2 ring-blue-700",
      )}
      onDoubleClick={handleDoubleClick}
      isDragging={isDragging}
      style={style}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      d={d}
    />
  );
}

export function EntryWrapper({
  className,
  isDragging,
  d,
  ...props
}: { isDragging?: boolean; d: GetDriveType } & ComponentPropsWithRef<"div">) {
  const { isSelected, addSelected, removeSelected, selected, clearSelected } =
    useSelected();

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (selected.length === 0 && !e.ctrlKey) addSelected(d._id);
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

  return (
    <div
      onClick={handleClick}
      {...props}
      className={cn(
        "border-border hover:bg-muted/30 bg-card flex h-14 cursor-pointer items-center gap-4 rounded-lg border px-4 transition-colors duration-200 select-none",
        isDragging && "hover:bg-muted",
        className,
      )}
    >
      <Entry d={d} />
    </div>
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
          <DropdownMenuTrigger>
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
