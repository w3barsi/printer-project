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

export function DeleteItemAlertDialog({
  open,
  setOpen,
  item,
  joId,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  item: Item | null;
  joId: Id<"jo">;
}) {
  const deleteItem = useMutation(api.items.deleteItem);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteItem = async () => {
    if (!item) return null;
    setIsDeleting(true);
    try {
      await deleteItem({ itemId: item._id, joId });
      toastManager.add({ title: `"${item.name}" has been deleted.`, type: "success" });
      setOpen(false);
    } catch (error) {
      toastManager.add({
        title: "Failed to delete item. Please try again.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!item) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Do you want to delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            <strong>{item.name}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose disabled={isDeleting} render={<Button variant="outline" />}>
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            onClick={handleDeleteItem}
            disabled={isDeleting}
            render={<Button variant="destructive" />}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
