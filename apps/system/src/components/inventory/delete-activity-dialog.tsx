import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Doc } from "@dg/backend/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dg/ui/components/alert-dialog";
import { Spinner } from "@dg/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

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
      toast.success("Inventory activity deleted");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Could not delete inventory activity");
    },
  });

  return (
    <AlertDialog open={Boolean(activity)} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
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
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!activity || mutation.isPending}
            onClick={() => {
              if (activity) mutation.mutate({ activityId: activity._id });
            }}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Delete activity
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
