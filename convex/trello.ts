import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { authedQuery } from "./auth";

export const createTrelloCard = internalAction({
  args: { joId: v.id("jo") },
  handler: async (ctx, args) => {
    const TRELLO_KEY = process.env.TRELLO_KEY;
    const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
    const LIST_ID = "63d49870f3b7593a548ff9cf";

    if (!TRELLO_KEY || !TRELLO_TOKEN) {
      throw new Error("Missing Trello credentials");
    }

    const jo = await ctx.runQuery(internal.jo.getOne, { id: args.joId });

    if (!jo) {
      throw new Error("JO not found");
    }

    const cardName = `${jo.name} | JO#${jo.joNumber}`;
    const url = `https://api.trello.com/1/cards`;

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
    });

    const card = await response.json();

    if (card.id) {
      await ctx.runMutation(internal.trello.saveTrelloidToJo, {
        joId: args.joId,
        trelloId: card.id,
      });
    }

    if (!response.ok) {
      throw new Error(`Trello API error: ${response.status}`);
    }
  },
});

export const archiveTrelloCard = internalAction({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    const TRELLO_KEY = process.env.TRELLO_KEY;
    const TRELLO_TOKEN = process.env.TRELLO_TOKEN;

    if (!TRELLO_KEY || !TRELLO_TOKEN) {
      throw new Error("Missing Trello credentials");
    }

    const url = `https://api.trello.com/1/cards/${args.cardId}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: TRELLO_KEY,
        token: TRELLO_TOKEN,
        closed: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Trello API error: ${response.status}`);
    }
  },
});

export const saveTrelloidToJo = internalMutation({
  args: { joId: v.id("jo"), trelloId: v.string() },
  handler: async (ctx, args) => {
    const { joId, trelloId } = args;
    ctx.db.patch(joId, { trelloId: trelloId });
  },
});

export const getJosWithTrelloId = authedQuery({
  args: {},
  handler: async (ctx) => {
    const joWithTrelloId = await ctx.db
      .query("jo")
      .withIndex("by_trelloId", (q) => q.gt("trelloId", undefined))
      .collect();

    return joWithTrelloId;
  },
});
