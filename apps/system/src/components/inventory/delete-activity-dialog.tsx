import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Doc } from "@dg/backend/dataModel";
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
import { Spinner } from "@dg/ui-coss/components/spinner";
import { toastManager } from "@dg/ui-coss/components/toast";
import { useMutation } from "@tanstack/react-query";

const operationLabels: Record<Doc<"inventoryActivities">["operation"], string> = {
  item_created: "Item created",
  stock_added: "Stock added",
  stock_removed: "Stock used",
  quantity_corrected: "Count corrected",
  details_updated: "Details updated",
};

export function DeleteInventoryActivityDialog({
  activity,
  onOpenChange,
}: {
  activity: Doc<"inventoryActivities"> | null;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.deleteActivity),
    onSuccess: () => {
      toastManager.add({ title: "Inventory activity deleted", type: "success" });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not delete inventory activity",
        type: "error",
      });
    },
  });

  return (
    <AlertDialog open={Boolean(activity)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete inventory activity?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the{" "}
            {activity ? operationLabels[activity.operation] : ""}
            {activity ? ` entry for ${activity.itemNameAfter}` : " entry"}. It will not
            change the item&apos;s current stock balance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            disabled={mutation.isPending}
            render={<Button variant="outline" />}
          >
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            disabled={!activity || mutation.isPending}
            onClick={() => {
              if (activity) mutation.mutate({ activityId: activity._id });
            }}
            render={<Button variant="destructive" />}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Delete activity
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
