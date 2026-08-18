import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import { authedMutation, authedQuery, requireLocalUser } from "../auth";
import { r2 } from "../r2";
import {
  assertItemName,
  normalizeName,
  requireParentFolder,
  requireSpaceAccess,
} from "./lib";

export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;
export const MAX_DELETE_ITEMS = 500;
export const UPLOAD_TICKET_TTL = 15 * 60 * 1000;

const parentIdValidator = v.optional(v.id("newDriveItems"));

type UploadTicketResult = {
  _id: Id<"newDriveUploadTickets">;
  key: string;
  spaceId: Id<"newDriveSpaces">;
  parentId?: Id<"newDriveItems">;
  shareRootId?: Id<"newDriveItems">;
  uploadedBy: Id<"users"> | "guest";
  name: string;
  nameKey: string;
  declaredContentType: string;
  declaredSize: number;
  expiresAt: number;
};

export const listItems = authedQuery({
  args: {
    spaceId: v.id("newDriveSpaces"),
    parentId: parentIdValidator,
  },
  handler: async (ctx, args) => {
    await requireSpaceAccess(ctx, args.spaceId);
    await requireParentFolder(ctx, args.spaceId, args.parentId);

    const items = await ctx.db
      .query("newDriveItems")
      .withIndex("by_spaceId_and_parentId_and_deletedAt_and_kindSort_and_nameKey", (q) =>
        q
          .eq("spaceId", args.spaceId)
          .eq("parentId", args.parentId)
          .eq("deletedAt", undefined),
      )
      .take(500);
    const userIds = [
      ...new Set(
        items
          .map((item) => item.createdBy)
          .filter((id): id is Id<"users"> => id !== "guest"),
      ),
    ];
    const users = await Promise.all(userIds.map((id) => ctx.db.get("users", id)));
    const userNames = new Map(
      users.filter((user) => user !== null).map((user) => [user._id, user.name]),
    );

    return items.map((item) => {
      const common = {
        _id: item._id,
        name: item.name,
        parentId: item.parentId,
        createdBy: item.createdBy,
        ownerName:
          item.createdBy === "guest"
            ? "Guest"
            : (userNames.get(item.createdBy) ?? "User"),
        updatedAt: item.updatedAt,
      };
      return item.kind === "file"
        ? { ...common, kind: item.kind, publicAccess: item.publicAccess, r2: item.r2 }
        : { ...common, kind: item.kind, publicAccess: item.publicAccess };
    });
  },
});

export const getFolder = authedQuery({
  args: {
    spaceId: v.id("newDriveSpaces"),
    folderId: v.id("newDriveItems"),
  },
  handler: async (ctx, args) => {
    await requireSpaceAccess(ctx, args.spaceId);
    const folder = await ctx.db.get("newDriveItems", args.folderId);
    if (
      !folder ||
      folder.spaceId !== args.spaceId ||
      folder.kind !== "folder" ||
      folder.deletedAt !== undefined
    ) {
      return null;
    }
    return {
      _id: folder._id,
      name: folder.name,
      parentId: folder.parentId,
      updatedAt: folder.updatedAt,
    };
  },
});

export const getFilePreview = authedQuery({
  args: { itemId: v.id("newDriveItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get("newDriveItems", args.itemId);
    if (!item || item.kind !== "file" || item.deletedAt !== undefined) return null;

    const space = await requireSpaceAccess(ctx, item.spaceId);
    const owner =
      item.createdBy === "guest" ? null : await ctx.db.get("users", item.createdBy);
    const url = await r2.getUrl(item.r2.key, { expiresIn: 15 * 60 });
    if (!url) return null;

    return {
      _id: item._id,
      name: item.name,
      parentId: item.parentId,
      spaceId: item.spaceId,
      spaceName: space.name,
      ownerName: item.createdBy === "guest" ? "Guest" : (owner?.name ?? "User"),
      updatedAt: item.updatedAt,
      publicAccess: item.publicAccess,
      contentType: item.r2.contentType,
      size: item.r2.size,
      url,
    };
  },
});

export const createFolder = authedMutation({
  args: {
    spaceId: v.id("newDriveSpaces"),
    parentId: parentIdValidator,
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSpaceAccess(ctx, args.spaceId);
    await requireParentFolder(ctx, args.spaceId, args.parentId);
    const user = await requireLocalUser(ctx);
    const name = assertItemName(args.name);
    const nameKey = normalizeName(name);
    const existing = await ctx.db
      .query("newDriveItems")
      .withIndex("by_spaceId_and_parentId_and_deletedAt_and_nameKey", (q) =>
        q
          .eq("spaceId", args.spaceId)
          .eq("parentId", args.parentId)
          .eq("deletedAt", undefined)
          .eq("nameKey", nameKey),
      )
      .unique();
    if (existing) {
      if (existing.kind === "folder") return existing._id;
      throw new ConvexError("An item with this name already exists");
    }

    const now = Date.now();
    const folderId = await ctx.db.insert("newDriveItems", {
      spaceId: args.spaceId,
      ...(args.parentId ? { parentId: args.parentId } : {}),
      name,
      nameKey,
      kind: "folder",
      kindSort: "0-folder",
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("newDriveSpaces", args.spaceId, { updatedAt: now });
    return folderId;
  },
});

export const renameItem = authedMutation({
  args: {
    spaceId: v.id("newDriveSpaces"),
    itemId: v.id("newDriveItems"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSpaceAccess(ctx, args.spaceId);
    const item = await ctx.db.get("newDriveItems", args.itemId);
    if (!item || item.spaceId !== args.spaceId || item.deletedAt !== undefined) {
      throw new ConvexError("Item not found");
    }

    const name = assertItemName(args.name);
    const nameKey = normalizeName(name);
    const conflict = await ctx.db
      .query("newDriveItems")
      .withIndex("by_spaceId_and_parentId_and_deletedAt_and_nameKey", (q) =>
        q
          .eq("spaceId", args.spaceId)
          .eq("parentId", item.parentId)
          .eq("deletedAt", undefined)
          .eq("nameKey", nameKey),
      )
      .unique();
    if (conflict && conflict._id !== item._id) {
      throw new ConvexError("An item with this name already exists");
    }
    if (item.name === name) return null;

    const updatedAt = Date.now();
    await ctx.db.patch("newDriveItems", item._id, { name, nameKey, updatedAt });
    await ctx.db.patch("newDriveSpaces", args.spaceId, { updatedAt });
    return null;
  },
});

export const moveItems = authedMutation({
  args: {
    spaceId: v.id("newDriveSpaces"),
    itemIds: v.array(v.id("newDriveItems")),
    destinationFolderId: v.union(v.id("newDriveItems"), v.null()),
  },
  handler: async (ctx, args) => {
    await requireSpaceAccess(ctx, args.spaceId);
    if (args.itemIds.length === 0 || args.itemIds.length > 100) {
      throw new ConvexError("Move between 1 and 100 items at a time");
    }

    const itemIds = [...new Set(args.itemIds)];
    const items = await Promise.all(
      itemIds.map((itemId) => ctx.db.get("newDriveItems", itemId)),
    );
    if (
      items.some(
        (item) => !item || item.spaceId !== args.spaceId || item.deletedAt !== undefined,
      )
    ) {
      throw new ConvexError("One or more items could not be moved");
    }
    const existingItems = items.filter((item) => item !== null);
    const sourceParentId = existingItems[0]?.parentId;
    if (existingItems.some((item) => item.parentId !== sourceParentId)) {
      throw new ConvexError("Selected items must come from the same folder");
    }

    const destination = args.destinationFolderId
      ? await ctx.db.get("newDriveItems", args.destinationFolderId)
      : null;
    if (
      (args.destinationFolderId !== null && !destination) ||
      (destination &&
        (destination.kind !== "folder" ||
          destination.spaceId !== args.spaceId ||
          destination.deletedAt !== undefined))
    ) {
      throw new ConvexError("Destination folder not found");
    }
    const destinationParentId = destination?._id;
    if (sourceParentId === destinationParentId) return true;

    const movingIds = new Set<Id<"newDriveItems">>(itemIds);
    let ancestor: Doc<"newDriveItems"> | null = destination;
    while (ancestor) {
      if (movingIds.has(ancestor._id)) {
        throw new ConvexError("A folder cannot be moved into itself or a descendant");
      }
      ancestor = ancestor.parentId
        ? await ctx.db.get("newDriveItems", ancestor.parentId)
        : null;
    }

    for (const item of existingItems) {
      const conflict = await ctx.db
        .query("newDriveItems")
        .withIndex("by_spaceId_and_parentId_and_deletedAt_and_nameKey", (q) =>
          q
            .eq("spaceId", args.spaceId)
            .eq("parentId", destinationParentId)
            .eq("deletedAt", undefined)
            .eq("nameKey", item.nameKey),
        )
        .unique();
      if (conflict && !movingIds.has(conflict._id)) {
        throw new ConvexError(`An item named ${item.name} already exists there`);
      }
    }

    const now = Date.now();
    for (const item of existingItems) {
      await ctx.db.patch("newDriveItems", item._id, {
        parentId: destinationParentId,
        updatedAt: now,
      });
    }
    if (destination) {
      await ctx.db.patch("newDriveItems", destination._id, { updatedAt: now });
    }
    await ctx.db.patch("newDriveSpaces", args.spaceId, { updatedAt: now });
    return true;
  },
});

export const createUploadTicket = authedMutation({
  args: {
    spaceId: v.id("newDriveSpaces"),
    parentId: parentIdValidator,
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    await requireSpaceAccess(ctx, args.spaceId);
    await requireParentFolder(ctx, args.spaceId, args.parentId);
    const user = await requireLocalUser(ctx);
    const name = assertItemName(args.name);
    if (!Number.isInteger(args.size) || args.size < 0 || args.size > MAX_FILE_SIZE) {
      throw new ConvexError("File size is invalid or exceeds 5 GB");
    }

    const safeName =
      name
        .toLocaleLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "upload";
    const key = `new-drive/${args.spaceId}/${crypto.randomUUID()}-${safeName}`;
    const { url } = await r2.generateUploadUrl(key);
    const ticketId = await ctx.db.insert("newDriveUploadTickets", {
      key,
      spaceId: args.spaceId,
      ...(args.parentId ? { parentId: args.parentId } : {}),
      uploadedBy: user._id,
      name,
      nameKey: normalizeName(name),
      declaredContentType: args.contentType || "application/octet-stream",
      declaredSize: args.size,
      createdAt: Date.now(),
      expiresAt: Date.now() + UPLOAD_TICKET_TTL,
    });
    return { ticketId, key, url };
  },
});

export const getUploadTicket = internalQuery({
  args: { ticketId: v.id("newDriveUploadTickets") },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get("newDriveUploadTickets", args.ticketId);
    if (!ticket) return null;
    return {
      _id: ticket._id,
      key: ticket.key,
      spaceId: ticket.spaceId,
      parentId: ticket.parentId,
      shareRootId: ticket.shareRootId,
      uploadedBy: ticket.uploadedBy,
      name: ticket.name,
      nameKey: ticket.nameKey,
      declaredContentType: ticket.declaredContentType,
      declaredSize: ticket.declaredSize,
      expiresAt: ticket.expiresAt,
    };
  },
});

export const completeUpload = internalMutation({
  args: {
    ticketId: v.id("newDriveUploadTickets"),
    contentType: v.string(),
    size: v.number(),
    sha256: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get("newDriveUploadTickets", args.ticketId);
    if (
      !ticket ||
      ticket.expiresAt < Date.now() ||
      ticket.uploadedBy === "guest" ||
      ticket.shareRootId !== undefined
    ) {
      throw new ConvexError("Upload ticket expired");
    }
    if (args.size !== ticket.declaredSize) {
      throw new ConvexError("Uploaded file size does not match the selected file");
    }
    const duplicate = await ctx.db
      .query("newDriveItems")
      .withIndex("by_spaceId_and_parentId_and_deletedAt_and_nameKey", (q) =>
        q
          .eq("spaceId", ticket.spaceId)
          .eq("parentId", ticket.parentId)
          .eq("deletedAt", undefined)
          .eq("nameKey", ticket.nameKey),
      )
      .unique();
    if (duplicate) throw new ConvexError("An item with this name already exists");

    const now = Date.now();
    const itemId = await ctx.db.insert("newDriveItems", {
      spaceId: ticket.spaceId,
      ...(ticket.parentId ? { parentId: ticket.parentId } : {}),
      name: ticket.name,
      nameKey: ticket.nameKey,
      kind: "file",
      kindSort: "1-file",
      createdBy: ticket.uploadedBy,
      createdAt: now,
      updatedAt: now,
      r2: {
        key: ticket.key,
        contentType: args.contentType,
        size: args.size,
        ...(args.sha256 ? { sha256: args.sha256 } : {}),
      },
    });
    await ctx.db.delete("newDriveUploadTickets", ticket._id);
    await ctx.db.patch("newDriveSpaces", ticket.spaceId, { updatedAt: now });
    return itemId;
  },
});

export const finalizeUpload = action({
  args: { ticketId: v.id("newDriveUploadTickets") },
  returns: v.id("newDriveItems"),
  handler: async (ctx, args): Promise<Id<"newDriveItems">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || typeof identity.userId !== "string") {
      throw new ConvexError("Authentication required");
    }
    const ticket: UploadTicketResult | null = await ctx.runQuery(
      internal.drive.items.getUploadTicket,
      args,
    );
    if (!ticket || ticket.uploadedBy !== identity.userId) {
      throw new ConvexError("Upload ticket not found");
    }

    await r2.syncMetadata(ctx, ticket.key);
    const metadata = await r2.getMetadata(ctx, ticket.key);
    if (!metadata || metadata.size === undefined) {
      throw new ConvexError("Uploaded file metadata is unavailable");
    }
    return await ctx.runMutation(internal.drive.items.completeUpload, {
      ticketId: ticket._id,
      contentType: metadata.contentType ?? ticket.declaredContentType,
      size: metadata.size,
      sha256: metadata.sha256,
    });
  },
});

export const removeUploadTicket = internalMutation({
  args: { ticketId: v.id("newDriveUploadTickets") },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get("newDriveUploadTickets", args.ticketId);
    if (ticket) await ctx.db.delete("newDriveUploadTickets", ticket._id);
    return null;
  },
});

export const cancelUpload = action({
  args: { ticketId: v.id("newDriveUploadTickets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || typeof identity.userId !== "string") {
      throw new ConvexError("Authentication required");
    }
    const ticket: UploadTicketResult | null = await ctx.runQuery(
      internal.drive.items.getUploadTicket,
      args,
    );
    if (!ticket || ticket.uploadedBy !== identity.userId) return null;
    await r2.deleteObject(ctx, ticket.key);
    await ctx.runMutation(internal.drive.items.removeUploadTicket, args);
    return null;
  },
});

export async function collectDeletedItems(
  ctx: MutationCtx,
  spaceId: Id<"newDriveSpaces">,
  initialIds: Id<"newDriveItems">[],
) {
  const found = new Map<Id<"newDriveItems">, Doc<"newDriveItems">>();
  const queue = [...initialIds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (found.has(id)) continue;
    const item = await ctx.db.get("newDriveItems", id);
    if (!item || item.spaceId !== spaceId || item.deletedAt !== undefined) continue;
    found.set(id, item);
    if (found.size > MAX_DELETE_ITEMS) {
      throw new ConvexError(`Delete at most ${MAX_DELETE_ITEMS} items at a time`);
    }
    if (item.kind === "folder") {
      const children = await ctx.db
        .query("newDriveItems")
        .withIndex(
          "by_spaceId_and_parentId_and_deletedAt_and_kindSort_and_nameKey",
          (q) =>
            q.eq("spaceId", spaceId).eq("parentId", item._id).eq("deletedAt", undefined),
        )
        .take(MAX_DELETE_ITEMS + 1);
      queue.push(...children.map((child) => child._id));
    }
  }
  return [...found.values()];
}

export const deleteItems = authedMutation({
  args: {
    spaceId: v.id("newDriveSpaces"),
    itemIds: v.array(v.id("newDriveItems")),
  },
  handler: async (ctx, args) => {
    await requireSpaceAccess(ctx, args.spaceId);
    const items = await collectDeletedItems(ctx, args.spaceId, args.itemIds);
    const deletedAt = Date.now();
    for (const item of items) {
      await ctx.db.patch("newDriveItems", item._id, { deletedAt, updatedAt: deletedAt });
    }
    await ctx.db.patch("newDriveSpaces", args.spaceId, { updatedAt: deletedAt });
    const keys = items.flatMap((item) => (item.kind === "file" ? [item.r2.key] : []));
    if (keys.length > 0) {
      await ctx.scheduler.runAfter(0, internal.drive.items.deleteObjects, { keys });
    }
    return items.length;
  },
});

export const deleteObjects = internalAction({
  args: { keys: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Promise.all(args.keys.map((key) => r2.deleteObject(ctx, key)));
    return null;
  },
});
