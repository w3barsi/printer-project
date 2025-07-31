import { createServerFn } from "@tanstack/react-start"
import z from "zod"

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

export const getList = createServerFn({ method: "GET" }).handler(async () => {
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

const trelloCardsSchema = z.array(
  z.object({
    id: z.string(),
    closed: z.boolean(),
    desc: z.string().optional(),
    due: z.string().nullable(),
    idList: z.string(),
    name: z.string(),
    pos: z.number(),
    url: z.string(),
  }),
)

const getTrelloCardValidator = z.object({ listId: z.string() })

export const getListCards = createServerFn({ method: "GET" })
  .validator((data: unknown) => getTrelloCardValidator.parse(data))
  .handler(async (ctx) => {
    const TRELLO_KEY = process.env.TRELLO_KEY
    const TRELLO_TOKEN = process.env.TRELLO_TOKEN

    if (!TRELLO_KEY || !TRELLO_TOKEN) {
      throw new Error("Missing Trello credentials")
    }

    const url = `https://api.trello.com/1/lists/${ctx.data.listId}/cards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`

    const response = await fetch(url)

    const data = await response.json()

    const { data: parsedData, success, error } = trelloCardsSchema.safeParse(data)

    if (success) {
      return parsedData
    } else {
      throw new Error(error.message)
    }
  })

export const getTrelloLists = createServerFn({ method: "GET" }).handler(async () => {
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
