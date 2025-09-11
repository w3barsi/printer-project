import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { authedMutation, authedQuery } from "./auth";

export const createFolder = authedMutation({
  args: {
    parent: v.union(v.literal("private"), v.literal("public"), v.id("folder")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { parent, name } = args;
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
    const { ids } = args;

    // Separate files and folders
    const fileIds: Id<"file">[] = [];
    const folderIds: Id<"folder">[] = [];

    for (const id of ids) {
      if (id.startsWith("file|")) {
        fileIds.push(id as Id<"file">);
      } else if (id.startsWith("folder|")) {
        folderIds.push(id as Id<"folder">);
      }
    }

    // Delete files from R2 first
    if (fileIds.length > 0) {
      const fileRecords = await Promise.all(fileIds.map((id) => ctx.db.get(id)));

      // Filter out null records (files that don't exist)
      const validFiles = fileRecords.filter((file) => file !== null);

      // Delete from R2
      await Promise.all(
        validFiles.map((file) =>
          ctx.runAction(api.drive.deleteFileFromR2, { key: file.key }),
        ),
      );
    }

    // Delete all items from database
    await Promise.all(ids.map((id) => ctx.db.delete(id)));
  },
});

export const moveFileOrFolder = authedMutation({
  args: {
    id: v.union(v.id("file"), v.id("folder")),
    parent: v.union(v.literal("private"), v.literal("public"), v.id("folder")),
  },
  handler: async (ctx, args) => {
    const { id, parent } = args;
    await ctx.db.patch(id, { parent });
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
        ...folders.map((f) => ({
          ...f,
          isFile: false as const,
          type: "folder",
        })),
        ...files.map((f) => ({ ...f, isFile: true as const })),
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

export const deleteFileFromR2 = internalAction({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    // This would call the server function to delete from R2
    // For now, we'll implement it directly here
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/dg-system/objects/${args.key}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.R2_TOKEN_VALUE}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete file from R2: ${response.statusText}`);
    }

    return { success: true };
  },
});
