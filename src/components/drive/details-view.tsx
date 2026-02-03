import type { GetDriveParentFolderType, GetDriveType } from "@/types/convex";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CornerLeftUpIcon, TrashIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSelected } from "@/contexts/SelectedContext";
import {
  useDeleteFilesOrFolders,
  useMoveFilesOrFolders,
} from "@/lib/convex/optimistic-mutations";
import { createDropId, extractId, isTrashTarget, TRASH_ID } from "@/lib/drive/drag-utils";
import { useGetParentFolder } from "@/lib/get-parent-folder";
import { cn } from "@/lib/utils";
import type { Parent } from "../ui-custom/upload-dropzone";
import { CreateFolderDialog } from "./create-folder-dialog";
import { DriveItem } from "./drive-item";
import { EntryWrapper } from "./entry";
import { TotalSpaceUsed } from "./total-space-used";

export function DetailsView() {
  const parent = useGetParentFolder();

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

  function handleDragMove(event: DragMoveEvent) {
    if (activeId && event.active.id === activeId) {
      setSharedTransform(event.delta);
      setIsOverTrash(event.over?.id === TRASH_ID);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const activeItemId = extractId(active.id);

    if (!activeItemId) return;

    setActiveId(active.id as string);
    setIsOverTrash(false);

    if (
      selected.length === 1 &&
      !selected.includes(activeItemId as Id<"folder"> | Id<"file">)
    ) {
      clearSelected();
    }

    // if (!selected.includes(activeItemId as Id<"folder"> | Id<"file">)) {
    //   addSelected(activeItemId as Id<"folder"> | Id<"file">);
    // }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setSharedTransform(null);
    setIsOverTrash(false);

    if (!active || !over) return;

    const activeItemId = extractId(active.id);
    const overItemId = extractId(over.id);
    console.log(over);

    if (!activeItemId || !overItemId) return;
    if (activeItemId === overItemId) return;

    if (isTrashTarget(overItemId)) {
      deleteMutate({ ids: selected });
      clearSelected();
      return;
    }

    const ids =
      selected.length > 0 ? selected : [activeItemId as Id<"folder"> | Id<"file">];

    mutate({
      ids,
      parent: overItemId as Parent,
    });

    clearSelected();
  }

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
          {data.data.map((item) => (
            <DriveItem
              key={item._id}
              item={item}
              activeId={activeId}
              sharedTransform={sharedTransform}
              isOverTrash={isOverTrash}
            />
          ))}
        </div>
      </DndContext>
      <DragOverlay>
        {activeId && <MultiDragPreview items={data.data} isOverTrash={isOverTrash} />}
      </DragOverlay>
    </>
  );
}

function TrashButton() {
  const { setNodeRef, isOver, active } = useDroppable({
    id: TRASH_ID,
  });
  const { selected, clearSelected } = useSelected();

  const parent = useGetParentFolder();
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

function ParentFolder({ parentFolder }: { parentFolder: GetDriveParentFolderType }) {
  const navigate = useNavigate();
  const { setNodeRef, isOver, over, active } = useDroppable({
    id: createDropId(parentFolder._id as string),
  });

  const overId = extractId(over?.id);
  const activeId = extractId(active?.id);

  return (
    <div
      onDoubleClick={async () => {
        navigate({
          to: "/drive/{-$drive}",
          params: {
            drive: parentFolder._id === "private" ? undefined : parentFolder._id,
          },
        });
      }}
      ref={setNodeRef}
      className={cn(
        "border-border hover:bg-muted/30 bg-card flex h-14 cursor-pointer items-center gap-4 rounded-lg border px-4 transition-colors duration-200 select-none",
        isOver && overId !== activeId && "border-blue-500",
      )}
    >
      <CornerLeftUpIcon className="text-muted-foreground size-4" />
      <h3 className="truncate text-sm font-medium">{parentFolder.name}</h3>
    </div>
  );
}

interface MultiDragPreviewProps {
  items: GetDriveType[];
  isOverTrash: boolean;
}

function MultiDragPreview({ items, isOverTrash }: MultiDragPreviewProps) {
  const { selected } = useSelected();

  const selectedItems = useMemo(
    () => items.filter((item) => selected.includes(item._id)),
    [items, selected],
  );

  return (
    <div className="flex flex-col gap-2">
      {selectedItems.map((item) => (
        <EntryWrapper
          d={item}
          key={item._id}
          className={cn("opacity-80", isOverTrash && "border-red-500")}
        />
      ))}
    </div>
  );
}
