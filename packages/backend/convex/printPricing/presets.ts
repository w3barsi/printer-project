import { v } from "convex/values";

import { authedMutation, authedQuery, requireAppUser } from "../auth";
import { normalizeName, validateNonNegativeNumber, validatePositiveNumber } from "./lib";

const printerPresetValidator = v.object({
  _id: v.id("printPricingPrinterPresets"),
  _creationTime: v.number(),
  name: v.string(),
  normalizedName: v.string(),
  powerWatts: v.number(),
  price: v.number(),
  lifespanHours: v.number(),
  useCount: v.number(),
  createdBy: v.id("users"),
  createdByName: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const filamentPresetValidator = v.object({
  _id: v.id("printPricingFilamentPresets"),
  _creationTime: v.number(),
  name: v.string(),
  normalizedName: v.string(),
  costPerKg: v.number(),
  createdBy: v.id("users"),
  createdByName: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listPrinterPresets = authedQuery({
  args: {},
  returns: v.array(printerPresetValidator),
  handler: async (ctx) => {
    const presets = await ctx.db
      .query("printPricingPrinterPresets")
      .withIndex("by_normalized_name")
      .order("asc")
      .take(100);

    return await Promise.all(
      presets.map(async (preset) => {
        const creator = await ctx.db.get("users", preset.createdBy);

        return {
          ...preset,
          useCount: preset.useCount ?? 0,
          createdByName: creator?.name ?? "Former user",
        };
      }),
    );
  },
});

export const createPrinterPreset = authedMutation({
  args: {
    name: v.string(),
    powerWatts: v.number(),
    price: v.number(),
    lifespanHours: v.number(),
  },
  returns: v.id("printPricingPrinterPresets"),
  handler: async (ctx, args) => {
    const actor = await requireAppUser(ctx);
    const presetName = normalizeName(args.name, "Preset name");
    const powerWatts = validatePositiveNumber(args.powerWatts, "Printer power in watts");
    const price = validateNonNegativeNumber(args.price, "Printer price");
    const lifespanHours = validatePositiveNumber(
      args.lifespanHours,
      "Printer lifespan in hours",
    );

    const existingPreset = await ctx.db
      .query("printPricingPrinterPresets")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", presetName.normalizedName),
      )
      .unique();

    if (existingPreset) {
      throw new Error("A printer preset with this name already exists");
    }

    const now = Date.now();

    return await ctx.db.insert("printPricingPrinterPresets", {
      ...presetName,
      powerWatts,
      price,
      lifespanHours,
      useCount: 0,
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePrinterPreset = authedMutation({
  args: {
    presetId: v.id("printPricingPrinterPresets"),
    name: v.string(),
    powerWatts: v.number(),
    price: v.number(),
    lifespanHours: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const preset = await ctx.db.get("printPricingPrinterPresets", args.presetId);

    if (!preset) {
      throw new Error("Printer preset not found");
    }

    const presetName = normalizeName(args.name, "Preset name");
    const powerWatts = validatePositiveNumber(args.powerWatts, "Printer power in watts");
    const price = validateNonNegativeNumber(args.price, "Printer price");
    const lifespanHours = validatePositiveNumber(
      args.lifespanHours,
      "Printer lifespan in hours",
    );

    if (
      preset.name === presetName.name &&
      preset.powerWatts === powerWatts &&
      preset.price === price &&
      preset.lifespanHours === lifespanHours
    ) {
      throw new Error("Printer preset details are unchanged");
    }

    const existingPreset = await ctx.db
      .query("printPricingPrinterPresets")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", presetName.normalizedName),
      )
      .unique();

    if (existingPreset && existingPreset._id !== preset._id) {
      throw new Error("A printer preset with this name already exists");
    }

    await ctx.db.patch("printPricingPrinterPresets", preset._id, {
      ...presetName,
      powerWatts,
      price,
      lifespanHours,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deletePrinterPreset = authedMutation({
  args: {
    presetId: v.id("printPricingPrinterPresets"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const preset = await ctx.db.get("printPricingPrinterPresets", args.presetId);

    if (!preset) {
      throw new Error("Printer preset not found");
    }

    await ctx.db.delete("printPricingPrinterPresets", args.presetId);

    return null;
  },
});

export const listFilamentPresets = authedQuery({
  args: {},
  returns: v.array(filamentPresetValidator),
  handler: async (ctx) => {
    const presets = await ctx.db
      .query("printPricingFilamentPresets")
      .withIndex("by_normalized_name")
      .order("asc")
      .take(100);

    return await Promise.all(
      presets.map(async (preset) => {
        const creator = await ctx.db.get("users", preset.createdBy);

        return {
          ...preset,
          createdByName: creator?.name ?? "Former user",
        };
      }),
    );
  },
});

export const createFilamentPreset = authedMutation({
  args: {
    name: v.string(),
    costPerKg: v.number(),
  },
  returns: v.id("printPricingFilamentPresets"),
  handler: async (ctx, args) => {
    const actor = await requireAppUser(ctx);
    const presetName = normalizeName(args.name, "Preset name");
    const costPerKg = validateNonNegativeNumber(args.costPerKg, "Cost per kg");

    const existingPreset = await ctx.db
      .query("printPricingFilamentPresets")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", presetName.normalizedName),
      )
      .unique();

    if (existingPreset) {
      throw new Error("A filament preset with this name already exists");
    }

    const now = Date.now();

    return await ctx.db.insert("printPricingFilamentPresets", {
      ...presetName,
      costPerKg,
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFilamentPreset = authedMutation({
  args: {
    presetId: v.id("printPricingFilamentPresets"),
    name: v.string(),
    costPerKg: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const preset = await ctx.db.get("printPricingFilamentPresets", args.presetId);

    if (!preset) {
      throw new Error("Filament preset not found");
    }

    const presetName = normalizeName(args.name, "Preset name");
    const costPerKg = validateNonNegativeNumber(args.costPerKg, "Cost per kg");

    if (preset.name === presetName.name && preset.costPerKg === costPerKg) {
      throw new Error("Filament preset details are unchanged");
    }

    const existingPreset = await ctx.db
      .query("printPricingFilamentPresets")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", presetName.normalizedName),
      )
      .unique();

    if (existingPreset && existingPreset._id !== preset._id) {
      throw new Error("A filament preset with this name already exists");
    }

    await ctx.db.patch("printPricingFilamentPresets", preset._id, {
      ...presetName,
      costPerKg,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteFilamentPreset = authedMutation({
  args: {
    presetId: v.id("printPricingFilamentPresets"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAppUser(ctx);

    const preset = await ctx.db.get("printPricingFilamentPresets", args.presetId);

    if (!preset) {
      throw new Error("Filament preset not found");
    }

    await ctx.db.delete("printPricingFilamentPresets", args.presetId);

    return null;
  },
});
