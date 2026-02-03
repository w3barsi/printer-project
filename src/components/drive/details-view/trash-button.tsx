import { useDroppable } from "@dnd-kit/core";
import { TrashIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSelected } from "@/contexts/SelectedContext";
import { useDeleteFilesOrFolders } from "@/lib/convex/optimistic-mutations";
import { TRASH_ID } from "@/lib/drive/drag-utils";
import { useGetParentFolder } from "@/lib/get-parent-folder";
import { cn } from "@/lib/utils";

export function TrashButton() {
  const { setNodeRef, isOver, active } = useDroppable({
    id: TRASH_ID,
  });
  const { selected, clearSelected } = useSelected();

  const parent = useGetParentFolder();
  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteFilesOrFolders(parent);

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
      aria-label="Delete selected items"
      disabled={isDeleting}
    >
      <TrashIcon />
    </Button>
  );
}
