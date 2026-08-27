import { defineTable } from "convex/server";
import { v } from "convex/values";

export const newDriveFolderPublicAccess = v.optional(
  v.union(v.literal("read"), v.literal("edit")),
);

export const newDriveFilePublicAccess = v.optional(v.literal("read"));

export const newDriveItemCreator = v.union(v.id("users"), v.literal("guest"));

const commonNewDriveItemFields = {
  spaceId: v.id("newDriveSpaces"),
  parentId: v.optional(v.id("newDriveItems")),
  name: v.string(),
  nameKey: v.string(),
  createdBy: newDriveItemCreator,
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
  publicToken: v.optional(v.string()),
  publicExpiresAt: v.optional(v.number()),
};

export const driveSchema = {
  newDriveSpaces: defineTable({
    name: v.string(),
    nameKey: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("admin"), v.literal("everyone"))),
    rootItemId: v.optional(v.id("newDriveItems")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_nameKey", ["nameKey"])
    .index("by_visibility", ["visibility"])
    .index("by_rootItemId", ["rootItemId"]),

  newDriveItems: defineTable(
    v.union(
      v.object({
        ...commonNewDriveItemFields,
        kind: v.literal("folder"),
        kindSort: v.literal("0-folder"),
        publicAccess: newDriveFolderPublicAccess,
      }),
      v.object({
        ...commonNewDriveItemFields,
        kind: v.literal("file"),
        kindSort: v.literal("1-file"),
        publicAccess: newDriveFilePublicAccess,
        r2: v.object({
          key: v.string(),
          contentType: v.string(),
          size: v.number(),
          sha256: v.optional(v.string()),
        }),
      }),
    ),
  )
    .index("by_spaceId_and_parentId_and_deletedAt_and_kindSort_and_nameKey", [
      "spaceId",
      "parentId",
      "deletedAt",
      "kindSort",
      "nameKey",
    ])
    .index("by_spaceId_and_parentId_and_deletedAt_and_nameKey", [
      "spaceId",
      "parentId",
      "deletedAt",
      "nameKey",
    ])
    .index("by_spaceId_and_deletedAt", ["spaceId", "deletedAt"])
    .index("by_deletedAt", ["deletedAt"])
    .index("by_publicToken", ["publicToken"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["spaceId", "kind"],
    }),

  newDriveUploadTickets: defineTable({
    key: v.string(),
    spaceId: v.id("newDriveSpaces"),
    parentId: v.optional(v.id("newDriveItems")),
    shareRootId: v.optional(v.id("newDriveItems")),
    uploadedBy: newDriveItemCreator,
    name: v.string(),
    nameKey: v.string(),
    declaredContentType: v.string(),
    declaredSize: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
    cleanupPending: v.optional(v.boolean()),
  })
    .index("by_key", ["key"])
    .index("by_expiresAt", ["expiresAt"]),

  newDriveTrelloAttachments: defineTable({
    newDriveItemId: v.id("newDriveItems"),
    trelloCardId: v.string(),
    trelloCardName: v.string(),
    attachedBy: v.id("users"),
    desiredState: v.union(v.literal("attached"), v.literal("detached")),
    syncStatus: v.union(v.literal("pending"), v.literal("synced"), v.literal("error")),
    lastSyncError: v.optional(v.string()),
    lastSyncAttemptAt: v.optional(v.number()),
    retryCount: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
    detachRequestedBy: v.optional(v.id("users")),
    detachRequestedAt: v.optional(v.number()),
  })
    .index("by_newDriveItemId", ["newDriveItemId"])
    .index("by_trelloCardId", ["trelloCardId"])
    .index("by_newDriveItemId_and_trelloCardId", ["newDriveItemId", "trelloCardId"]),
};
