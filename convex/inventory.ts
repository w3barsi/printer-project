import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { authedMutation, authedQuery } from "./auth";
import { validateInventoryName } from "./inventoryHelpers";

const supplierListItemValidator = v.object({
  _id: v.id("inventorySuppliers"),
  _creationTime: v.number(),
  name: v.string(),
  normalizedName: v.string(),
  createdBy: v.id("users"),
  createdByName: v.string(),
});

const supplierOptionValidator = v.object({
  _id: v.id("inventorySuppliers"),
  name: v.string(),
});

function validatePaginationSize(numItems: number) {
  if (!Number.isSafeInteger(numItems) || numItems < 1 || numItems > 50) {
    throw new Error("Page size must be a whole number between 1 and 50");
  }
}

export const createSupplier = authedMutation({
  args: {
    name: v.string(),
  },
  returns: v.id("inventorySuppliers"),
  handler: async (ctx, args) => {
    const supplierName = validateInventoryName(args.name, "Supplier name");

    const existingSupplier = await ctx.db
      .query("inventorySuppliers")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", supplierName.normalizedName),
      )
      .unique();

    if (existingSupplier) {
      throw new Error("A supplier with this name already exists");
    }

    return await ctx.db.insert("inventorySuppliers", {
      ...supplierName,
      createdBy: ctx.user.userId as Id<"users">,
    });
  },
});

export const renameSupplier = authedMutation({
  args: {
    supplierId: v.id("inventorySuppliers"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get("inventorySuppliers", args.supplierId);

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const supplierName = validateInventoryName(args.name, "Supplier name");

    if (supplier.name === supplierName.name) {
      throw new Error("Supplier name is unchanged");
    }

    const existingSupplier = await ctx.db
      .query("inventorySuppliers")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", supplierName.normalizedName),
      )
      .unique();

    if (existingSupplier && existingSupplier._id !== supplier._id) {
      throw new Error("A supplier with this name already exists");
    }

    await ctx.db.patch("inventorySuppliers", supplier._id, supplierName);

    return null;
  },
});

export const listSuppliers = authedQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(supplierListItemValidator),
  handler: async (ctx, args) => {
    validatePaginationSize(args.paginationOpts.numItems);

    const result = await ctx.db
      .query("inventorySuppliers")
      .withIndex("by_name")
      .order("asc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (supplier) => {
        const creator = await ctx.db.get("users", supplier.createdBy);

        return {
          ...supplier,
          createdByName: creator?.name ?? "Former user",
        };
      }),
    );

    return {
      ...result,
      page,
    };
  },
});

export const searchSupplierOptions = authedQuery({
  args: {
    query: v.string(),
  },
  returns: v.array(supplierOptionValidator),
  handler: async (ctx, args) => {
    const searchQuery = args.query.trim();

    const suppliers = searchQuery
      ? await ctx.db
          .query("inventorySuppliers")
          .withSearchIndex("search_name", (q) => q.search("name", searchQuery))
          .take(20)
      : await ctx.db
          .query("inventorySuppliers")
          .withIndex("by_name")
          .order("asc")
          .take(20);

    return suppliers.map((supplier) => ({
      _id: supplier._id,
      name: supplier.name,
    }));
  },
});
