import { Container } from "@/components/layouts/container";
import { SuspenseAuthenticated } from "@/components/suspense-authenticated";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrelloLists } from "@/server/trello";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/(main)/trello/")({
  component: TrelloPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["trelloLists"],
      queryFn: getTrelloLists,
    });
  },
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
    <Container>
      <h1 className="mb-6 text-3xl font-bold">Trello Board Lists</h1>
      <div className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SuspenseAuthenticated fallback={<ListViewSkeleton />}>
          <ListView />
        </SuspenseAuthenticated>
      </div>
    </Container>
  );
}
function ListViewSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-card flex h-full w-full flex-col rounded-lg border p-4"
        >
          <Skeleton className="mb-2 h-6 w-3/4" />
          <div className="text-muted-foreground mt-auto space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </>
  );
}

function ListView() {
  const { data: lists } = useSuspenseQuery({
    queryKey: ["trelloLists"],
    queryFn: getTrelloLists,
  });
  return (
    <>
      {lists.map((list: { id: string; name: string; closed: boolean; pos: number }) => (
        <Link
          key={list.id}
          to="/trello/$listId"
          params={{ listId: list.id }}
          className="flex"
        >
          <div
            key={list.id}
            className="bg-card flex h-full w-full flex-col rounded-lg border p-4"
          >
            <h3 className="mb-2 text-lg font-semibold">{list.name}</h3>
            <div className="text-muted-foreground mt-auto space-y-1 text-sm">
              <p>ID: {list.id}</p>
              <p>Position: {list.pos}</p>
              <p>Status: {list.closed ? "Closed" : "Open"}</p>
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}
