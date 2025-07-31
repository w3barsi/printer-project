import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

export const createTrelloCard = internalAction({
  args: { joId: v.id("jo") },
  handler: async (ctx, args) => {
    const TRELLO_KEY = process.env.TRELLO_KEY
    const TRELLO_TOKEN = process.env.TRELLO_TOKEN
    const LIST_ID = "63d49870f3b7593a548ff9cf"

    if (!TRELLO_KEY || !TRELLO_TOKEN) {
      throw new Error("Missing Trello credentials")
    }

    const jo = await ctx.runQuery(internal.jo.getOne, { id: args.joId })

    if (!jo) {
      throw new Error("JO not found")
    }

    const cardName = `${jo.name} | JO#${jo.joNumber}`
    const url = `https://api.trello.com/1/cards`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: TRELLO_KEY,
        token: TRELLO_TOKEN,
        idList: LIST_ID,
        name: cardName,
      }),
    })

    if (!response.ok) {
      throw new Error(`Trello API error: ${response.status}`)
    }
  },
})
