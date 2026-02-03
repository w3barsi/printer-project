import type { GetDriveType } from "@/types/convex";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { Parent } from "@/components/ui-custom/upload-dropzone";
import { useSelected } from "@/contexts/SelectedContext";
import {
  useDeleteFilesOrFolders,
  useMoveFilesOrFolders,
} from "@/lib/convex/optimistic-mutations";
import { extractId, isTrashTarget, TRASH_ID } from "@/lib/drive/drag-utils";
import { useGetParentFolder } from "@/lib/get-parent-folder";
import { CreateFolderDialog } from "../create-folder-dialog";
import { DriveItem } from "../drive-item";
import { TotalSpaceUsed } from "../total-space-used";

import { MultiDragPreview } from "./multi-drag-preview";
import { ParentFolder } from "./parent-folder";
import { TrashButton } from "./trash-button";

export function DetailsView() {
  const parent = useGetParentFolder();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [sharedTransform, setSharedTransform] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isOverTrash, setIsOverTrash] = useState(false);

  const { selected, clearSelected, addSelected } = useSelected();
  const { data } = useSuspenseQuery(convexQuery(api.drive.getDrive, { parent }));

  const { mutate: moveMutate, isPending: isMoving } = useMoveFilesOrFolders(parent);
  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteFilesOrFolders(parent);

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

    if (!selected.includes(activeItemId as Id<"folder"> | Id<"file">)) {
      addSelected(activeItemId as Id<"folder"> | Id<"file">);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setSharedTransform(null);
    setIsOverTrash(false);

    if (!active || !over) return;

    const activeItemId = extractId(active.id);
    const overItemId = extractId(over.id);

    if (!activeItemId || !overItemId) return;
    if (activeItemId === overItemId) return;

    if (isTrashTarget(overItemId)) {
      deleteMutate({ ids: selected });
      clearSelected();
      return;
    }

    const ids =
      selected.length > 0 ? selected : [activeItemId as Id<"folder"> | Id<"file">];

    moveMutate({
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
        <div
          className="relative flex flex-col gap-1"
          role="listbox"
          aria-label="Drive items"
          aria-multiselectable="true"
          aria-busy={isMoving || isDeleting}
        >
          {(isMoving || isDeleting) && (
            <div
              className="absolute inset-0 z-50 animate-pulse rounded-lg bg-black/5"
              aria-hidden="true"
            />
          )}
          {data.currentFolder && data.parentFolder && (
            <ParentFolder parentFolder={data.parentFolder} />
          )}
          {data.data.map((item: GetDriveType) => (
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
