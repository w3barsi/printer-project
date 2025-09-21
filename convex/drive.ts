import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { authedMutation, authedQuery } from "./auth";
import { r2 } from "./r2";

export const deleteFilesAction = internalAction({
  args: {},
  handler: async (ctx) => {
    const promises = [];
    const filesToDelete = await ctx.runQuery(internal.drive.internalGetFilesToDelete, {});
    for (const file of filesToDelete) {
      promises.push(r2.deleteObject(ctx, file.key));
    }
    await Promise.all(promises);
    await ctx.runMutation(internal.drive.internalDeleteFilesAndFolders, {});
  },
});

export const internalDeleteFilesAndFolders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const filesToDelete = await ctx.db
      .query("file")
      .withIndex("by_toDelete", (q) => q.eq("toDelete", true))
      .collect();
    const foldersToDelete = await ctx.db
      .query("folder")
      .withIndex("by_toDelete", (q) => q.eq("toDelete", true))
      .collect();
    const all = [...filesToDelete, ...foldersToDelete];

    await Promise.all(
      all.map(async (item) => {
        ctx.db.delete(item._id);
      }),
    );
  },
});

export const internalGetFilesToDelete = internalQuery({
  args: {},
  handler: async (ctx) => {
    const filesToDelete = await ctx.db
      .query("file")
      .withIndex("by_toDelete", (q) => q.eq("toDelete", true))
      .collect();
    return filesToDelete;
  },
});

export const createFolder = authedMutation({
  args: {
    parent: v.union(v.literal("private"), v.literal("public"), v.id("folder")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { parent, name } = args;
    const duplicate = await ctx.db
      .query("folder")
      .withIndex("by_parent_name", (q) => q.eq("parent", parent).eq("name", name))
      .unique();
    if (duplicate) throw new Error();
    else console.log(duplicate);

    await ctx.db.insert("folder", {
      createdBy: ctx.user.subject as Id<"users">,
      parent,
      name,
    });
  },
});

export const deleteFilesOrFolders = authedMutation({
  args: {
    ids: v.array(v.union(v.id("file"), v.id("folder"))),
  },
  handler: async (ctx, args) => {
    // Collect all items to delete (including recursive folder contents)
    const itemsToDelete = await collectItemsToDelete(ctx, args.ids);

    // Mark all items for deletion instead of actually deleting them
    // This allows for async cleanup of storage and database
    for (const id of itemsToDelete) {
      await ctx.db.patch(id, { toDelete: true });
    }
    ctx.scheduler.runAfter(0, internal.drive.deleteFilesAction);
  },
});

// Helper function to recursively collect all items that need to be deleted
async function collectItemsToDelete(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  ids: Array<Id<"file"> | Id<"folder">>,
): Promise<Array<Id<"file"> | Id<"folder">>> {
  const itemsToDelete: Array<Id<"file"> | Id<"folder">> = [];

  for (const id of ids) {
    // Add the current item to the deletion list
    itemsToDelete.push(id);

    // Check if this is a folder by getting it from folder table
    const folder = await ctx.db.get(id as Id<"folder">);
    if (folder && folder.parent !== undefined) {
      // This is a folder, recursively collect its contents
      const folderContents = await collectFolderContents(ctx, id as Id<"folder">);
      itemsToDelete.push(...folderContents);
    }
  }

  // Remove duplicates in case of nested folder structures
  return [...new Set(itemsToDelete)];
}

// Helper function to collect all contents of a folder recursively
async function collectFolderContents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  folderId: Id<"folder">,
): Promise<Array<Id<"file"> | Id<"folder">>> {
  const contents: Array<Id<"file"> | Id<"folder">> = [];

  // Get all direct children (files and folders)
  const childFolders = await ctx.db
    .query("folder")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_parent", (q: any) => q.eq("parent", folderId))
    .collect();

  const childFiles = await ctx.db
    .query("file")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_parent", (q: any) => q.eq("parent", folderId))
    .collect();

  // Add files to contents
  for (const file of childFiles) {
    contents.push(file._id);
  }

  // Add folders to contents and recursively collect their contents
  for (const folder of childFolders) {
    contents.push(folder._id);
    const subContents = await collectFolderContents(ctx, folder._id);
    contents.push(...subContents);
  }

  return contents;
}

export const moveFilesOrFolders = authedMutation({
  args: {
    ids: v.array(v.union(v.id("file"), v.id("folder"))),
    parent: v.union(v.literal("private"), v.literal("public"), v.id("folder")),
  },
  handler: async (ctx, args) => {
    const { ids, parent } = args;
    for (const id of ids) {
      await ctx.db.patch(id, { parent });
    }
  },
});

export const renameFileOrFolder = authedMutation({
  args: {
    id: v.union(v.id("file"), v.id("folder")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, name } = args;
    await ctx.db.patch(id, { name });
  },
});

export const getDrive = authedQuery({
  args: {
    parent: v.union(v.literal("private"), v.literal("public"), v.id("folder")),
  },
  handler: async (ctx, args) => {
    const { parent } = args;
    const folders = await ctx.db
      .query("folder")
      .withIndex("by_parent", (q) => q.eq("parent", parent))
      .collect();
    const files = await ctx.db
      .query("file")
      .withIndex("by_parent", (q) => q.eq("parent", parent))
      .collect();

    // Filter out items marked for deletion
    const filteredFolders = folders.filter((f) => f.toDelete !== true);
    const filteredFiles = files.filter((f) => f.toDelete !== true);

    let currentFolder = null;
    if (parent !== "private" && parent !== "public") {
      const f = await ctx.db.get(parent as Id<"folder">);
      currentFolder = {
        ...f,
        type: "folder",
        isFile: false,
      };
    }

    let parentFolder = null;
    if (
      currentFolder &&
      currentFolder.parent !== "private" &&
      currentFolder.parent !== "public"
    ) {
      const f = await ctx.db.get(currentFolder.parent as Id<"folder">);
      parentFolder = {
        ...f,
        type: "folder",
        isFile: false,
      };
    } else {
      parentFolder = {
        type: "folder",
        _id: "private",
        name: "Drive",
        isFile: false,
      };
    }

    return {
      data: [
        ...filteredFolders.map((f) => ({
          ...f,
          isFile: false as const,
          type: "folder",
        })),
        ...filteredFiles.map((f) => ({ ...f, isFile: true as const })),
      ],
      currentFolder,
      parentFolder,
    };
  },
});

export const saveFileToDb = authedMutation({
  args: {
    files: v.array(
      v.object({
        parent: v.union(v.literal("private"), v.literal("public"), v.id("folder")),
        name: v.string(),
        key: v.string(),
        type: v.string(),
        size: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { files } = args;
    const createdBy = ctx.user.subject as Id<"users">;
    await Promise.all(
      files.map(async (file) => {
        await ctx.db.insert("file", {
          createdBy,
          parent: file.parent,
          name: file.name,
          key: file.key,
          type: file.type,
          size: file.size,
        });
      }),
    );
  },
});
