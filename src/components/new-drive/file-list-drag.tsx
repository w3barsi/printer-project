import { useDroppable } from "@dnd-kit/core";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { NewDriveItem } from "@/lib/new-drive-items";
import { cn } from "@/lib/utils";

import { ItemIcon } from "./file-list-rows";

export function DeleteDropButton({
  itemCount,
  dragEnabled,
  onClick,
}: {
  itemCount: number;
  dragEnabled: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "new-drive-trash",
    data: { isTrash: true },
    disabled: !dragEnabled,
  });

  return (
    <Button
      ref={setNodeRef}
      type="button"
      variant={isOver ? "destructive" : "outline"}
      size="icon"
      className={cn(
        !isOver &&
          "text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive",
        isOver && "ring-2 ring-destructive/30",
      )}
      aria-label={
        isOver
          ? `Drop to delete ${itemCount} selected ${itemCount === 1 ? "item" : "items"}`
          : `Delete ${itemCount} selected ${itemCount === 1 ? "item" : "items"}`
      }
      onClick={onClick}
    >
      <Trash2Icon />
    </Button>
  );
}

export function DragPreview({ items }: { items: NewDriveItem[] }) {
  return (
    <div className="pointer-events-none flex w-72 flex-col gap-1 rounded-xl bg-background/80 p-2 opacity-80 shadow-xl ring-1 ring-foreground/10">
      {items.slice(0, 3).map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-lg bg-card px-3 py-2"
        >
          <ItemIcon kind={item.kind} />
          <span className="truncate text-sm font-medium">{item.name}</span>
        </div>
      ))}
      {items.length > 3 && (
        <p className="px-3 py-1 text-xs text-muted-foreground">
          +{items.length - 3} more selected
        </p>
      )}
    </div>
  );
}
