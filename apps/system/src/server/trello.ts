import { createServerFn } from "@tanstack/react-start";
import z from "zod";

import { serverEnv } from "@/env/server";
import { getToken } from "@/lib/auth-server";

const LIST_ID = "63d49870f3b7593a548ff9cf";
const BOARD_ID = "1ELaQNZb";

async function trelloFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  if (!(await getToken())) throw new Error("Unauthorized");
  const url = `https://api.trello.com/1${path}${path.includes("?") ? "&" : "?"}key=${serverEnv.TRELLO_KEY}&token=${serverEnv.TRELLO_TOKEN}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = await response.text();
    let message: string | undefined;
    try {
      const json = JSON.parse(body);
      message = typeof json === "string" ? json : (json?.message ?? json?.error);
    } catch {
      message = body || undefined;
    }
    throw new Error(
      `Trello API error: ${response.status}${message ? ` - ${message}` : ""}`,
    );
  }
  return schema.parse(await response.json());
}

const trelloListSchema = z.object({
  id: z.string(),
  name: z.string(),
  closed: z.boolean(),
  pos: z.number(),
  idBoard: z.string(),
});

const cardAttachmentSchema = z.array(
  z.object({
    id: z.string(),
    url: z.string(),
    name: z.string(),
    mimeType: z.string(),
  }),
);

export const getList = createServerFn({ method: "GET" }).handler(async () => {
  return trelloFetch(`/lists/${LIST_ID}`, trelloListSchema);
});

const trelloCardsSchema = z.array(
  z.object({
    id: z.string(),
    badges: z.object({
      attachments: z.number(),
    }),
    closed: z.boolean(),
    desc: z.string().optional(),
    due: z.string().nullable(),
    idList: z.string(),
    name: z.string(),
    pos: z.number(),
    shortUrl: z.url(),
  }),
);

const getTrelloCardValidator = z.object({ listId: z.string() });

export const getListCards = createServerFn({ method: "GET" })
  .validator(getTrelloCardValidator)
  .handler(async ({ data }) => {
    const listId = encodeURIComponent(data.listId);
    const lists = await trelloFetch(
      `/boards/${BOARD_ID}/lists`,
      z.array(trelloListSchema),
    );
    if (!lists.some((list) => list.id === data.listId)) {
      throw new Error("Trello list not found");
    }
    return trelloFetch(`/lists/${listId}/cards`, trelloCardsSchema);
  });

export const getTrelloLists = createServerFn({ method: "GET" }).handler(async () => {
  return trelloFetch(`/boards/${BOARD_ID}/lists`, z.array(trelloListSchema));
});

export const getCardAttachmentsServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    return trelloFetch(`/cards/${data.id}/attachments`, cardAttachmentSchema);
  });

export const downloadCardAttachmentsServerFn = createServerFn({ method: "POST" })
  .validator(z.array(z.object({ url: z.string(), name: z.string() })))
  .handler(async ({ data }) => {
    if (!(await getToken())) throw new Error("Unauthorized");
    const fetchImage = async ({ url, name }: { url: string; name: string }) => {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `OAuth oauth_consumer_key="${serverEnv.TRELLO_KEY}", oauth_token="${serverEnv.TRELLO_TOKEN}"`,
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString("base64");
        const contentType = response.headers.get("content-type") ?? "image/jpeg";

        return { base64Image, contentType, name };
      } catch (error) {
        console.error(`Error fetching image ${url}:`, error);
        return null;
      }
    };

    const results = await Promise.all(data.map(fetchImage));
    return results.filter(
      (result): result is NonNullable<typeof result> => result !== null,
    );
  });
