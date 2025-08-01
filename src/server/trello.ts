import { env } from "@/env/server"
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

const cardAttachmentSchema = z.array(
  z.object({
    id: z.string(),
    url: z.string(),
    name: z.string(),
    mimeType: z.string(),
  }),
)

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
  const BOARD_ID = "1ELaQNZb"

  const url = `https://api.trello.com/1/boards/${BOARD_ID}/lists?key=${env.TRELLO_KEY}&token=${env.TRELLO_TOKEN}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Trello API error: ${response.status}`)
  }

  const data = await response.json()
  return trelloListsSchema.parse(data)
})

export const getCardAttachmentsServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const res = await fetch(
      `https://api.trello.com/1/cards/${data.id}/attachments?key=${env.TRELLO_KEY}&token=${env.TRELLO_TOKEN}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    )
    const atts = cardAttachmentSchema.parse(await res.json())
    return atts
  })

export const downloadCardAttachmentsServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.array(z.object({ url: z.string(), name: z.string() })).parse(data),
  )
  .handler(async ({ data }) => {
    const fetchImage = async ({ url, name }: { url: string; name: string }) => {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `OAuth oauth_consumer_key="${env.TRELLO_KEY}", oauth_token="${env.TRELLO_TOKEN}"`,
          },
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const base64Image = Buffer.from(arrayBuffer).toString("base64")
        const contentType = response.headers.get("content-type") ?? "image/jpeg"

        return { base64Image, contentType, name }
      } catch (error) {
        console.error(`Error fetching image ${url}:`, error)
        return null
      }
    }

    const results = await Promise.all(data.map(fetchImage))
    return results.filter(
      (result): result is NonNullable<typeof result> => result !== null,
    )
  })
