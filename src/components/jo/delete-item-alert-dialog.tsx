import { api } from "@convex/_generated/api";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Item } from "@/types/convex";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";

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

  if (!item) return null;

  const handleDeleteItem = () => {
    deleteItem({ itemId: item._id, joId });
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you want to delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this Job Order.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteItem}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
