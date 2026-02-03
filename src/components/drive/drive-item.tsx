import { useDriveDrag } from "@/hooks/use-drive-drag";
import { extractId } from "@/lib/drive/drag-utils";
import { cn } from "@/lib/utils";
import type { GetDriveType } from "@/types/convex";
import { EntryWrapper } from "./entry";

interface DriveItemProps {
  item: GetDriveType;
  activeId: string | null;
  sharedTransform: { x: number; y: number } | null;
  isOverTrash: boolean;
}

export function DriveItem({
  item,
  activeId,
  sharedTransform,
  isOverTrash,
}: DriveItemProps) {
  const {
    setNodeRef,
    listeners,
    attributes,
    style,
    isDragging,
    isOver,
    isItemSelected,
    over,
    active,
    shouldTransform,
  } = useDriveDrag({
    itemId: item._id,
    activeId,
    sharedTransform,
  });

  const overId = over?.id ? extractId(over.id) : null;
  const activeDragId = active?.id ? extractId(active.id) : null;

  return (
    <EntryWrapper
      d={item}
      style={style}
      ref={setNodeRef}
      className={cn(
        isItemSelected && "border-blue-800",
        isOver && overId !== activeDragId && "border-blue-500",
        isOverTrash && shouldTransform && "border-red-500",
      )}
      {...listeners}
      {...attributes}
      isDragging={isDragging}
    />
  );
}
