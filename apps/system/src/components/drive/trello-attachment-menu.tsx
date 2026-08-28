import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import type { DriveItem } from "@dg/drive/types";
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
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@dg/ui/components/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import {
  AlertCircleIcon,
  LoaderCircleIcon,
  PaperclipIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getListCards, getTrelloLists } from "@/server/trello";

type Attachment = {
  _id: Id<"driveTrelloAttachments">;
  trelloCardId: string;
  trelloCardName: string;
  desiredState: "attached" | "detached";
  syncStatus: "pending" | "synced" | "error";
  lastSyncError?: string;
};

type AttachmentResult =
  | { status: "synced" | "already-attached" }
  | { status: "error"; message: string };

function ActionStatus({ attachment }: { attachment: Attachment }) {
  if (attachment.syncStatus === "pending") {
    return <LoaderCircleIcon className="ml-auto animate-spin text-muted-foreground" />;
  }
  if (attachment.syncStatus === "error") {
    return <AlertCircleIcon className="ml-auto text-destructive" />;
  }
  return null;
}

function TrelloListMenu({
  list,
  attachments,
  onSelectCard,
}: {
  list: { id: string; name: string };
  attachments: Attachment[];
  onSelectCard: (card: { id: string; name: string }, attachment?: Attachment) => void;
}) {
  const [open, setOpen] = useState(false);
  const cardsQuery = useQuery({
    queryKey: ["listCards", list.id],
    queryFn: () => getListCards({ data: { listId: list.id } }),
    enabled: open,
  });
  const cards = (cardsQuery.data ?? []).filter((card) => !card.closed);
  const byCardId = new Map(
    attachments.map((attachment) => [attachment.trelloCardId, attachment]),
  );

  return (
    <DropdownMenuSub open={open} onOpenChange={setOpen}>
      <DropdownMenuSubTrigger className="max-w-72">
        <span className="truncate">{list.name}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-80 w-72 overflow-y-auto">
        {cardsQuery.isLoading && (
          <DropdownMenuItem disabled>
            <LoaderCircleIcon className="animate-spin" /> Loading cards
          </DropdownMenuItem>
        )}
        {cardsQuery.isError && (
          <DropdownMenuItem onClick={() => void cardsQuery.refetch()}>
            <RefreshCwIcon /> Retry loading cards
          </DropdownMenuItem>
        )}
        {cardsQuery.isSuccess && cards.length === 0 && (
          <DropdownMenuItem disabled>No active cards</DropdownMenuItem>
        )}
        {cards.map((card) => {
          const attachment = byCardId.get(card.id);
          return (
            <DropdownMenuCheckboxItem
              key={card.id}
              checked={attachment?.desiredState === "attached"}
              disabled={attachment?.syncStatus === "pending"}
              onClick={() => onSelectCard(card, attachment)}
              className="max-w-72"
              title={attachment?.lastSyncError}
            >
              <span className="truncate">{card.name}</span>
              {attachment && <ActionStatus attachment={attachment} />}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function TrelloAttachmentMenu({
  item,
  onDetachStart,
}: {
  item: DriveItem;
  onDetachStart: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detachRequest, setDetachRequest] = useState<Attachment | null>(null);
  const attachmentsQuery = useQuery({
    ...convexQuery(api.drive.trelloAttachments.listForItem, {
      itemId: item.id as Id<"driveItems">,
    }),
    enabled: open,
  });
  const attachments = attachmentsQuery.data;
  const listsQuery = useQuery({
    queryKey: ["trelloLists"],
    queryFn: () => getTrelloLists(),
    enabled: open,
  });
  const attach = useAction(api.drive.trelloSync.attach);
  const detach = useAction(api.drive.trelloSync.detach);
  const retry = useAction(api.drive.trelloSync.retry);
  const activeLists = (listsQuery.data ?? []).filter((list) => !list.closed);

  async function runAction(label: string, operation: () => Promise<AttachmentResult>) {
    if (busy) return;
    setBusy(true);
    const toastId = toast.loading(label);
    try {
      const result = await operation();
      if (result.status === "error") {
        toast.error(result.message, { id: toastId });
      } else if (result.status === "already-attached") {
        toast.info("This item is already attached", { id: toastId });
      } else {
        toast.success("Trello attachment updated", { id: toastId });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Trello could not be updated",
        {
          id: toastId,
        },
      );
    } finally {
      setBusy(false);
    }
  }

  function selectAttachment(attachment: Attachment) {
    if (attachment.syncStatus === "pending" || busy) return;
    if (attachment.syncStatus === "error") {
      void runAction("Retrying Trello update", () =>
        retry({ attachmentId: attachment._id }),
      );
      return;
    }
    if (attachment.desiredState === "attached") setDetachRequest(attachment);
  }

  function selectCard(card: { id: string; name: string }, attachment?: Attachment) {
    if (attachment) {
      selectAttachment(attachment);
      return;
    }
    void runAction("Attaching to Trello card", () =>
      attach({
        itemId: item.id as Id<"driveItems">,
        trelloCardId: card.id,
        trelloCardName: card.name,
      }),
    );
  }

  return (
    <>
      <DropdownMenuSub open={open} onOpenChange={setOpen}>
        <DropdownMenuSubTrigger>
          <PaperclipIcon /> Attach to Trello Card
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-h-[min(24rem,70svh)] w-72 overflow-y-auto">
          {attachmentsQuery.isLoading && (
            <DropdownMenuItem disabled>
              <LoaderCircleIcon className="animate-spin" /> Loading attachments
            </DropdownMenuItem>
          )}
          {attachments && attachments.length > 0 && (
            <>
              <DropdownMenuLabel>Attached Cards</DropdownMenuLabel>
              {attachments.map((attachment) => (
                <DropdownMenuCheckboxItem
                  key={attachment._id}
                  checked={attachment.desiredState === "attached"}
                  disabled={attachment.syncStatus === "pending" || busy}
                  onClick={() => selectAttachment(attachment)}
                  className="max-w-72"
                  title={attachment.lastSyncError}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {attachment.trelloCardName}
                    {attachment.desiredState === "detached" && " (failed removal)"}
                  </span>
                  <ActionStatus attachment={attachment} />
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          {listsQuery.isLoading && (
            <DropdownMenuItem disabled>
              <LoaderCircleIcon className="animate-spin" /> Loading lists
            </DropdownMenuItem>
          )}
          {listsQuery.isError && (
            <DropdownMenuItem onClick={() => void listsQuery.refetch()}>
              <RefreshCwIcon /> Retry loading lists
            </DropdownMenuItem>
          )}
          {listsQuery.isSuccess && activeLists.length === 0 && (
            <DropdownMenuItem disabled>No active Trello lists</DropdownMenuItem>
          )}
          {activeLists.map((list) => (
            <TrelloListMenu
              key={list.id}
              list={list}
              attachments={attachments ?? []}
              onSelectCard={selectCard}
            />
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <AlertDialog
        open={detachRequest !== null}
        onOpenChange={(nextOpen) => !nextOpen && !busy && setDetachRequest(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Detach from Trello card?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove “{item.name}” from “{detachRequest?.trelloCardName}”? The Drive item
              itself will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || !detachRequest}
              onClick={() => {
                if (!detachRequest) return;
                const attachmentId = detachRequest._id;
                setDetachRequest(null);
                onDetachStart();
                void runAction("Removing Trello attachment", () =>
                  detach({ attachmentId }),
                );
              }}
            >
              Detach
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
