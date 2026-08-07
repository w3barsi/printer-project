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
};

export const newDriveSchema = {
  newDriveSpaces: defineTable({
    name: v.string(),
    rootItemId: v.optional(v.id("newDriveItems")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
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
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["spaceId", "kind"],
    }),

  newDriveUploadTickets: defineTable({
    key: v.string(),
    spaceId: v.id("newDriveSpaces"),
    parentId: v.id("newDriveItems"),
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
};
