import { Badge } from "@dg/ui-coss/components/badge";
import { Button } from "@dg/ui-coss/components/button";
import {
  Card,
  CardAction,
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
import { Skeleton } from "@dg/ui-coss/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon, ListIcon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";

import { Container } from "@/components/layouts/container";
import { getTrelloLists } from "@/server/trello";

export const Route = createFileRoute("/_authenticated/trello/")({
  component: TrelloPage,
  loader: () => ({
    crumb: [{ value: "Trello", href: "/trello/", type: "static" }],
  }),
  head: () => ({
    meta: [
      {
        title: `Trello | DG`,
      },
    ],
  }),
});

function TrelloPage() {
  return (
    <Container className="flex flex-col gap-4 md:gap-6">
      <ListView />
    </Container>
  );
}

function ListView() {
  const {
    data: lists,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["trelloLists"],
    queryFn: getTrelloLists,
  });

  const sortedLists = lists
    ? [...lists].sort((a, b) => Number(a.closed) - Number(b.closed) || a.pos - b.pos)
    : [];

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Board lists</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCwIcon className={isFetching ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </header>

      {isLoading ? <ListViewSkeleton /> : null}

      {!isLoading && isError ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TriangleAlertIcon className="text-destructive" />
                </EmptyMedia>
                <EmptyTitle>Couldn&apos;t load the board</EmptyTitle>
                <EmptyDescription>
                  {error?.message || "Trello didn't respond. Try again in a moment."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => void refetch()}>
                  <RefreshCwIcon />
                  Try again
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isError && sortedLists.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListIcon />
                </EmptyMedia>
                <EmptyTitle>No lists on this board</EmptyTitle>
                <EmptyDescription>
                  Add a list in Trello, then refresh to see it here.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => void refetch()}>
                  <RefreshCwIcon />
                  Refresh
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isError && sortedLists.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortedLists.map((list) => {
            const cardCount = list.cards?.length ?? 0;
            return (
              <Card
                key={list.id}
                render={
                  <Link
                    to="/trello/$listId"
                    params={{ listId: list.id }}
                    aria-label={`Open ${list.name}, ${cardCount.toLocaleString()} open ${cardCount === 1 ? "card" : "cards"}`}
                  />
                }
                className="group gap-0 py-0 transition-colors outline-none hover:border-ring/40 hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <CardHeader className="gap-1 py-5">
                  {list.closed ? (
                    <CardAction>
                      <Badge variant="secondary">Archived</Badge>
                    </CardAction>
                  ) : null}
                  <CardTitle
                    render={<h2 />}
                    title={list.name}
                    className="line-clamp-2 min-w-0 text-base leading-snug"
                  >
                    {list.name}
                  </CardTitle>
                  <CardDescription className="tabular-nums">
                    {cardCount === 0
                      ? "No open cards"
                      : `${cardCount.toLocaleString()} open ${cardCount === 1 ? "card" : "cards"}`}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto p-4 pt-0">
                  <span className="flex w-full items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm font-medium transition-colors group-hover:border-ring/40 group-hover:bg-accent/60">
                    View cards
                    <span className="flex size-6 items-center justify-center rounded-full bg-background text-muted-foreground shadow-xs/5 ring-1 ring-border/60 transition-colors group-hover:text-foreground group-hover:ring-ring/40">
                      <ArrowRightIcon className="size-3.5" />
                    </span>
                  </span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function ListViewSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="gap-0 py-0">
          <CardHeader className="gap-3 py-5">
            <Skeleton className="h-5 w-2/3 max-w-full" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardFooter className="mt-auto p-4 pt-0">
            <div className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="size-6 rounded-full" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
