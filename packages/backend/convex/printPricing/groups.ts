import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { authedMutation, authedQuery, requireAppUser } from "../auth";
import { normalizeName } from "./lib";
import { pricingItemListItemValidator } from "./validators";

const pricingGroupValidator = v.object({
  _id: v.id("printPricingGroups"),
  name: v.string(),
  updatedAt: v.number(),
  latestCalculatedAt: v.optional(v.number()),
  items: v.array(pricingItemListItemValidator),
  total: v.number(),
  unpricedCount: v.number(),
});

const maxGroupItems = 50;

// Groups exist only as containers, so an empty group is removed automatically.
export async function deleteGroupIfEmpty(
  ctx: Pick<MutationCtx, "db">,
  groupId: Id<"printPricingGroups">,
) {
  const remaining = await ctx.db
    .query("printPricingItems")
    .withIndex("by_groupId_and_updatedAt", (q) => q.eq("groupId", groupId))
    .take(1);

  if (remaining.length > 0) {
    return false;
  }

  await ctx.db.delete("printPricingGroups", groupId);
  return true;
}

export const listGroups = authedQuery({
  args: {},
  returns: v.array(pricingGroupValidator),
  handler: async (ctx) => {
    const groups = await ctx.db.query("printPricingGroups").order("desc").take(100);

    const groupsWithItems = await Promise.all(
      groups.map(async (group) => {
        const groupItems = await ctx.db
          .query("printPricingItems")
          .withIndex("by_groupId_and_updatedAt", (q) => q.eq("groupId", group._id))
          .order("desc")
          .take(200);

        const items = await Promise.all(
          groupItems.map(async (item) => {
            const creator = await ctx.db.get("users", item.createdBy);

            return {
              ...item,
              createdByName: creator?.name ?? "Former user",
            };
          }),
        );

        let latestCalculatedAt: number | undefined;
        // Members can be repriced after the group itself changed; treat the most
        // recent member activity as the group's update time so the merged list
        // stays in recency order.
        let updatedAt = group.updatedAt;

        for (const item of items) {
          if (item.updatedAt > updatedAt) {
            updatedAt = item.updatedAt;
          }

          if (
            item.latestCalculatedAt !== undefined &&
            (latestCalculatedAt === undefined ||
              item.latestCalculatedAt > latestCalculatedAt)
          ) {
            latestCalculatedAt = item.latestCalculatedAt;
          }
        }

        return {
          _id: group._id,
          name: group.name,
          updatedAt,
          latestCalculatedAt,
          items,
          total: items.reduce((sum, item) => sum + (item.latestTotal ?? 0), 0),
          unpricedCount: items.filter((item) => item.latestTotal === undefined).length,
        };
      }),
    );

    return groupsWithItems.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const createGroup = authedMutation({
  args: {
    name: v.string(),
    itemIds: v.array(v.id("printPricingItems")),
  },
  returns: v.id("printPricingGroups"),
  handler: async (ctx, args) => {
    const actor = await requireAppUser(ctx);
    const groupName = normalizeName(args.name, "Group name");
    const itemIds = [...new Set(args.itemIds)];

    if (itemIds.length === 0) {
      throw new Error("Pick at least one item to group");
    }

    if (itemIds.length > maxGroupItems) {
      throw new Error(`A group cannot have more than ${maxGroupItems} items`);
    }

    const existingGroup = await ctx.db
      .query("printPricingGroups")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", groupName.normalizedName),
      )
      .unique();

    if (existingGroup) {
      throw new Error("A group with this name already exists");
    }

    const now = Date.now();
    const groupId = await ctx.db.insert("printPricingGroups", {
      ...groupName,
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });

    const previousGroupIds = new Set<Id<"printPricingGroups">>();

    for (const itemId of itemIds) {
      const item = await ctx.db.get("printPricingItems", itemId);

      if (!item) {
        throw new Error("Pricing item not found");
      }

      if (item.groupId) {
        previousGroupIds.add(item.groupId);
      }

      await ctx.db.patch("printPricingItems", item._id, { groupId });
    }

    for (const previousGroupId of previousGroupIds) {
      const groupDeleted = await deleteGroupIfEmpty(ctx, previousGroupId);

      if (!groupDeleted) {
        await ctx.db.patch("printPricingGroups", previousGroupId, {
          updatedAt: now,
        });
      }
    }

    return groupId;
  },
});

export const renameGroup = authedMutation({
  args: {
    groupId: v.id("printPricingGroups"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const group = await ctx.db.get("printPricingGroups", args.groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    const groupName = normalizeName(args.name, "Group name");

    if (groupName.name === group.name) {
      throw new Error("Group name is unchanged");
    }

    const existingGroup = await ctx.db
      .query("printPricingGroups")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", groupName.normalizedName),
      )
      .unique();

    if (existingGroup && existingGroup._id !== group._id) {
      throw new Error("A group with this name already exists");
    }

    await ctx.db.patch("printPricingGroups", group._id, {
      ...groupName,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const moveItemToGroup = authedMutation({
  args: {
    itemId: v.id("printPricingItems"),
    groupId: v.id("printPricingGroups"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const item = await ctx.db.get("printPricingItems", args.itemId);

    if (!item) {
      throw new Error("Pricing item not found");
    }

    const group = await ctx.db.get("printPricingGroups", args.groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    if (item.groupId === group._id) {
      return null;
    }

    const groupItems = await ctx.db
      .query("printPricingItems")
      .withIndex("by_groupId_and_updatedAt", (q) => q.eq("groupId", group._id))
      .take(maxGroupItems);

    if (groupItems.length >= maxGroupItems) {
      throw new Error(`A group cannot have more than ${maxGroupItems} items`);
    }

    const previousGroupId = item.groupId;
    const now = Date.now();

    await ctx.db.patch("printPricingItems", item._id, { groupId: group._id });
    await ctx.db.patch("printPricingGroups", group._id, { updatedAt: now });

    if (previousGroupId) {
      const groupDeleted = await deleteGroupIfEmpty(ctx, previousGroupId);

      if (!groupDeleted) {
        await ctx.db.patch("printPricingGroups", previousGroupId, {
          updatedAt: now,
        });
      }
    }

    return null;
  },
});

export const removeItemFromGroup = authedMutation({
  args: {
    itemId: v.id("printPricingItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const item = await ctx.db.get("printPricingItems", args.itemId);

    if (!item) {
      throw new Error("Pricing item not found");
    }

    if (!item.groupId) {
      return null;
    }

    const groupId = item.groupId;
    const now = Date.now();

    await ctx.db.patch("printPricingItems", item._id, {
      groupId: undefined,
      updatedAt: now,
    });

    const groupDeleted = await deleteGroupIfEmpty(ctx, groupId);

    if (!groupDeleted) {
      await ctx.db.patch("printPricingGroups", groupId, { updatedAt: now });
    }

    return null;
  },
});

export const deleteGroup = authedMutation({
  args: {
    groupId: v.id("printPricingGroups"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const group = await ctx.db.get("printPricingGroups", args.groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Ungroup every member, keeping the items and their price history intact.
    const now = Date.now();

    while (true) {
      const items = await ctx.db
        .query("printPricingItems")
        .withIndex("by_groupId_and_updatedAt", (q) => q.eq("groupId", group._id))
        .take(64);

      if (items.length === 0) {
        break;
      }

      for (const item of items) {
        await ctx.db.patch("printPricingItems", item._id, {
          groupId: undefined,
          updatedAt: now,
        });
      }
    }

    await ctx.db.delete("printPricingGroups", group._id);

    return null;
  },
});
