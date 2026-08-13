import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { authedMutation, authedQuery } from "../auth";
import { r2 } from "../r2";
import {
  collectDeletedItems,
  MAX_DELETE_ITEMS,
  MAX_FILE_SIZE,
  UPLOAD_TICKET_TTL,
} from "./items";
import { assertItemName, normalizeName, requireSpaceAccess } from "./lib";

const SHARE_ERROR = "This shared item is unavailable";
const MAX_ANCESTRY_DEPTH = 256;
const MAX_MOVE_ITEMS = 100;
const MAX_ARCHIVE_FILES = 500;
const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;
const MAX_ARCHIVE_ITEMS = 1_000;
const SIGNED_URL_TTL_SECONDS = 15 * 60;

type DbCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;
type ShareRoot = Doc<"newDriveItems"> & { publicAccess: "read" | "edit" };

const accessValidator = v.union(v.literal("read"), v.literal("edit"));

function shareError(): never {
  throw new ConvexError(SHARE_ERROR);
}

export async function resolveActiveShare(ctx: DbCtx, token: string): Promise<ShareRoot> {
  if (!token || token.length > 200) shareError();
  const root = await ctx.db
    .query("newDriveItems")
    .withIndex("by_publicToken", (q) => q.eq("publicToken", token))
    .unique();
  if (
    !root ||
    root.deletedAt !== undefined ||
    root.publicToken !== token ||
    !root.publicAccess ||
    (root.publicExpiresAt !== undefined && root.publicExpiresAt <= Date.now())
  ) {
    shareError();
  }
  return root as ShareRoot;
}

export async function requireSharedItem(
  ctx: DbCtx,
  root: ShareRoot,
  itemId: Id<"newDriveItems">,
  options: { strictDescendant?: boolean } = {},
) {
  const item = await ctx.db.get("newDriveItems", itemId);
  if (!item || item.deletedAt !== undefined || item.spaceId !== root.spaceId)
    shareError();
  if (item._id === root._id) {
    if (options.strictDescendant) shareError();
    return item;
  }

  const visited = new Set<Id<"newDriveItems">>([item._id]);
  let parentId = item.parentId;
  for (let depth = 0; depth < MAX_ANCESTRY_DEPTH; depth += 1) {
    if (!parentId) shareError();
    if (parentId === root._id) return item;
    if (visited.has(parentId)) shareError();
    visited.add(parentId);
    const parent = await ctx.db.get("newDriveItems", parentId);
    if (!parent || parent.deletedAt !== undefined || parent.spaceId !== root.spaceId)
      shareError();
    parentId = parent.parentId;
  }
  return shareError();
}

function normalizeItemId(ctx: DbCtx, itemId: string) {
  const normalized = ctx.db.normalizeId("newDriveItems", itemId);
  if (!normalized) shareError();
  return normalized;
}

export async function requireSharedFolder(
  ctx: DbCtx,
  root: ShareRoot,
  folderId: Id<"newDriveItems">,
) {
  const folder = await requireSharedItem(ctx, root, folderId);
  if (folder.kind !== "folder") shareError();
  return folder;
}

async function requireEditShare(ctx: DbCtx, token: string) {
  const root = await resolveActiveShare(ctx, token);
  if (root.kind !== "folder" || root.publicAccess !== "edit") shareError();
  return root;
}

function publicItem(item: Doc<"newDriveItems">, rootId: Id<"newDriveItems">) {
  const common = {
    _id: item._id,
    name: item.name,
    parentId: item._id === rootId ? undefined : item.parentId,
    updatedAt: item.updatedAt,
    isShareRoot: item._id === rootId,
  };
  return item.kind === "file"
    ? { ...common, kind: item.kind, contentType: item.r2.contentType, size: item.r2.size }
    : { ...common, kind: item.kind };
}

function isPreviewable(contentType: string) {
  const normalized = contentType.toLocaleLowerCase().split(";", 1)[0].trim();
  return (
    (normalized.startsWith("image/") && normalized !== "image/svg+xml") ||
    normalized === "application/pdf" ||
    normalized === "application/json" ||
    normalized === "text/plain" ||
    normalized === "text/markdown" ||
    normalized === "text/csv" ||
    normalized.startsWith("audio/") ||
    normalized.startsWith("video/")
  );
}

async function findNameConflict(
  ctx: DbCtx,
  spaceId: Id<"newDriveSpaces">,
  parentId: Id<"newDriveItems"> | undefined,
  nameKey: string,
) {
  return await ctx.db
    .query("newDriveItems")
    .withIndex("by_spaceId_and_parentId_and_deletedAt_and_nameKey", (q) =>
      q
        .eq("spaceId", spaceId)
        .eq("parentId", parentId)
        .eq("deletedAt", undefined)
        .eq("nameKey", nameKey),
    )
    .unique();
}

export const getShareSettings = authedQuery({
  args: { itemId: v.id("newDriveItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get("newDriveItems", args.itemId);
    if (!item || item.deletedAt !== undefined) throw new ConvexError("Item not found");
    await requireSpaceAccess(ctx, item.spaceId);
    if (!item.publicAccess || !item.publicToken) {
      return { status: "restricted" as const, itemKind: item.kind };
    }
    return {
      status: "shared" as const,
      itemKind: item.kind,
      access: item.publicAccess,
      token: item.publicToken,
      expiresAt: item.publicExpiresAt ?? null,
      expired: item.publicExpiresAt !== undefined && item.publicExpiresAt <= Date.now(),
    };
  },
});

export const setShare = authedMutation({
  args: {
    itemId: v.id("newDriveItems"),
    access: accessValidator,
    expiresAt: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get("newDriveItems", args.itemId);
    if (!item || item.deletedAt !== undefined) throw new ConvexError("Item not found");
    await requireSpaceAccess(ctx, item.spaceId);
    if (item.kind === "file" && args.access === "edit") {
      throw new ConvexError("Files can only be shared with read access");
    }
    if (
      args.expiresAt !== null &&
      (!Number.isFinite(args.expiresAt) || args.expiresAt <= Date.now())
    ) {
      throw new ConvexError("Expiration must be in the future");
    }

    let token = item.publicAccess && item.publicToken ? item.publicToken : "";
    while (!token) {
      const candidate = crypto.randomUUID();
      const collision = await ctx.db
        .query("newDriveItems")
        .withIndex("by_publicToken", (q) => q.eq("publicToken", candidate))
        .unique();
      if (!collision) token = candidate;
    }
    await ctx.db.patch("newDriveItems", item._id, {
      publicAccess: args.access,
      publicToken: token,
      publicExpiresAt: args.expiresAt === null ? undefined : args.expiresAt,
    });
    return { token, access: args.access, expiresAt: args.expiresAt };
  },
});

export const disableShare = authedMutation({
  args: { itemId: v.id("newDriveItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get("newDriveItems", args.itemId);
    if (!item || item.deletedAt !== undefined) throw new ConvexError("Item not found");
    await requireSpaceAccess(ctx, item.spaceId);
    await ctx.db.patch("newDriveItems", item._id, {
      publicAccess: undefined,
      publicToken: undefined,
      publicExpiresAt: undefined,
    });
    return null;
  },
});

export const getSharedRoot = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    try {
      const root = await resolveActiveShare(ctx, args.token);
      return {
        status: "available" as const,
        access: root.publicAccess,
        item: publicItem(root, root._id),
      };
    } catch {
      return { status: "unavailable" as const };
    }
  },
});

export const getSharedFolder = query({
  args: { token: v.string(), folderId: v.string() },
  handler: async (ctx, args) => {
    try {
      const root = await resolveActiveShare(ctx, args.token);
      const folder = await requireSharedFolder(
        ctx,
        root,
        normalizeItemId(ctx, args.folderId),
      );
      return {
        status: "available" as const,
        access: root.publicAccess,
        folder: publicItem(folder, root._id),
      };
    } catch {
      return { status: "unavailable" as const };
    }
  },
});

export const listSharedItems = query({
  args: { token: v.string(), parentId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const root = await resolveActiveShare(ctx, args.token);
      if (root.kind !== "folder") shareError();
      const parent = await requireSharedFolder(
        ctx,
        root,
        args.parentId ? normalizeItemId(ctx, args.parentId) : root._id,
      );
      const items = await ctx.db
        .query("newDriveItems")
        .withIndex(
          "by_spaceId_and_parentId_and_deletedAt_and_kindSort_and_nameKey",
          (q) =>
            q
              .eq("spaceId", root.spaceId)
              .eq("parentId", parent._id)
              .eq("deletedAt", undefined),
        )
        .take(500);

      const breadcrumbs: Doc<"newDriveItems">[] = [];
      let breadcrumb: Doc<"newDriveItems"> = parent;
      for (let depth = 0; depth < MAX_ANCESTRY_DEPTH; depth += 1) {
        breadcrumbs.push(breadcrumb);
        if (breadcrumb._id === root._id) break;
        if (!breadcrumb.parentId) shareError();
        const next: Doc<"newDriveItems"> | null = await ctx.db.get(
          "newDriveItems",
          breadcrumb.parentId,
        );
        if (
          !next ||
          next.kind !== "folder" ||
          next.deletedAt !== undefined ||
          next.spaceId !== root.spaceId
        ) {
          shareError();
        }
        breadcrumb = next;
      }
      if (breadcrumbs[breadcrumbs.length - 1]?._id !== root._id) shareError();

      const folders: Doc<"newDriveItems">[] = [root];
      const folderQueue = [root._id];
      const visitedFolders = new Set<Id<"newDriveItems">>();
      while (folderQueue.length > 0) {
        const folderId = folderQueue.shift()!;
        if (visitedFolders.has(folderId)) shareError();
        visitedFolders.add(folderId);
        const children = await ctx.db
          .query("newDriveItems")
          .withIndex(
            "by_spaceId_and_parentId_and_deletedAt_and_kindSort_and_nameKey",
            (q) =>
              q
                .eq("spaceId", root.spaceId)
                .eq("parentId", folderId)
                .eq("deletedAt", undefined),
          )
          .take(MAX_ARCHIVE_ITEMS + 1);
        for (const child of children) {
          if (child.kind !== "folder") continue;
          folders.push(child);
          folderQueue.push(child._id);
          if (folders.length > MAX_ARCHIVE_ITEMS) shareError();
        }
      }
      return {
        status: "available" as const,
        access: root.publicAccess,
        parent: publicItem(parent, root._id),
        items: items.map((item) => publicItem(item, root._id)),
        breadcrumbs: breadcrumbs.reverse().map((item) => publicItem(item, root._id)),
        folders: folders.map((item) => publicItem(item, root._id)),
      };
    } catch {
      return { status: "unavailable" as const };
    }
  },
});

export const getSharedFilePreview = query({
  args: { token: v.string(), itemId: v.string() },
  handler: async (ctx, args) => {
    try {
      const root = await resolveActiveShare(ctx, args.token);
      const item = await requireSharedItem(ctx, root, normalizeItemId(ctx, args.itemId));
      if (item.kind !== "file") shareError();
      const previewable = isPreviewable(item.r2.contentType);
      if (!previewable) {
        return {
          status: "available" as const,
          item: publicItem(item, root._id),
          previewable: false,
        };
      }
      const url = await r2.getUrl(item.r2.key, { expiresIn: SIGNED_URL_TTL_SECONDS });
      if (!url) shareError();
      return {
        status: "available" as const,
        item: publicItem(item, root._id),
        previewable,
        url,
      };
    } catch {
      return { status: "unavailable" as const };
    }
  },
});

export const getSharedDownloadUrl = query({
  args: { token: v.string(), itemId: v.string() },
  handler: async (ctx, args) => {
    try {
      const root = await resolveActiveShare(ctx, args.token);
      const item = await requireSharedItem(ctx, root, normalizeItemId(ctx, args.itemId));
      if (item.kind !== "file") shareError();
      const url = await r2.getUrl(item.r2.key, { expiresIn: SIGNED_URL_TTL_SECONDS });
      if (!url) shareError();
      return {
        status: "available" as const,
        item: publicItem(item, root._id),
        previewable: isPreviewable(item.r2.contentType),
        url,
      };
    } catch {
      return { status: "unavailable" as const };
    }
  },
});

function safeArchiveSegment(name: string) {
  return (
    name !== "." &&
    name !== ".." &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(name)
  );
}

export const getSharedArchiveManifest = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    try {
      const root = await resolveActiveShare(ctx, args.token);
      if (root.kind !== "folder" || !safeArchiveSegment(root.name)) shareError();
      const queue: Array<{ folder: Doc<"newDriveItems">; path: string }> = [
        { folder: root, path: root.name },
      ];
      const visited = new Set<Id<"newDriveItems">>();
      const files: Array<{
        item: Doc<"newDriveItems"> & { kind: "file" };
        path: string;
      }> = [];
      let totalSize = 0;
      let itemCount = 0;
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current.folder._id)) shareError();
        visited.add(current.folder._id);
        const children = await ctx.db
          .query("newDriveItems")
          .withIndex(
            "by_spaceId_and_parentId_and_deletedAt_and_kindSort_and_nameKey",
            (q) =>
              q
                .eq("spaceId", root.spaceId)
                .eq("parentId", current.folder._id)
                .eq("deletedAt", undefined),
          )
          .take(MAX_ARCHIVE_ITEMS + 1);
        for (const child of children) {
          itemCount += 1;
          if (itemCount > MAX_ARCHIVE_ITEMS || !safeArchiveSegment(child.name))
            shareError();
          const path = `${current.path}/${child.name}`;
          if (child.kind === "folder") queue.push({ folder: child, path });
          else {
            files.push({ item: child, path });
            totalSize += child.r2.size;
            if (files.length > MAX_ARCHIVE_FILES || totalSize > MAX_ARCHIVE_BYTES) {
              return {
                status: "archiveTooLarge" as const,
                maxFiles: MAX_ARCHIVE_FILES,
                maxBytes: MAX_ARCHIVE_BYTES,
              };
            }
          }
        }
      }
      const signedFiles = await Promise.all(
        files.map(async ({ item, path }) => {
          const url = await r2.getUrl(item.r2.key, { expiresIn: SIGNED_URL_TTL_SECONDS });
          if (!url) shareError();
          return { path, size: item.r2.size, url };
        }),
      );
      return {
        status: "available" as const,
        rootName: root.name,
        fileCount: files.length,
        totalSize,
        files: signedFiles,
      };
    } catch {
      return { status: "unavailable" as const };
    }
  },
});

export const createSharedFolder = mutation({
  args: { token: v.string(), parentId: v.id("newDriveItems"), name: v.string() },
  handler: async (ctx, args) => {
    const root = await requireEditShare(ctx, args.token);
    const parent = await requireSharedFolder(ctx, root, args.parentId);
    const name = assertItemName(args.name);
    const nameKey = normalizeName(name);
    const existing = await findNameConflict(ctx, root.spaceId, parent._id, nameKey);
    if (existing) {
      if (existing.kind === "folder") return existing._id;
      throw new ConvexError("An item with this name already exists");
    }
    const now = Date.now();
    const itemId = await ctx.db.insert("newDriveItems", {
      spaceId: root.spaceId,
      parentId: parent._id,
      name,
      nameKey,
      kind: "folder",
      kindSort: "0-folder",
      createdBy: "guest",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("newDriveItems", parent._id, { updatedAt: now });
    await ctx.db.patch("newDriveSpaces", root.spaceId, { updatedAt: now });
    return itemId;
  },
});

export const renameSharedItem = mutation({
  args: { token: v.string(), itemId: v.id("newDriveItems"), name: v.string() },
  handler: async (ctx, args) => {
    const root = await requireEditShare(ctx, args.token);
    const item = await requireSharedItem(ctx, root, args.itemId, {
      strictDescendant: true,
    });
    const name = assertItemName(args.name);
    const nameKey = normalizeName(name);
    const conflict = await findNameConflict(ctx, root.spaceId, item.parentId, nameKey);
    if (conflict && conflict._id !== item._id)
      throw new ConvexError("An item with this name already exists");
    if (item.name === name) return null;
    const now = Date.now();
    await ctx.db.patch("newDriveItems", item._id, { name, nameKey, updatedAt: now });
    await ctx.db.patch("newDriveSpaces", root.spaceId, { updatedAt: now });
    return null;
  },
});

export const moveSharedItems = mutation({
  args: {
    token: v.string(),
    itemIds: v.array(v.id("newDriveItems")),
    destinationFolderId: v.id("newDriveItems"),
  },
  handler: async (ctx, args) => {
    const root = await requireEditShare(ctx, args.token);
    if (args.itemIds.length === 0 || args.itemIds.length > MAX_MOVE_ITEMS) shareError();
    const itemIds = [...new Set(args.itemIds)];
    const items = await Promise.all(
      itemIds.map((id) => requireSharedItem(ctx, root, id, { strictDescendant: true })),
    );
    const sourceParentId = items[0].parentId;
    if (items.some((item) => item.parentId !== sourceParentId)) shareError();
    const destination = await requireSharedFolder(ctx, root, args.destinationFolderId);
    if (sourceParentId === destination._id) return true;
    const movingIds = new Set(itemIds);
    let ancestor: Doc<"newDriveItems"> | null = destination;
    for (let depth = 0; ancestor && depth < MAX_ANCESTRY_DEPTH; depth += 1) {
      if (movingIds.has(ancestor._id)) shareError();
      if (ancestor._id === root._id) {
        ancestor = null;
        break;
      }
      ancestor = ancestor.parentId
        ? await ctx.db.get("newDriveItems", ancestor.parentId)
        : null;
      if (
        !ancestor ||
        ancestor.deletedAt !== undefined ||
        ancestor.spaceId !== root.spaceId
      )
        shareError();
    }
    if (ancestor) shareError();
    for (const item of items) {
      const conflict = await findNameConflict(
        ctx,
        root.spaceId,
        destination._id,
        item.nameKey,
      );
      if (conflict && !movingIds.has(conflict._id))
        throw new ConvexError(`An item named ${item.name} already exists there`);
    }
    const now = Date.now();
    for (const item of items)
      await ctx.db.patch("newDriveItems", item._id, {
        parentId: destination._id,
        updatedAt: now,
      });
    await ctx.db.patch("newDriveItems", destination._id, { updatedAt: now });
    await ctx.db.patch("newDriveSpaces", root.spaceId, { updatedAt: now });
    return true;
  },
});

export const deleteSharedItems = mutation({
  args: { token: v.string(), itemIds: v.array(v.id("newDriveItems")) },
  handler: async (ctx, args) => {
    const root = await requireEditShare(ctx, args.token);
    if (args.itemIds.length === 0 || args.itemIds.length > MAX_DELETE_ITEMS) shareError();
    const itemIds = [...new Set(args.itemIds)];
    await Promise.all(
      itemIds.map((id) => requireSharedItem(ctx, root, id, { strictDescendant: true })),
    );
    const items = await collectDeletedItems(ctx, root.spaceId, itemIds);
    const deletedAt = Date.now();
    for (const item of items)
      await ctx.db.patch("newDriveItems", item._id, { deletedAt, updatedAt: deletedAt });
    await ctx.db.patch("newDriveSpaces", root.spaceId, { updatedAt: deletedAt });
    const keys = items.flatMap((item) => (item.kind === "file" ? [item.r2.key] : []));
    if (keys.length > 0)
      await ctx.scheduler.runAfter(0, internal.drive.items.deleteObjects, { keys });
    return items.length;
  },
});

export const createSharedUploadTicket = mutation({
  args: {
    token: v.string(),
    parentId: v.id("newDriveItems"),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const root = await requireEditShare(ctx, args.token);
    const parent = await requireSharedFolder(ctx, root, args.parentId);
    const name = assertItemName(args.name);
    if (!Number.isInteger(args.size) || args.size < 0 || args.size > MAX_FILE_SIZE) {
      throw new ConvexError("File size is invalid or exceeds 5 GB");
    }
    const safeName =
      name
        .toLocaleLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "upload";
    const key = `new-drive/${root.spaceId}/${crypto.randomUUID()}-${safeName}`;
    const { url } = await r2.generateUploadUrl(key);
    const now = Date.now();
    const ticketId = await ctx.db.insert("newDriveUploadTickets", {
      key,
      spaceId: root.spaceId,
      parentId: parent._id,
      shareRootId: root._id,
      uploadedBy: "guest",
      name,
      nameKey: normalizeName(name),
      declaredContentType: args.contentType || "application/octet-stream",
      declaredSize: args.size,
      createdAt: now,
      expiresAt: now + UPLOAD_TICKET_TTL,
    });
    return { ticketId, url };
  },
});

export const getAuthorizedGuestUploadTicket = internalQuery({
  args: { token: v.string(), ticketId: v.id("newDriveUploadTickets") },
  handler: async (ctx, args) => {
    const root = await requireEditShare(ctx, args.token);
    const ticket = await ctx.db.get("newDriveUploadTickets", args.ticketId);
    if (
      !ticket ||
      ticket.uploadedBy !== "guest" ||
      ticket.shareRootId !== root._id ||
      ticket.expiresAt <= Date.now()
    )
      shareError();
    if (!ticket.parentId) shareError();
    await requireSharedFolder(ctx, root, ticket.parentId);
    return {
      _id: ticket._id,
      key: ticket.key,
      declaredContentType: ticket.declaredContentType,
      declaredSize: ticket.declaredSize,
    };
  },
});

export const completeSharedUpload = internalMutation({
  args: {
    token: v.string(),
    ticketId: v.id("newDriveUploadTickets"),
    contentType: v.string(),
    size: v.number(),
    sha256: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const root = await requireEditShare(ctx, args.token);
    const ticket = await ctx.db.get("newDriveUploadTickets", args.ticketId);
    if (
      !ticket ||
      ticket.uploadedBy !== "guest" ||
      ticket.shareRootId !== root._id ||
      ticket.expiresAt <= Date.now()
    )
      shareError();
    if (!ticket.parentId) shareError();
    const parent = await requireSharedFolder(ctx, root, ticket.parentId);
    if (args.size !== ticket.declaredSize)
      throw new ConvexError("Uploaded file size does not match the selected file");
    const duplicate = await findNameConflict(
      ctx,
      root.spaceId,
      parent._id,
      ticket.nameKey,
    );
    if (duplicate) throw new ConvexError("An item with this name already exists");
    const now = Date.now();
    const itemId = await ctx.db.insert("newDriveItems", {
      spaceId: root.spaceId,
      parentId: parent._id,
      name: ticket.name,
      nameKey: ticket.nameKey,
      kind: "file",
      kindSort: "1-file",
      createdBy: "guest",
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
    await ctx.db.patch("newDriveItems", parent._id, { updatedAt: now });
    await ctx.db.patch("newDriveSpaces", root.spaceId, { updatedAt: now });
    return itemId;
  },
});

export const removeAuthorizedSharedUploadTicket = internalMutation({
  args: { token: v.string(), ticketId: v.id("newDriveUploadTickets") },
  handler: async (ctx, args) => {
    const root = await requireEditShare(ctx, args.token);
    const ticket = await ctx.db.get("newDriveUploadTickets", args.ticketId);
    if (!ticket || ticket.uploadedBy !== "guest" || ticket.shareRootId !== root._id)
      shareError();
    if (!ticket.parentId) shareError();
    await requireSharedFolder(ctx, root, ticket.parentId);
    await ctx.db.delete("newDriveUploadTickets", ticket._id);
    return ticket.key;
  },
});
