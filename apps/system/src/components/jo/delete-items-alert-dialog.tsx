import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dg/ui-coss/components/alert-dialog";
import { Button } from "@dg/ui-coss/components/button";
import { toastManager } from "@dg/ui-coss/components/toast";
import { useMutation } from "convex/react";
import { useState } from "react";

import type { Item } from "@/types/convex";

export function DeleteItemsAlertDialog({
  open,
  setOpen,
  items,
  joId,
  onDeleted,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  items: Item[];
  joId: Id<"jo">;
  onDeleted?: () => void;
}) {
  const deleteItems = useMutation(api.items.deleteItems).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.jo.getOneComplete, { id: joId });
      if (!current) return;

      const selected = new Set(args.itemIds);
      const nextItems = current.items.filter((item) => !selected.has(item._id));

      localStore.setQuery(
        api.jo.getOneComplete,
        { id: joId },
        {
          ...current,
          items: nextItems,
          totalOrderValue: nextItems.reduce(
            (sum, item) => sum + item.quantity * item.price,
            0,
          ),
        },
      );
    },
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteItems = async () => {
    if (items.length === 0) return;

    setIsDeleting(true);
    try {
      await deleteItems({ joId, itemIds: items.map((item) => item._id) });
      toastManager.add({
        title:
          items.length === 1
            ? `"${items[0].name}" has been deleted.`
            : `${items.length} items deleted.`,
        type: "success",
      });
      onDeleted?.();
      setOpen(false);
    } catch {
      toastManager.add({
        title: "Failed to delete items. Please try again.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (items.length === 0) return null;

  const isSingle = items.length === 1;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isSingle
              ? "Do you want to delete this item?"
              : `Delete ${items.length} items?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            {isSingle ? (
              <strong>{items[0].name}</strong>
            ) : (
              `${items.length} selected items`
            )}
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose disabled={isDeleting} render={<Button variant="outline" />}>
            Cancel
          </AlertDialogClose>
          <Button variant="destructive" onClick={handleDeleteItems} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
