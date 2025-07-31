import { Container } from "@/components/layouts/container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { getListCards } from "@/server/trello"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { RefreshCwIcon } from "lucide-react"

export const Route = createFileRoute("/(main)/trello/$listId")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    context.queryClient.ensureQueryData({
      queryKey: ["listCards", params.listId],
      queryFn: () => getListCards({ data: { listId: params.listId } }),
    })
  },
})

function RouteComponent() {
  return (
    <Container className="flex flex-col">
      <CardList />
    </Container>
  )
}

function CardList() {
  const { listId } = Route.useParams()
  const {
    data: cards,
    refetch,
    isRefetching,
  } = useSuspenseQuery({
    staleTime: 10000,
    queryKey: ["listCards", listId],
    queryFn: () => getListCards({ data: { listId } }),
  })

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">List Cards</h1>

        <Button
          variant="ghost"
          size="icon"
          onClick={async () => await refetch()}
          disabled={isRefetching}
        >
          <RefreshCwIcon className={isRefetching ? "animate-spin" : ""} />
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards?.map((card) => (
          <Card key={card.id} className="pb-0">
            <CardContent>{card.name}</CardContent>
            <CardFooter className="p-0">
              <Button className="w-full rounded-t-none">Download Attachments</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  )
}
