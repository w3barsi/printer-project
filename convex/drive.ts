import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
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
        ...folders.map((f) => ({ ...f, isFile: false, type: "folder" })),
        ...files.map((f) => ({ ...f, isFile: true })),
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
