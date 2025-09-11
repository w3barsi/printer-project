import { Button } from "@/components/ui/button";
import { useSelected } from "@/contexts/SelectedContext";
import { cn } from "@/lib/utils";
import type { GetDriveParentFolderType, GetDriveType } from "@/types/convex";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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

export function DetailsView() {
  const { drive } = useParams({ from: "/(main)/drive/{-$drive}" });
  const parent: Parent = drive ? (drive as Id<"folder">) : "private";

  const [showTrash, setShowTrash] = useState(false);

  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(convexQuery(api.drive.getDrive, { parent }));

  const { mutate } = useMutation<
    null,
    unknown,
    { id: Id<"folder"> | Id<"file">; parent: Parent },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { previousData: any }
  >({
    mutationFn: useConvexMutation(api.drive.moveFileOrFolder),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: convexQuery(api.drive.getDrive, { parent }).queryKey,
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(
        convexQuery(api.drive.getDrive, { parent }).queryKey,
      );

      // Optimistically update by removing the moved item only if moving to a different parent
      if (variables.parent !== parent) {
        queryClient.setQueryData(
          convexQuery(api.drive.getDrive, { parent }).queryKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (old: any) => {
            if (!old) return old;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newData = old.data.filter((item: any) => item._id !== variables.id);
            return { ...old, data: newData };
          },
        );
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Revert on error
      if (context?.previousData) {
        queryClient.setQueryData(
          convexQuery(api.drive.getDrive, { parent }).queryKey,
          context.previousData,
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure data is correct
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.drive.getDrive, { parent }).queryKey,
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  );
  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const { active } = event;
        console.log("Dragged item:", active.id);
      }}
      onDragEnd={(event) => {
        const { active, over } = event;
        if (active && over) {
          const activeId = active.id.toString().split("-")[0];
          const overId = over.id.toString().split("-")[0];
          if (activeId === overId) return console.log("same id");
          if (overId === "trash") return console.log("trash");

          console.log(overId, activeId);
          mutate({ id: activeId as Id<"folder"> | Id<"file">, parent: overId as Parent });
        }
      }}
      onDragOver={(e) => {
        console.log(e.active, e.over);
      }}
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
        if (d.type === "folder") return <Folder key={d._id} d={d} />;
        return <File key={d._id} d={d} />;
      })}
    </DndContext>
  );
}

function TrashButton() {
  const { setNodeRef, isOver, active } = useDroppable({
    id: "trash",
  });

  console.log(isOver);
  return (
    <Button
      ref={setNodeRef}
      size="icon"
      variant="destructive"
      className={cn(isOver && "!bg-red-500 outline outline-red-200")}
      hidden={!active}
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
    <EntryWrapper
      onDoubleClick={async () => {
        navigate({
          to: "/drive/{-$drive}",
          params: { drive: p._id === "private" ? undefined : p._id },
        });
        console.log("Double clicked");
      }}
      ref={setNodeRef}
      className={cn(
        isOver &&
          over?.id.toString().split("-")[0] !== active?.id.toString().split("-")[0] &&
          "border-blue-500",
      )}
    >
      <CornerLeftUpIcon className="text-muted-foreground size-4" />
      <h3 className="truncate text-sm font-medium">{p.name}</h3>
    </EntryWrapper>
  );
}

function Folder({ d }: { d: GetDriveType }) {
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
  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
  };

  return (
    <EntryWrapper
      onDoubleClick={async () => {
        navigate({ to: "/drive/{-$drive}", params: { drive: d._id } });
        console.log("Double clicked");
      }}
      style={style}
      ref={setNodeRef}
      className={cn(
        isOver &&
          over?.id.toString().split("-")[0] !== active?.id.toString().split("-")[0] &&
          "border-blue-500",
        draggableOver?.id.toString() === "trash" &&
          draggableActive?.id.toString() === id &&
          "border-red-500",
      )}
      {...listeners}
      {...attributes}
      isDragging={isDragging}
    >
      <Entry d={d} />
    </EntryWrapper>
  );
}
function File({ d }: { d: GetDriveType }) {
  const id = `${d._id}-drag`;
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: `${d._id}-drag`,
  });

  const { isSelected, addSelected, removeSelected, selected, clearSelected } =
    useSelected();

  const shouldTransform = isDragging || isSelected(d._id);
  const style = {
    transform:
      shouldTransform && transform
        ? `translate(${transform.x}px, ${transform.y}px)`
        : undefined,
  };

  if (!d.isFile) return <div>error</div>;

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (selected.length > 0 && !e.ctrlKey) return clearSelected();
    if (!e.ctrlKey) return;

    if (isSelected(d._id)) {
      removeSelected(d._id);
    } else {
      addSelected(d._id);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.ctrlKey) return;
    window.open(`https://drive.darcygraphix.com/${d.key}`);
  };

  return (
    <EntryWrapper
      className={cn("transition-none", isSelected(d._id) && "border-blue-800")}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      isDragging={isDragging}
      style={style}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
    >
      <Entry d={d} />
    </EntryWrapper>
  );
}

export function EntryWrapper({
  className,
  children,
  isDragging,
  ...props
}: { isDragging?: boolean } & ComponentPropsWithRef<"div">) {
  return (
    <div
      onClick={() => {}}
      {...props}
      className={cn(
        "border-border hover:bg-muted/30 bg-card flex h-14 cursor-pointer items-center gap-4 rounded-lg border px-4 transition-colors duration-200 select-none",
        isDragging && "hover:bg-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Entry({ d }: { d: GetDriveType }) {
  const { drive } = useParams({ from: "/(main)/drive/{-$drive}" });
  const parent: Parent = drive ? (drive as Id<"folder">) : "private";
  const queryClient = useQueryClient();
  const { mutate } = useMutation<
    null,
    unknown,
    { ids: Array<Id<"folder"> | Id<"file">> },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { previousData: any }
  >({
    mutationFn: useConvexMutation(api.drive.deleteFilesOrFolders),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: convexQuery(api.drive.getDrive, { parent }).queryKey,
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(
        convexQuery(api.drive.getDrive, { parent }).queryKey,
      );

      // Optimistically update by removing the deleted items
      queryClient.setQueryData(
        convexQuery(api.drive.getDrive, { parent }).queryKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => {
          if (!old) return old;
          const newData = old.data.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (item: any) => !variables.ids.includes(item._id),
          );
          return { ...old, data: newData };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Revert on error
      if (context?.previousData) {
        queryClient.setQueryData(
          convexQuery(api.drive.getDrive, { parent }).queryKey,
          context.previousData,
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure data is correct
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.drive.getDrive, { parent }).queryKey,
      });
    },
  });

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
