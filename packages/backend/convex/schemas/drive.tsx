import { defineTable } from "convex/server";
import { v } from "convex/values";

export const driveFolderPublicAccess = v.optional(
  v.union(v.literal("read"), v.literal("edit")),
);

export const driveFilePublicAccess = v.optional(v.literal("read"));

export const driveItemCreator = v.union(v.id("users"), v.literal("guest"));

const commonDriveItemFields = {
  spaceId: v.id("driveSpaces"),
  parentId: v.optional(v.id("driveItems")),
  name: v.string(),
  nameKey: v.string(),
  createdBy: driveItemCreator,
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
  publicToken: v.optional(v.string()),
  publicExpiresAt: v.optional(v.number()),
};

export const driveSchema = {
  driveSpaces: defineTable({
    name: v.string(),
    nameKey: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("admin"), v.literal("everyone"))),
    rootItemId: v.optional(v.id("driveItems")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_nameKey", ["nameKey"])
    .index("by_visibility", ["visibility"])
    .index("by_rootItemId", ["rootItemId"]),

  driveItems: defineTable(
    v.union(
      v.object({
        ...commonDriveItemFields,
        kind: v.literal("folder"),
        kindSort: v.literal("0-folder"),
        publicAccess: driveFolderPublicAccess,
      }),
      v.object({
        ...commonDriveItemFields,
        kind: v.literal("file"),
        kindSort: v.literal("1-file"),
        publicAccess: driveFilePublicAccess,
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
      filterFields: ["spaceId", "kind", "deletedAt"],
    }),

  driveUploadTickets: defineTable({
    key: v.string(),
    spaceId: v.id("driveSpaces"),
    parentId: v.optional(v.id("driveItems")),
    shareRootId: v.optional(v.id("driveItems")),
    uploadedBy: driveItemCreator,
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

  driveTrelloAttachments: defineTable({
    driveItemId: v.id("driveItems"),
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
    .index("by_driveItemId", ["driveItemId"])
    .index("by_trelloCardId", ["trelloCardId"])
    .index("by_driveItemId_and_trelloCardId", ["driveItemId", "trelloCardId"]),
};
