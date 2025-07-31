import { Container } from "@/components/layouts/container"
import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const trelloListsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    closed: z.boolean(),
    pos: z.number(),
    idBoard: z.string(),
  }),
)

const trelloListSchema = z.object({
  id: z.string(),
  name: z.string(),
  closed: z.boolean(),
  pos: z.number(),
  idBoard: z.string(),
})

const getTrelloLists = createServerFn({ method: "GET" }).handler(async () => {
  const TRELLO_KEY = process.env.TRELLO_KEY
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN
  const BOARD_ID = "1ELaQNZb"

  if (!TRELLO_KEY || !TRELLO_TOKEN) {
    throw new Error("Missing Trello credentials")
  }

  const url = `https://api.trello.com/1/boards/${BOARD_ID}/lists?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Trello API error: ${response.status}`)
  }

  const data = await response.json()
  return trelloListsSchema.parse(data)
})

const getList = createServerFn({ method: "GET" }).handler(async () => {
  const TRELLO_KEY = process.env.TRELLO_KEY
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN
  const LIST_ID = "63d49870f3b7593a548ff9cf"

  if (!TRELLO_KEY || !TRELLO_TOKEN) {
    throw new Error("Missing Trello credentials")
  }

  const url = `https://api.trello.com/1/lists/${LIST_ID}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Trello API error: ${response.status}`)
  }

  const data = await response.json()
  return trelloListSchema.parse(data)
})

export const Route = createFileRoute("/(main)/trello")({
  component: TrelloPage,
  loader: async () => {
    return {
      lists: await getTrelloLists(),
      list: await getList(),
    }
  },
})

function TrelloPage() {
  const { lists, list: firstList } = Route.useLoaderData()

  return (
    <Container>
      <h1 className="mb-6 text-3xl font-bold">Trello Board Lists</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lists.map((list: { id: string; name: string; closed: boolean; pos: number }) => (
          <div key={list.id} className="bg-card rounded-lg border p-4">
            <h3 className="mb-2 text-lg font-semibold">{list.name}</h3>
            <div className="text-muted-foreground space-y-1 text-sm">
              <p>ID: {list.id}</p>
              <p>Position: {list.pos}</p>
              <p>Status: {list.closed ? "Closed" : "Open"}</p>
            </div>
          </div>
        ))}
      </div>
      <div>
        <div key={firstList.id} className="bg-card rounded-lg border p-4">
          <h3 className="mb-2 text-lg font-semibold">{firstList.name}</h3>
          <div className="text-muted-foreground space-y-1 text-sm">
            <p>ID: {firstList.id}</p>
            <p>Position: {firstList.pos}</p>
            <p>Status: {firstList.closed ? "Closed" : "Open"}</p>
          </div>
        </div>
      </div>
    </Container>
  )
}
