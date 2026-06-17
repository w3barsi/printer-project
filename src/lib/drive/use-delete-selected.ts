import { useCallback } from "react";

import { useSelected } from "@/contexts/SelectedContext";
import { useDeleteFilesOrFolders } from "@/lib/convex/optimistic-mutations";
import type { Parent } from "@/types/drive";

export function useDeleteSelected(parent: Parent) {
  const { selected, clearSelected } = useSelected();
  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteFilesOrFolders(parent);

  const deleteSelected = useCallback(() => {
    if (selected.length === 0) return;
    deleteMutate({ ids: selected });
    clearSelected();
  }, [selected, deleteMutate, clearSelected]);

  return { deleteSelected, isDeleting };
}
