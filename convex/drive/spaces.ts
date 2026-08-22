import { ConvexError, v } from "convex/values";

import { authedMutation, authedQuery, requireAppUser } from "../auth";
import { normalizeName } from "./lib";

const visibilityValidator = v.union(v.literal("admin"), v.literal("everyone"));

export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    const spaces =
      ctx.authUser.role === "admin"
        ? await ctx.db.query("newDriveSpaces").order("desc").take(100)
        : (
            await Promise.all([
              ctx.db
                .query("newDriveSpaces")
                .withIndex("by_visibility", (q) => q.eq("visibility", "everyone"))
                .order("desc")
                .take(100),
              ctx.db
                .query("newDriveSpaces")
                .withIndex("by_visibility", (q) => q.eq("visibility", undefined))
                .order("desc")
                .take(100),
            ])
          )
            .flat()
            .sort((a, b) => b._creationTime - a._creationTime)
            .slice(0, 100);

    return spaces.map((space) => ({
      _id: space._id,
      _creationTime: space._creationTime,
      name: space.name,
      description: space.description,
      visibility: space.visibility ?? "everyone",
      createdBy: space.createdBy,
      createdAt: space.createdAt,
      updatedAt: space.updatedAt,
    }));
  },
});

export const create = authedMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    if (ctx.authUser.role !== "admin") {
      throw new ConvexError("Only administrators can create spaces");
    }

    const name = args.name.trim();
    const description = args.description?.trim();
    if (name.length < 2 || name.length > 60) {
      throw new ConvexError("Space name must be between 2 and 60 characters");
    }
    if (description && description.length > 160) {
      throw new ConvexError("Description must be 160 characters or fewer");
    }

    const nameKey = normalizeName(name);
    const duplicate = await ctx.db
      .query("newDriveSpaces")
      .withIndex("by_nameKey", (q) => q.eq("nameKey", nameKey))
      .unique();
    const legacyDuplicate = await ctx.db
      .query("newDriveSpaces")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    if (duplicate || legacyDuplicate) {
      throw new ConvexError("A space with this name already exists");
    }

    const user = await requireAppUser(ctx);
    const now = Date.now();
    return await ctx.db.insert("newDriveSpaces", {
      name,
      nameKey,
      ...(description ? { description } : {}),
      visibility: args.visibility,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});
