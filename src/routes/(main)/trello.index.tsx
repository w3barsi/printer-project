import { Container } from "@/components/layouts/container"
import { getTrelloLists } from "@/server/trello"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/(main)/trello/")({
  component: TrelloPage,
  loader: async ({ context }) => {
    context.queryClient.ensureQueryData({
      queryKey: ["trelloLists"],
      queryFn: getTrelloLists,
    })
  },
})

function TrelloPage() {
  const { data: lists } = useSuspenseQuery({
    queryKey: ["trelloLists"],
    queryFn: getTrelloLists,
  })

  return (
    <Container>
      <h1 className="mb-6 text-3xl font-bold">Trello Board Lists</h1>
      <div className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </Container>
  )
}
