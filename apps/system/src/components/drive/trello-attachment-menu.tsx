import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import type { DriveItem } from "@dg/drive/types";
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
import {
  MenuCheckboxItem,
  MenuItem,
  MenuGroupLabel,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
} from "@dg/ui-coss/components/menu";
import { toastManager } from "@dg/ui-coss/components/toast";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import {
  AlertCircleIcon,
  LoaderCircleIcon,
  PaperclipIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useState } from "react";

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
    <MenuSub open={open} onOpenChange={setOpen}>
      <MenuSubTrigger className="max-w-72">
        <span className="truncate">{list.name}</span>
      </MenuSubTrigger>
      <MenuSubPopup className="max-h-80 w-72 overflow-y-auto">
        {cardsQuery.isLoading && (
          <MenuItem disabled>
            <LoaderCircleIcon className="animate-spin" /> Loading cards
          </MenuItem>
        )}
        {cardsQuery.isError && (
          <MenuItem onClick={() => void cardsQuery.refetch()}>
            <RefreshCwIcon /> Retry loading cards
          </MenuItem>
        )}
        {cardsQuery.isSuccess && cards.length === 0 && (
          <MenuItem disabled>No active cards</MenuItem>
        )}
        {cards.map((card) => {
          const attachment = byCardId.get(card.id);
          return (
            <MenuCheckboxItem
              key={card.id}
              checked={attachment?.desiredState === "attached"}
              disabled={attachment?.syncStatus === "pending"}
              onClick={() => onSelectCard(card, attachment)}
              className="max-w-72"
              title={attachment?.lastSyncError}
            >
              <span className="truncate">{card.name}</span>
              {attachment && <ActionStatus attachment={attachment} />}
            </MenuCheckboxItem>
          );
        })}
      </MenuSubPopup>
    </MenuSub>
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
    const toastId = toastManager.add({ title: label, type: "loading", timeout: 0 });
    try {
      const result = await operation();
      if (result.status === "error") {
        toastManager.add({ title: result.message, type: "error", id: toastId });
      } else if (result.status === "already-attached") {
        toastManager.add({
          title: "This item is already attached",
          type: "info",
          id: toastId,
        });
      } else {
        toastManager.add({
          title: "Trello attachment updated",
          type: "success",
          id: toastId,
        });
      }
    } catch (error) {
      toastManager.add({
        title: error instanceof Error ? error.message : "Trello could not be updated",
        type: "error",
        id: toastId,
      });
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
      <MenuSub open={open} onOpenChange={setOpen}>
        <MenuSubTrigger>
          <PaperclipIcon /> Attach to Trello Card
        </MenuSubTrigger>
        <MenuSubPopup className="max-h-[min(24rem,70svh)] w-72 overflow-y-auto">
          {attachmentsQuery.isLoading && (
            <MenuItem disabled>
              <LoaderCircleIcon className="animate-spin" /> Loading attachments
            </MenuItem>
          )}
          {attachments && attachments.length > 0 && (
            <>
              <MenuGroupLabel>Attached Cards</MenuGroupLabel>
              {attachments.map((attachment) => (
                <MenuCheckboxItem
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
                </MenuCheckboxItem>
              ))}
              <MenuSeparator />
            </>
          )}
          {listsQuery.isLoading && (
            <MenuItem disabled>
              <LoaderCircleIcon className="animate-spin" /> Loading lists
            </MenuItem>
          )}
          {listsQuery.isError && (
            <MenuItem onClick={() => void listsQuery.refetch()}>
              <RefreshCwIcon /> Retry loading lists
            </MenuItem>
          )}
          {listsQuery.isSuccess && activeLists.length === 0 && (
            <MenuItem disabled>No active Trello lists</MenuItem>
          )}
          {activeLists.map((list) => (
            <TrelloListMenu
              key={list.id}
              list={list}
              attachments={attachments ?? []}
              onSelectCard={selectCard}
            />
          ))}
        </MenuSubPopup>
      </MenuSub>

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
            <AlertDialogClose disabled={busy} render={<Button variant="outline" />}>
              Cancel
            </AlertDialogClose>
            <AlertDialogClose
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
              render={<Button />}
            >
              Detach
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
