import { Badge } from "@dg/ui-coss/components/badge";
import { Button } from "@dg/ui-coss/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@dg/ui-coss/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dg/ui-coss/components/empty";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@dg/ui-coss/components/menu";
import { Skeleton } from "@dg/ui-coss/components/skeleton";
import { toastManager } from "@dg/ui-coss/components/toast";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, isPast, isToday } from "date-fns";
import fileSaver from "file-saver";
import JSZip from "jszip";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  DownloadIcon,
  ExternalLinkIcon,
  InboxIcon,
  MoveRightIcon,
  PaperclipIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Suspense, useState } from "react";

import { DefaultCatchBoundary } from "@/components/default-catch-boundary";
import { Container } from "@/components/layouts/container";
import {
  downloadCardAttachmentsServerFn,
  getCardAttachmentsServerFn,
  getListCards,
  getTrelloLists,
  moveCardToList,
} from "@/server/trello";

type ImagesFromCard = {
  src: string;
  contentType: string;
  name: string;
};

export const Route = createFileRoute("/_authenticated/trello/$listId")({
  component: RouteComponent,
  errorComponent: DefaultCatchBoundary,
  loader: () => {
    return {
      crumb: [{ value: "Trello", href: "/trello/", type: "static" }],
    };
  },
  head: () => ({
    meta: [
      {
        title: `Trello | DG`,
      },
    ],
  }),
});

function RouteComponent() {
  return (
    <Container className="flex flex-col gap-4 md:gap-6">
      <Suspense fallback={<CardListSkeleton />}>
        <CardList />
      </Suspense>
    </Container>
  );
}

function CardListSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-56 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="flex flex-col">
            <CardHeader className="gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-2 pt-0.5">
                <Skeleton className="h-5 w-16 rounded-sm" />
                <Skeleton className="h-5 w-10 rounded-sm" />
              </div>
            </CardHeader>
            <CardFooter className="mt-auto gap-2">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CardList() {
  const { listId } = Route.useParams();
  const queryClient = useQueryClient();
  const {
    data: cards,
    refetch,
    isRefetching,
  } = useSuspenseQuery({
    queryKey: ["listCards", listId],
    queryFn: () => getListCards({ data: { listId } }),
  });
  const { data: lists } = useSuspenseQuery({
    queryKey: ["trelloLists"],
    queryFn: () => getTrelloLists(),
  });
  const [downloadingCardId, setDownloadingCardId] = useState<string | null>(null);

  const currentList = lists.find((list) => list.id === listId);
  const otherLists = lists
    .filter((list) => list.id !== listId && !list.closed)
    .sort((a, b) => a.pos - b.pos);
  const sortedCards = [...cards].sort((a, b) => a.pos - b.pos);
  const withAttachments = cards.filter((card) => card.badges.attachments > 0).length;

  const getCardAttachments = useMutation({
    mutationFn: getCardAttachmentsServerFn,
  });

  const downloadCardAttachments = useMutation({
    mutationFn: downloadCardAttachmentsServerFn,
  });

  const moveCard = useMutation({
    mutationFn: moveCardToList,
    onSuccess: async (_card, variables) => {
      const targetList = otherLists.find((list) => list.id === variables.data.listId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["listCards"] }),
        queryClient.invalidateQueries({ queryKey: ["trelloLists"] }),
      ]);
      toastManager.add({
        title: targetList ? `Moved to ${targetList.name}` : "Card moved",
        type: "success",
      });
    },
    onError: (error) => {
      toastManager.add({
        title: "Failed to move card",
        description: error.message,
        type: "error",
      });
    },
  });

  const getAttachments = async (cardId: string, cardName: string) => {
    const data = await getCardAttachments.mutateAsync({ data: { id: cardId } });
    const i = data.map((d) => ({ url: d.url, name: d.name }));
    const results = await downloadCardAttachments.mutateAsync({ data: i });
    const images: ImagesFromCard[] = results.map((result) => ({
      src: `data:${result.contentType};base64,${result.base64Image}`,
      contentType: result.contentType,
      name: result.name,
    }));

    const zip = new JSZip();

    await Promise.all(
      images.map(async (image) => {
        try {
          const res = await fetch(image.src);
          if (!res.ok) throw new Error(`Attachment download failed: ${res.status}`);
          const blob = await res.blob();
          zip.file(image.name, blob);
        } catch (e) {
          console.error(e);
        }
      }),
    );

    const content = await zip.generateAsync({ type: "blob" });
    const sanitizedName = cardName.replace(/[\\/:*?"<>|]/g, "-").trim() || "attachments";
    fileSaver.saveAs(content, `${sanitizedName}.zip`);
  };

  const handleDownload = async (cardId: string, cardName: string) => {
    const toastId = toastManager.add({
      title: "Downloading attachments...",
      type: "loading",
      timeout: 0,
    });
    setDownloadingCardId(cardId);
    try {
      await getAttachments(cardId, cardName);
      toastManager.add({
        title: "Attachments downloaded successfully!",
        type: "success",
        id: toastId,
      });
    } catch {
      toastManager.add({
        title: "Error downloading attachments!",
        type: "error",
        id: toastId,
      });
    } finally {
      setDownloadingCardId(null);
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link
            to="/trello"
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            All lists
          </Link>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate text-3xl font-bold tracking-tight">
              {currentList?.name ?? "List cards"}
            </h1>
            {currentList?.closed ? <Badge variant="secondary">Archived</Badge> : null}
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span className="tabular-nums">
              {cards.length.toLocaleString()} {cards.length === 1 ? "card" : "cards"}
            </span>
            {withAttachments > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {withAttachments.toLocaleString()} with attachments
                </span>
              </>
            ) : null}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isRefetching}
        >
          <RefreshCwIcon className={isRefetching ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </header>

      {sortedCards.length ? (
        <div className="grid auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sortedCards.map((card) => {
            const attachmentCount = card.badges.attachments;
            const hasMeta = Boolean(card.due) || attachmentCount > 0 || card.closed;
            return (
              <Card key={card.id} className="flex flex-col">
                <CardHeader className="gap-2">
                  <CardTitle render={<h2 />} className="text-base leading-snug">
                    <Link
                      to={card.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={card.name}
                      className="group/link inline-flex items-start gap-1.5 underline-offset-4 hover:underline"
                    >
                      <span className="line-clamp-3">{card.name}</span>
                      <ExternalLinkIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/link:text-foreground" />
                    </Link>
                  </CardTitle>
                  {card.desc ? (
                    <CardDescription className="line-clamp-2 whitespace-pre-line">
                      {card.desc}
                    </CardDescription>
                  ) : null}
                  {hasMeta ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <DueBadge due={card.due} complete={card.dueComplete} />
                      {card.closed ? <Badge variant="secondary">Archived</Badge> : null}
                      {attachmentCount > 0 ? (
                        <Badge
                          variant="outline"
                          role="img"
                          aria-label={`${attachmentCount} ${attachmentCount === 1 ? "attachment" : "attachments"}`}
                        >
                          <PaperclipIcon aria-hidden="true" />
                          <span aria-hidden="true">{attachmentCount}</span>
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </CardHeader>
                <CardFooter className="mt-auto gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={attachmentCount === 0}
                    loading={downloadingCardId === card.id}
                    onClick={() => void handleDownload(card.id, card.name)}
                  >
                    <DownloadIcon />
                    {attachmentCount === 0 ? "No attachments" : "Download"}
                  </Button>
                  <Menu>
                    <MenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={otherLists.length === 0 || moveCard.isPending}
                          loading={
                            moveCard.isPending &&
                            moveCard.variables?.data.cardId === card.id
                          }
                        />
                      }
                    >
                      <MoveRightIcon />
                      Move
                    </MenuTrigger>
                    <MenuPopup align="end" className="w-52">
                      <MenuGroup>
                        <MenuGroupLabel>Move to list</MenuGroupLabel>
                        {otherLists.length ? (
                          otherLists.map((list) => (
                            <MenuItem
                              key={list.id}
                              disabled={moveCard.isPending}
                              onClick={() =>
                                moveCard.mutate({
                                  data: { cardId: card.id, listId: list.id },
                                })
                              }
                            >
                              {list.name}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>No other lists</MenuItem>
                        )}
                      </MenuGroup>
                    </MenuPopup>
                  </Menu>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>No cards on this list</EmptyTitle>
                <EmptyDescription>
                  Cards added to this Trello list will show up here.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() => void refetch()}
                  disabled={isRefetching}
                >
                  <RefreshCwIcon />
                  Refresh
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function DueBadge({ due, complete }: { due: string | null; complete?: boolean }) {
  if (!due) return null;
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return null;

  const overdue = !complete && isPast(date) && !isToday(date);
  return (
    <Badge
      variant={
        complete ? "success" : overdue ? "error" : isToday(date) ? "warning" : "outline"
      }
    >
      <CalendarClockIcon />
      {complete ? "Done" : "Due"} {format(date, "MMM d")}
    </Badge>
  );
}
