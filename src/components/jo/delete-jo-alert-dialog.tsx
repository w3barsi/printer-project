import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useHotkeys } from "react-hotkeys-hook";
import { Kbd } from "../ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function DeleteJoAlertDialog({
  joId,
  joName,
  joNumber,
}: {
  joId: Id<"jo">;
  joName?: string;
  joNumber?: string;
}) {
  const navigate = useNavigate();
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  useHotkeys("d", () => deleteButtonRef.current?.click());

  const mutate = useMutation(api.jo.deleteJo).withOptimisticUpdate((localStore, args) => {
    const getWithPaginationArgs = { paginationOptions: { cursor: null, numItems: 10 } };

    const currentValue = localStore.getQuery(
      api.jo.getWithPagination,
      getWithPaginationArgs,
    );

    if (currentValue === undefined) {
      return;
    }

    const newValue = {
      nextCursor: currentValue.nextCursor,
      jos: currentValue.jos.filter((c) => c._id !== args.joId),
    };

    localStore.setQuery(api.jo.getWithPagination, getWithPaginationArgs, newValue);

    const oldRecentJos = localStore.getQuery(api.jo.getRecent);
    if (!oldRecentJos) return;
    localStore.setQuery(
      api.jo.getRecent,
      {},
      oldRecentJos.filter((c) => c.id !== args.joId),
    );
  });

  const deleteJo = async () => {
    setIsDeleting(true);
    try {
      await mutate({ joId: joId });
      toast.success(
        joName
          ? `"${joName}" has been deleted.`
          : `Job Order #${joNumber} has been deleted.`,
      );
      navigate({ to: "/jo" });
    } catch (error) {
      toast.error("Failed to delete job order. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              ref={deleteButtonRef}
            >
              <Trash2Icon />
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            Delete Job Order <Kbd>D</Kbd>
          </div>
        </TooltipContent>
      </Tooltip>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            <strong>"{joName}"</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={deleteJo}
            disabled={isDeleting}
          >
            <Trash2Icon />
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
