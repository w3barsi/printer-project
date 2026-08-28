import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { authedQuery } from "../auth";
import { requireSpaceAccess } from "./lib";

export const MAX_ATTACHMENTS_PER_ITEM = 500;
export const MAX_ATTACHMENTS_PER_CARD = 200;

type Attachment = Doc<"driveTrelloAttachments">;

function assertActionAccess(
  item: Doc<"driveItems"> | null,
  space: Doc<"driveSpaces"> | null,
  role?: string,
) {
  if (
    !item ||
    item.deletedAt !== undefined ||
    !space ||
    (space.visibility === "admin" && role !== "admin")
  ) {
    throw new ConvexError("Item not found");
  }
}

async function cardRows(ctx: QueryCtx | MutationCtx, trelloCardId: string) {
  return await ctx.db
    .query("driveTrelloAttachments")
    .withIndex("by_trelloCardId", (q) => q.eq("trelloCardId", trelloCardId))
    .take(MAX_ATTACHMENTS_PER_CARD + 1);
}

async function requireMutationAccess(
  ctx: MutationCtx,
  authId: string,
  role: string | undefined,
  itemId: Id<"driveItems">,
) {
  const [item, actor] = await Promise.all([
    ctx.db.get("driveItems", itemId),
    ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .unique(),
  ]);
  if (!actor) throw new ConvexError("Application user not found");
  const space = item ? await ctx.db.get("driveSpaces", item.spaceId) : null;
  assertActionAccess(item, space, role);
  return actor;
}

async function snapshotFromRows(ctx: QueryCtx | MutationCtx, rows: Attachment[]) {
  const ordered = [...rows].sort((a, b) => a._creationTime - b._creationTime);
  const entries = [];
  for (const row of ordered) {
    const item = await ctx.db.get("driveItems", row.driveItemId);
    if (row.desiredState === "attached" && item && item.deletedAt === undefined) {
      entries.push({
        attachmentId: row._id,
        creationTime: row._creationTime,
        itemId: item._id,
        spaceId: item.spaceId,
        name: item.name,
        kind: item.kind,
      });
    }
  }
  return entries;
}

export const listForItem = authedQuery({
  args: { itemId: v.id("driveItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get("driveItems", args.itemId);
    if (!item || item.deletedAt !== undefined) throw new ConvexError("Item not found");
    await requireSpaceAccess(ctx, item.spaceId);
    const rows = await ctx.db
      .query("driveTrelloAttachments")
      .withIndex("by_driveItemId", (q) => q.eq("driveItemId", args.itemId))
      .order("asc")
      .take(MAX_ATTACHMENTS_PER_ITEM + 1);
    if (rows.length > MAX_ATTACHMENTS_PER_ITEM) {
      throw new ConvexError("This item has too many Trello attachments");
    }
    return rows.map((row) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      trelloCardId: row.trelloCardId,
      trelloCardName: row.trelloCardName,
      desiredState: row.desiredState,
      syncStatus: row.syncStatus,
      lastSyncError: row.lastSyncError,
      lastSyncAttemptAt: row.lastSyncAttemptAt,
    }));
  },
});

export const getCardSnapshot = internalQuery({
  args: { trelloCardId: v.string() },
  handler: async (ctx, args) => {
    const rows = await cardRows(ctx, args.trelloCardId);
    if (rows.length > MAX_ATTACHMENTS_PER_CARD) {
      throw new ConvexError("This Trello card has too many Drive attachments");
    }
    return await snapshotFromRows(ctx, rows);
  },
});

export const createAssociation = internalMutation({
  args: {
    itemId: v.id("driveItems"),
    trelloCardId: v.string(),
    trelloCardName: v.string(),
    authId: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireMutationAccess(ctx, args.authId, args.role, args.itemId);
    const existing = await ctx.db
      .query("driveTrelloAttachments")
      .withIndex("by_driveItemId_and_trelloCardId", (q) =>
        q.eq("driveItemId", args.itemId).eq("trelloCardId", args.trelloCardId),
      )
      .unique();
    if (existing) {
      if (existing.desiredState === "attached") {
        return { attachmentId: existing._id, alreadyAttached: true };
      }
      throw new ConvexError("This attachment is currently being removed");
    }
    const [itemRows, cardAssociations] = await Promise.all([
      ctx.db
        .query("driveTrelloAttachments")
        .withIndex("by_driveItemId", (q) => q.eq("driveItemId", args.itemId))
        .take(MAX_ATTACHMENTS_PER_ITEM),
      cardRows(ctx, args.trelloCardId),
    ]);
    if (itemRows.length >= MAX_ATTACHMENTS_PER_ITEM) {
      throw new ConvexError(
        "This item is already attached to the maximum number of cards",
      );
    }
    if (cardAssociations.length >= MAX_ATTACHMENTS_PER_CARD) {
      throw new ConvexError("This Trello card has too many Drive attachments");
    }
    const attachmentId = await ctx.db.insert("driveTrelloAttachments", {
      driveItemId: args.itemId,
      trelloCardId: args.trelloCardId,
      trelloCardName: args.trelloCardName,
      attachedBy: actor._id,
      desiredState: "attached",
      syncStatus: "pending",
    });
    return { attachmentId, alreadyAttached: false };
  },
});

export const requestDetach = internalMutation({
  args: {
    attachmentId: v.id("driveTrelloAttachments"),
    authId: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get("driveTrelloAttachments", args.attachmentId);
    if (!row) return null;
    const actor = await requireMutationAccess(
      ctx,
      args.authId,
      args.role,
      row.driveItemId,
    );
    await ctx.db.patch("driveTrelloAttachments", row._id, {
      desiredState: "detached",
      syncStatus: "pending",
      detachRequestedBy: actor._id,
      detachRequestedAt: Date.now(),
      lastSyncError: undefined,
    });
    return row.trelloCardId;
  },
});

export const resetForRetry = internalMutation({
  args: {
    attachmentId: v.id("driveTrelloAttachments"),
    authId: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get("driveTrelloAttachments", args.attachmentId);
    if (!row) return null;
    await requireMutationAccess(ctx, args.authId, args.role, row.driveItemId);
    await ctx.db.patch("driveTrelloAttachments", row._id, {
      syncStatus: "pending",
      lastSyncError: undefined,
      lastSyncAttemptAt: undefined,
    });
    return row.trelloCardId;
  },
});

export async function markItemAttachmentsPending(
  ctx: MutationCtx,
  itemId: Id<"driveItems">,
) {
  const rows = await ctx.db
    .query("driveTrelloAttachments")
    .withIndex("by_driveItemId", (q) => q.eq("driveItemId", itemId))
    .take(MAX_ATTACHMENTS_PER_ITEM + 1);
  if (rows.length > MAX_ATTACHMENTS_PER_ITEM) {
    throw new ConvexError("This item has too many Trello attachments");
  }
  const cardIds = [...new Set(rows.map((row) => row.trelloCardId))];
  for (const row of rows) {
    await ctx.db.patch("driveTrelloAttachments", row._id, {
      syncStatus: "pending",
      lastSyncError: undefined,
    });
  }
  for (const trelloCardId of cardIds) {
    await ctx.scheduler.runAfter(0, internal.drive.trelloSync.syncCard, { trelloCardId });
  }
  return cardIds;
}

export const completeCardSync = internalMutation({
  args: {
    trelloCardId: v.string(),
    trelloCardName: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await cardRows(ctx, args.trelloCardId);
    for (const row of rows) {
      if (row.desiredState === "detached") {
        await ctx.db.delete("driveTrelloAttachments", row._id);
      } else {
        await ctx.db.patch("driveTrelloAttachments", row._id, {
          trelloCardName: args.trelloCardName,
          syncStatus: "synced",
          lastSyncError: undefined,
          lastSyncAttemptAt: Date.now(),
        });
      }
    }
    return null;
  },
});

export const failCardSync = internalMutation({
  args: {
    trelloCardId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await cardRows(ctx, args.trelloCardId);
    for (const row of rows) {
      await ctx.db.patch("driveTrelloAttachments", row._id, {
        syncStatus: "error",
        lastSyncError: args.message.slice(0, 240),
        lastSyncAttemptAt: Date.now(),
      });
    }
    return null;
  },
});

export const cleanupDeletedItems = internalMutation({
  args: { itemIds: v.array(v.id("driveItems")), itemIndex: v.number() },
  handler: async (ctx, args): Promise<null> => {
    const itemId = args.itemIds[args.itemIndex];
    if (!itemId) return null;
    const rows = await ctx.db
      .query("driveTrelloAttachments")
      .withIndex("by_driveItemId", (q) => q.eq("driveItemId", itemId))
      .take(MAX_ATTACHMENTS_PER_ITEM);
    if (rows.length >= MAX_ATTACHMENTS_PER_ITEM) {
      const overflow = await ctx.db
        .query("driveTrelloAttachments")
        .withIndex("by_driveItemId", (q) => q.eq("driveItemId", itemId))
        .take(MAX_ATTACHMENTS_PER_ITEM + 1);
      if (overflow.length > MAX_ATTACHMENTS_PER_ITEM) {
        throw new ConvexError("This item has too many Trello attachments");
      }
    }
    const cardIds = [...new Set(rows.map((row) => row.trelloCardId))];
    for (const row of rows) {
      await ctx.db.patch("driveTrelloAttachments", row._id, {
        desiredState: "detached",
        syncStatus: "pending",
        lastSyncError: undefined,
        detachRequestedAt: Date.now(),
      });
    }
    for (const trelloCardId of cardIds) {
      await ctx.scheduler.runAfter(0, internal.drive.trelloSync.syncCard, {
        trelloCardId,
      });
    }
    const nextIndex = args.itemIndex + 1;
    if (args.itemIds[nextIndex]) {
      await ctx.scheduler.runAfter(
        0,
        internal.drive.trelloAttachments.cleanupDeletedItems,
        {
          itemIds: args.itemIds,
          itemIndex: nextIndex,
        },
      );
    }
    return null;
  },
});
