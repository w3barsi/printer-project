import type { GetDriveType } from "@/types/convex";
import { useMemo } from "react";

import { useSelected } from "@/contexts/SelectedContext";
import { cn } from "@/lib/utils";
import { EntryWrapper } from "../entry";

interface MultiDragPreviewProps {
  items: GetDriveType[];
  isOverTrash: boolean;
}

export function MultiDragPreview({ items, isOverTrash }: MultiDragPreviewProps) {
  const { selected } = useSelected();

  const selectedItems = useMemo(
    () => items.filter((item) => selected.includes(item._id)),
    [items, selected],
  );

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Dragging items">
      {selectedItems.map((item) => (
        <EntryWrapper
          d={item}
          key={item._id}
          className={cn("opacity-80", isOverTrash && "border-red-500")}
          aria-grabbed="true"
        />
      ))}
    </div>
  );
}
