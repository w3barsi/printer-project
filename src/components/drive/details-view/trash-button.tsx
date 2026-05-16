import { useDroppable } from "@dnd-kit/core";
import { TrashIcon } from "lucide-react";

import type { Parent } from "@/types/drive";
import { Button } from "@/components/ui/button";
import { useSelected } from "@/contexts/SelectedContext";
import { TRASH_ID } from "@/lib/drive/drag-utils";
import { useDeleteSelected } from "@/lib/drive/use-delete-selected";
import { cn } from "@/lib/utils";

export function TrashButton({ parent }: { parent: Parent }) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: TRASH_ID,
  });
  const { selected } = useSelected();
  const { deleteSelected, isDeleting } = useDeleteSelected(parent);

  return (
    <Button
      onClick={() => { deleteSelected(); }}
      ref={setNodeRef}
      size="icon"
      variant="destructive"
      className={cn(
        "opacity-100",
        isOver && "!bg-red-500 outline outline-red-200",
        !active && selected.length === 0 && "opacity-0",
      )}
      aria-label="Delete selected items"
      disabled={isDeleting}
    >
      <TrashIcon />
    </Button>
  );
}
