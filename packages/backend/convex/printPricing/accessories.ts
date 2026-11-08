import { v } from "convex/values";

import { authedMutation, authedQuery, requireAppUser } from "../auth";
import {
  normalizeName,
  validateNonNegativeNumber,
  validateOptionalStoreUrl,
} from "./lib";

const accessoryValidator = v.object({
  _id: v.id("printPricingAccessories"),
  _creationTime: v.number(),
  name: v.string(),
  normalizedName: v.string(),
  price: v.number(),
  storeUrl: v.optional(v.string()),
  createdBy: v.id("users"),
  createdByName: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listAccessories = authedQuery({
  args: {},
  returns: v.array(accessoryValidator),
  handler: async (ctx) => {
    const accessories = await ctx.db
      .query("printPricingAccessories")
      .withIndex("by_normalized_name")
      .order("asc")
      .take(100);

    return await Promise.all(
      accessories.map(async (accessory) => {
        const creator = await ctx.db.get("users", accessory.createdBy);

        return {
          ...accessory,
          createdByName: creator?.name ?? "Former user",
        };
      }),
    );
  },
});

export const createAccessory = authedMutation({
  args: {
    name: v.string(),
    price: v.number(),
    storeUrl: v.optional(v.string()),
  },
  returns: v.id("printPricingAccessories"),
  handler: async (ctx, args) => {
    const actor = await requireAppUser(ctx);
    const accessoryName = normalizeName(args.name, "Accessory name");
    const price = validateNonNegativeNumber(args.price, "Accessory price");
    const storeUrl = validateOptionalStoreUrl(args.storeUrl);

    const existingAccessory = await ctx.db
      .query("printPricingAccessories")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", accessoryName.normalizedName),
      )
      .unique();

    if (existingAccessory) {
      throw new Error("An accessory with this name already exists");
    }

    const now = Date.now();

    return await ctx.db.insert("printPricingAccessories", {
      ...accessoryName,
      price,
      ...(storeUrl ? { storeUrl } : {}),
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAccessory = authedMutation({
  args: {
    accessoryId: v.id("printPricingAccessories"),
    name: v.string(),
    price: v.number(),
    storeUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const accessory = await ctx.db.get("printPricingAccessories", args.accessoryId);

    if (!accessory) {
      throw new Error("Accessory not found");
    }

    const accessoryName = normalizeName(args.name, "Accessory name");
    const price = validateNonNegativeNumber(args.price, "Accessory price");
    const storeUrl = validateOptionalStoreUrl(args.storeUrl);

    if (
      accessory.name === accessoryName.name &&
      accessory.price === price &&
      accessory.storeUrl === storeUrl
    ) {
      throw new Error("Accessory details are unchanged");
    }

    const existingAccessory = await ctx.db
      .query("printPricingAccessories")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", accessoryName.normalizedName),
      )
      .unique();

    if (existingAccessory && existingAccessory._id !== accessory._id) {
      throw new Error("An accessory with this name already exists");
    }

    await ctx.db.patch("printPricingAccessories", accessory._id, {
      ...accessoryName,
      price,
      storeUrl,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteAccessory = authedMutation({
  args: {
    accessoryId: v.id("printPricingAccessories"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const accessory = await ctx.db.get("printPricingAccessories", args.accessoryId);

    if (!accessory) {
      throw new Error("Accessory not found");
    }

    await ctx.db.delete("printPricingAccessories", args.accessoryId);

    return null;
  },
});
