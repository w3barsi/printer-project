import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Trash2Icon } from "lucide-react";
import { useRef } from "react";

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

export function DeleteJoAlertDialog({ joId }: { joId: Id<"jo"> }) {
  const navigate = useNavigate();
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
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

  const deleteJo = () => {
    mutate({ joId: joId });
    navigate({ to: "/jo" });
  };

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button variant="destructive-outline" size="icon" ref={deleteButtonRef}>
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
            This action cannot be undone. This will permanently delete this Job Order.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={deleteJo}>
            <Trash2Icon />
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
