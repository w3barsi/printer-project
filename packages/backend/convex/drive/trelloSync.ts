import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, env, internalAction, type ActionCtx } from "../_generated/server";
import { authComponent } from "../auth";

export const DRIVE_ITEMS_START = "<!-- drive-items-start -->";
export const DRIVE_ITEMS_END = "<!-- drive-items-end -->";
export const TRELLO_DESCRIPTION_LIMIT = 16_384;

type ProjectionEntry = {
  attachmentId: Id<"driveTrelloAttachments">;
  creationTime: number;
  itemId: Id<"driveItems">;
  spaceId: Id<"driveSpaces">;
  name: string;
  kind: "file" | "folder";
};

type SyncResult = { status: "synced" } | { status: "error"; message: string };

class TrelloError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type TrelloCard = {
  id: string;
  name: string;
  desc: string;
};

function trelloCredentials() {
  if (!env.TRELLO_KEY || !env.TRELLO_TOKEN) {
    throw new TrelloError("Trello integration is not configured");
  }
  return { key: env.TRELLO_KEY, token: env.TRELLO_TOKEN };
}

async function trelloFetch(path: string, init?: RequestInit) {
  const credentials = trelloCredentials();
  const url = new URL(`https://api.trello.com/1${path}`);
  url.searchParams.set("key", credentials.key);
  url.searchParams.set("token", credentials.token);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", ...init?.headers },
      ...init,
    });
  } catch {
    throw new TrelloError("Trello could not be reached");
  }
  if (!response.ok) {
    if (response.status === 404) throw new TrelloError("Trello card not found");
    if (response.status === 401 || response.status === 403) {
      throw new TrelloError("Trello authorization failed");
    }
    if (response.status === 429) throw new TrelloError("Trello rate limit reached");
    throw new TrelloError(
      response.status >= 500
        ? "Trello is temporarily unavailable"
        : "Trello rejected the update",
    );
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new TrelloError("Trello returned an invalid response");
  }
}

function parseCard(value: unknown): TrelloCard {
  if (!value || typeof value !== "object")
    throw new TrelloError("Trello returned an invalid card");
  const card = value as Record<string, unknown>;
  if (
    typeof card.id !== "string" ||
    typeof card.name !== "string" ||
    typeof card.desc !== "string"
  ) {
    throw new TrelloError("Trello returned an invalid card");
  }
  return card as TrelloCard;
}

async function getTrelloCard(cardId: string) {
  return parseCard(
    await trelloFetch(`/cards/${encodeURIComponent(cardId)}?fields=id,name,desc`),
  );
}

async function updateTrelloDescription(cardId: string, description: string) {
  const body = new URLSearchParams({ desc: description });
  parseCard(
    await trelloFetch(`/cards/${encodeURIComponent(cardId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }),
  );
}

function appOrigin() {
  if (!env.SERVER_URL) return "http://localhost:3001";
  let url: URL;
  try {
    url = new URL(env.SERVER_URL);
  } catch {
    throw new TrelloError("Application URL is invalid");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname.endsWith(".convex.cloud") ||
    url.hostname.endsWith(".convex.site")
  ) {
    throw new TrelloError("Application URL must be the production authenticated origin");
  }
  return url.origin.replace(/\/$/, "");
}

function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_{}\[\]()<>#+.!|~-])/g, "\\$1");
}

function renderBlock(entries: ProjectionEntry[]) {
  const origin = appOrigin();
  const lines = [...entries]
    .sort((a, b) => a.creationTime - b.creationTime)
    .map((entry) => {
      const url =
        entry.kind === "file"
          ? `${origin}/newdrive/file/${entry.itemId}`
          : `${origin}/newdrive/${entry.spaceId}/${entry.itemId}`;
      const icon = entry.kind === "file" ? "📄" : "📁";
      return `[${icon} *${escapeMarkdown(entry.name)}*](${url})`;
    });
  return `${DRIVE_ITEMS_START}\n${lines.join("\n")}\n${DRIVE_ITEMS_END}`;
}

function appendBlock(description: string, block: string) {
  if (description.length === 0 || description.trim().length === 0) return block;
  if (description.endsWith("\n\n")) return `${description}${block}`;
  if (description.endsWith("\n")) return `${description}\n${block}`;
  return `${description}\n\n${block}`;
}

export function projectDescription(description: string, entries: ProjectionEntry[]) {
  const escapedStart = DRIVE_ITEMS_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = DRIVE_ITEMS_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const completePattern = new RegExp(
    `^[ \\t]*${escapedStart}[ \\t]*\\r?\\n[\\s\\S]*?^[ \\t]*${escapedEnd}[ \\t]*$`,
    "gm",
  );
  const matches = [...description.matchAll(completePattern)];
  const markerCount = (
    description.match(new RegExp(`${escapedStart}|${escapedEnd}`, "g")) ?? []
  ).length;
  const markerLinePattern = new RegExp(
    `^[ \\t]*(?:${escapedStart}|${escapedEnd})[ \\t]*(?:\\r?\\n|$)`,
    "gm",
  );
  let projected: string;
  if (entries.length === 0) {
    projected = description.replace(completePattern, "").replace(markerLinePattern, "");
  } else {
    const block = renderBlock(entries);
    if (matches.length === 1 && markerCount === 2) {
      projected = description.replace(completePattern, block);
    } else {
      const preserved = description
        .replace(completePattern, "")
        .replace(markerLinePattern, "");
      projected = appendBlock(preserved, block);
    }
  }
  if (projected.length > TRELLO_DESCRIPTION_LIMIT) {
    throw new TrelloError(
      "The Trello description would exceed its 16,384-character limit",
    );
  }
  return projected;
}

function userSafeMessage(error: unknown) {
  return error instanceof TrelloError ? error.message : "Trello synchronization failed";
}

async function synchronizeCard(
  ctx: ActionCtx,
  trelloCardId: string,
): Promise<SyncResult> {
  const entries: ProjectionEntry[] = await ctx.runQuery(
    internal.drive.trelloAttachments.getCardSnapshot,
    {
      trelloCardId,
    },
  );
  try {
    const card = await getTrelloCard(trelloCardId);
    const description = projectDescription(card.desc, entries);
    await updateTrelloDescription(trelloCardId, description);
    await ctx.runMutation(internal.drive.trelloAttachments.completeCardSync, {
      trelloCardId,
      trelloCardName: card.name,
    });
    return { status: "synced" };
  } catch (error) {
    const message = userSafeMessage(error);
    await ctx.runMutation(internal.drive.trelloAttachments.failCardSync, {
      trelloCardId,
      message,
    });
    return { status: "error", message };
  }
}

async function actionIdentity(ctx: ActionCtx) {
  const authUser = await authComponent.getAuthUser(ctx);
  return {
    authId: authUser._id,
    ...(typeof authUser.role === "string" ? { role: authUser.role } : {}),
  };
}

export const attach = action({
  args: {
    itemId: v.id("driveItems"),
    trelloCardId: v.string(),
    trelloCardName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await actionIdentity(ctx);
    const created = await ctx.runMutation(
      internal.drive.trelloAttachments.createAssociation,
      {
        itemId: args.itemId,
        trelloCardId: args.trelloCardId,
        trelloCardName: args.trelloCardName,
        ...identity,
      },
    );
    if (created.alreadyAttached) return { status: "already-attached" as const };
    return await synchronizeCard(ctx, args.trelloCardId);
  },
});

export const detach = action({
  args: { attachmentId: v.id("driveTrelloAttachments") },
  handler: async (ctx, args): Promise<SyncResult> => {
    const identity = await actionIdentity(ctx);
    const cardId: string | null = await ctx.runMutation(
      internal.drive.trelloAttachments.requestDetach,
      {
        attachmentId: args.attachmentId,
        ...identity,
      },
    );
    return cardId ? await synchronizeCard(ctx, cardId) : { status: "synced" as const };
  },
});

export const retry = action({
  args: { attachmentId: v.id("driveTrelloAttachments") },
  handler: async (ctx, args): Promise<SyncResult> => {
    const identity = await actionIdentity(ctx);
    const cardId: string | null = await ctx.runMutation(
      internal.drive.trelloAttachments.resetForRetry,
      {
        ...args,
        ...identity,
      },
    );
    return cardId ? await synchronizeCard(ctx, cardId) : { status: "synced" as const };
  },
});

export const syncCard = internalAction({
  args: { trelloCardId: v.string() },
  handler: async (ctx, args): Promise<SyncResult> => {
    return await synchronizeCard(ctx, args.trelloCardId);
  },
});
