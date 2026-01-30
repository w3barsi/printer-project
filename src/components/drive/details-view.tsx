import type { SelectedItem } from "@/contexts/SelectedContext";
import type { GetDriveParentFolderType, GetDriveType } from "@/types/convex";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { CornerLeftUpIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSelected } from "@/contexts/SelectedContext";
import {
  useDeleteFilesOrFolders,
  useMoveFilesOrFolders,
} from "@/lib/convex/optimistic-mutations";
import { cn } from "@/lib/utils";
import type { Parent } from "../ui-custom/upload-dropzone";
import { CreateFolderDialog } from "./create-folder-dialog";
import { EntryWrapper } from "./entry";
import { TotalSpaceUsed } from "./total-space-used";

function MultiDragPreview({
  data,
  isOverTrash,
}: {
  activeId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  isOverTrash: boolean;
}) {
  const { selected } = useSelected();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedItems = data.data.filter((item: any) => selected.includes(item._id));

  return (
    <div className="flex flex-col gap-2">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {selectedItems.map((item: any) => (
        <EntryWrapper
          d={item}
          key={item._id}
          className={cn("opacity-80", isOverTrash && "border-red-500")}
        />
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
  const [isOverTrash, setIsOverTrash] = useState(false);

  const { selected, clearSelected, addSelected } = useSelected();
  const { data } = useSuspenseQuery(convexQuery(api.drive.getDrive, { parent }));

  const mutate = useMoveFilesOrFolders(parent);
  const deleteMutate = useDeleteFilesOrFolders(parent);

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
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <CreateFolderDialog parent={parent} />
            <TrashButton />
          </div>

          <TotalSpaceUsed />
        </div>
        <div className="flex flex-col gap-1">
          {data.currentFolder && <ParentFolder parentFolder={data.parentFolder} />}
          {data.data.map((d) => {
            if (d.type === "folder")
              return (
                <Folder
                  key={d._id}
                  d={d}
                  activeId={activeId}
                  sharedTransform={sharedTransform}
                  isOverTrash={isOverTrash}
                />
              );
            return (
              <File
                key={d._id}
                d={d}
                activeId={activeId}
                sharedTransform={sharedTransform}
                isOverTrash={isOverTrash}
              />
            );
          })}
        </div>
      </DndContext>
      <DragOverlay>
        {activeId && (
          <MultiDragPreview activeId={activeId} data={data} isOverTrash={isOverTrash} />
        )}
      </DragOverlay>
    </>
  );

  function handleDragMove(event: DragMoveEvent) {
    if (activeId && event.active.id === activeId) {
      setSharedTransform(event.delta);
      setIsOverTrash(event.over?.id === "trash");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const activeId = active.id.toString().split("-")[0];
    setActiveId(active.id as string);
    setIsOverTrash(false);
    if (!selected.includes(activeId as Id<"folder"> | Id<"file">)) {
      addSelected(activeId as Id<"folder"> | Id<"file">);
    }
    console.log("Dragged item:", active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setSharedTransform(null);
    setIsOverTrash(false);

    if (active && over) {
      const activeId = active.id.toString().split("-")[0];
      const overId = over.id.toString().split("-")[0];
      if (activeId === overId) return console.log("same id");
      // TODO: handle trash
      if (overId === "trash") {
        deleteMutate({ ids: selected });
        clearSelected();
        return;
      }

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
  const { selected, clearSelected } = useSelected();

  const { drive } = useParams({ from: "/(main)/drive/{-$drive}" });
  const parent: Parent = drive ? (drive as Id<"folder">) : "private";
  const deleteMutate = useDeleteFilesOrFolders(parent);

  return (
    <Button
      onClick={() => {
        deleteMutate({ ids: selected });
        clearSelected();
      }}
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
  isOverTrash,
}: {
  d: GetDriveType;
  activeId: string | null;
  sharedTransform: { x: number; y: number } | null;
  isOverTrash: boolean;
}) {
  const id = `${d._id}-drag`;
  const {
    setNodeRef: setDraggableRef,
    listeners,
    attributes,
    transform,
    isDragging,
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
      style={style}
      ref={setNodeRef}
      className={cn(
        isItemSelected && "border-blue-800",
        isOver &&
          over?.id.toString().split("-")[0] !== active?.id.toString().split("-")[0] &&
          "border-blue-500",
        isOverTrash && shouldTransform && "border-red-500",
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
  isOverTrash,
}: {
  d: GetDriveType;
  activeId: string | null;
  sharedTransform: { x: number; y: number } | null;
  isOverTrash: boolean;
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

  return (
    <EntryWrapper
      className={cn(
        "transition-none",
        isSelected(d._id) && "border-blue-800",
        isOverTrash && shouldTransform && "border-red-500",
      )}
      isDragging={isDragging}
      style={style}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      d={d}
    />
  );
}
