import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { authedMutation, authedQuery, requireLocalUser } from "./auth";
import {
  normalizeOptionalReason,
  validateInventoryName,
  validateNonNegativeQuantity,
  validatePositiveQuantity,
  validateRequiredReason,
} from "./inventoryHelpers";
import { inventoryAction, inventoryOperation } from "./schemas/inventory";

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

const inventoryItemListItemValidator = v.object({
  _id: v.id("inventoryItems"),
  _creationTime: v.number(),
  name: v.string(),
  quantity: v.number(),
  supplierId: v.optional(v.id("inventorySuppliers")),
  supplierName: v.string(),
  createdBy: v.id("users"),
  createdByName: v.string(),
});

const inventoryItemOptionValidator = v.object({
  _id: v.id("inventoryItems"),
  name: v.string(),
  supplierId: v.optional(v.id("inventorySuppliers")),
  supplierName: v.string(),
});

const inventoryActivityValidator = v.object({
  _id: v.id("inventoryActivities"),
  _creationTime: v.number(),
  inventoryItemId: v.id("inventoryItems"),
  action: inventoryAction,
  operation: inventoryOperation,
  quantityBefore: v.number(),
  quantityAfter: v.number(),
  quantityDelta: v.number(),
  reason: v.optional(v.string()),
  createdBy: v.id("users"),
  actorName: v.string(),
  itemNameBefore: v.optional(v.string()),
  itemNameAfter: v.string(),
  supplierIdBefore: v.optional(v.id("inventorySuppliers")),
  supplierNameBefore: v.optional(v.string()),
  supplierIdAfter: v.optional(v.id("inventorySuppliers")),
  supplierNameAfter: v.optional(v.string()),
});

type InventoryActivityInput = Omit<Doc<"inventoryActivities">, "_id" | "_creationTime">;

function validatePaginationSize(numItems: number) {
  if (!Number.isSafeInteger(numItems) || numItems < 1 || numItems > 50) {
    throw new Error("Page size must be a whole number between 1 and 50");
  }
}

async function insertInventoryActivity(
  db: MutationCtx["db"],
  activity: InventoryActivityInput,
) {
  await db.insert("inventoryActivities", activity);
}

async function getItemAndSupplier(
  db: MutationCtx["db"],
  inventoryItemId: Id<"inventoryItems">,
) {
  const item = await db.get("inventoryItems", inventoryItemId);

  if (!item) {
    throw new Error("Inventory item not found");
  }

  const supplier = item.supplierId
    ? await db.get("inventorySuppliers", item.supplierId)
    : null;

  return {
    item,
    supplier,
  };
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

export const createItem = authedMutation({
  args: {
    name: v.string(),
    supplierId: v.optional(v.id("inventorySuppliers")),
    initialQuantity: v.number(),
    reason: v.optional(v.string()),
  },
  returns: v.id("inventoryItems"),
  handler: async (ctx, args) => {
    const actor = await requireLocalUser(ctx);
    const { name } = validateInventoryName(args.name, "Item name");
    const initialQuantity = validateNonNegativeQuantity(args.initialQuantity);
    const reason = normalizeOptionalReason(args.reason);
    const supplier = args.supplierId
      ? await ctx.db.get("inventorySuppliers", args.supplierId)
      : null;

    if (args.supplierId && !supplier) {
      throw new Error("Supplier not found");
    }

    const inventoryItemId = await ctx.db.insert("inventoryItems", {
      name,
      quantity: initialQuantity,
      ...(supplier ? { supplierId: supplier._id } : {}),
      createdBy: actor._id,
    });

    await insertInventoryActivity(ctx.db, {
      inventoryItemId,
      action: "add",
      operation: "item_created",
      quantityBefore: 0,
      quantityAfter: initialQuantity,
      quantityDelta: initialQuantity,
      ...(reason ? { reason } : {}),
      createdBy: actor._id,
      actorName: actor.name,
      itemNameAfter: name,
      ...(supplier
        ? { supplierIdAfter: supplier._id, supplierNameAfter: supplier.name }
        : {}),
    });

    return inventoryItemId;
  },
});

export const addStock = authedMutation({
  args: {
    inventoryItemId: v.id("inventoryItems"),
    quantity: v.number(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireLocalUser(ctx);
    const addedQuantity = validatePositiveQuantity(args.quantity);
    const reason = normalizeOptionalReason(args.reason);
    const { item, supplier } = await getItemAndSupplier(ctx.db, args.inventoryItemId);
    const quantityAfter = validateNonNegativeQuantity(item.quantity + addedQuantity);

    await ctx.db.patch("inventoryItems", item._id, {
      quantity: quantityAfter,
    });

    await insertInventoryActivity(ctx.db, {
      inventoryItemId: item._id,
      action: "add",
      operation: "stock_added",
      quantityBefore: item.quantity,
      quantityAfter,
      quantityDelta: addedQuantity,
      ...(reason ? { reason } : {}),
      createdBy: actor._id,
      actorName: actor.name,
      itemNameBefore: item.name,
      itemNameAfter: item.name,
      ...(supplier
        ? {
            supplierIdBefore: supplier._id,
            supplierNameBefore: supplier.name,
            supplierIdAfter: supplier._id,
            supplierNameAfter: supplier.name,
          }
        : {}),
    });

    return null;
  },
});

export const removeStock = authedMutation({
  args: {
    inventoryItemId: v.id("inventoryItems"),
    quantity: v.number(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireLocalUser(ctx);
    const removedQuantity = validatePositiveQuantity(args.quantity);
    const reason = normalizeOptionalReason(args.reason);
    const { item, supplier } = await getItemAndSupplier(ctx.db, args.inventoryItemId);

    if (removedQuantity > item.quantity) {
      throw new Error("Cannot remove more stock than is available");
    }

    const quantityAfter = item.quantity - removedQuantity;

    await ctx.db.patch("inventoryItems", item._id, {
      quantity: quantityAfter,
    });

    await insertInventoryActivity(ctx.db, {
      inventoryItemId: item._id,
      action: "remove",
      operation: "stock_removed",
      quantityBefore: item.quantity,
      quantityAfter,
      quantityDelta: -removedQuantity,
      ...(reason ? { reason } : {}),
      createdBy: actor._id,
      actorName: actor.name,
      itemNameBefore: item.name,
      itemNameAfter: item.name,
      ...(supplier
        ? {
            supplierIdBefore: supplier._id,
            supplierNameBefore: supplier.name,
            supplierIdAfter: supplier._id,
            supplierNameAfter: supplier.name,
          }
        : {}),
    });

    return null;
  },
});

export const correctQuantity = authedMutation({
  args: {
    inventoryItemId: v.id("inventoryItems"),
    quantity: v.number(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireLocalUser(ctx);
    const correctedQuantity = validateNonNegativeQuantity(args.quantity);
    const reason = validateRequiredReason(args.reason);
    const { item, supplier } = await getItemAndSupplier(ctx.db, args.inventoryItemId);

    if (correctedQuantity === item.quantity) {
      throw new Error("Corrected quantity is unchanged");
    }

    await ctx.db.patch("inventoryItems", item._id, {
      quantity: correctedQuantity,
    });

    await insertInventoryActivity(ctx.db, {
      inventoryItemId: item._id,
      action: "update",
      operation: "quantity_corrected",
      quantityBefore: item.quantity,
      quantityAfter: correctedQuantity,
      quantityDelta: correctedQuantity - item.quantity,
      reason,
      createdBy: actor._id,
      actorName: actor.name,
      itemNameBefore: item.name,
      itemNameAfter: item.name,
      ...(supplier
        ? {
            supplierIdBefore: supplier._id,
            supplierNameBefore: supplier.name,
            supplierIdAfter: supplier._id,
            supplierNameAfter: supplier.name,
          }
        : {}),
    });

    return null;
  },
});

export const updateItemDetails = authedMutation({
  args: {
    inventoryItemId: v.id("inventoryItems"),
    name: v.string(),
    supplierId: v.optional(v.id("inventorySuppliers")),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireLocalUser(ctx);
    const { name } = validateInventoryName(args.name, "Item name");
    const reason = validateRequiredReason(args.reason);
    const { item, supplier: previousSupplier } = await getItemAndSupplier(
      ctx.db,
      args.inventoryItemId,
    );
    const nextSupplier =
      args.supplierId === previousSupplier?._id
        ? previousSupplier
        : args.supplierId
          ? await ctx.db.get("inventorySuppliers", args.supplierId)
          : null;

    if (args.supplierId && !nextSupplier) {
      throw new Error("Supplier not found");
    }

    if (name === item.name && nextSupplier?._id === previousSupplier?._id) {
      throw new Error("Item details are unchanged");
    }

    await ctx.db.patch("inventoryItems", item._id, {
      name,
      supplierId: nextSupplier?._id,
    });

    await insertInventoryActivity(ctx.db, {
      inventoryItemId: item._id,
      action: "update",
      operation: "details_updated",
      quantityBefore: item.quantity,
      quantityAfter: item.quantity,
      quantityDelta: 0,
      reason,
      createdBy: actor._id,
      actorName: actor.name,
      itemNameBefore: item.name,
      itemNameAfter: name,
      ...(previousSupplier
        ? {
            supplierIdBefore: previousSupplier._id,
            supplierNameBefore: previousSupplier.name,
          }
        : {}),
      ...(nextSupplier
        ? {
            supplierIdAfter: nextSupplier._id,
            supplierNameAfter: nextSupplier.name,
          }
        : {}),
    });

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

export const listItems = authedQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(inventoryItemListItemValidator),
  handler: async (ctx, args) => {
    validatePaginationSize(args.paginationOpts.numItems);

    const result = await ctx.db
      .query("inventoryItems")
      .withIndex("by_name")
      .order("asc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (item) => {
        const [supplier, creator] = await Promise.all([
          item.supplierId
            ? ctx.db.get("inventorySuppliers", item.supplierId)
            : Promise.resolve(null),
          ctx.db.get("users", item.createdBy),
        ]);

        return {
          ...item,
          supplierName: supplier?.name ?? "No supplier",
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

export const searchItemOptions = authedQuery({
  args: {
    query: v.string(),
  },
  returns: v.array(inventoryItemOptionValidator),
  handler: async (ctx, args) => {
    const searchQuery = args.query.trim();

    const items = searchQuery
      ? await ctx.db
          .query("inventoryItems")
          .withSearchIndex("search_name", (q) => q.search("name", searchQuery))
          .take(20)
      : await ctx.db.query("inventoryItems").withIndex("by_name").order("asc").take(20);

    return await Promise.all(
      items.map(async (item) => {
        const supplier = item.supplierId
          ? await ctx.db.get("inventorySuppliers", item.supplierId)
          : null;

        return {
          _id: item._id,
          name: item.name,
          supplierId: item.supplierId,
          supplierName: supplier?.name ?? "No supplier",
        };
      }),
    );
  },
});

export const listActivities = authedQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    inventoryItemId: v.optional(v.id("inventoryItems")),
    action: v.optional(inventoryAction),
  },
  returns: paginationResultValidator(inventoryActivityValidator),
  handler: async (ctx, args) => {
    validatePaginationSize(args.paginationOpts.numItems);
    const inventoryItemId = args.inventoryItemId;
    const action = args.action;

    if (inventoryItemId && action) {
      return await ctx.db
        .query("inventoryActivities")
        .withIndex("by_inventory_item_id_and_action", (q) =>
          q.eq("inventoryItemId", inventoryItemId).eq("action", action),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    if (inventoryItemId) {
      return await ctx.db
        .query("inventoryActivities")
        .withIndex("by_inventory_item_id", (q) =>
          q.eq("inventoryItemId", inventoryItemId),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    if (action) {
      return await ctx.db
        .query("inventoryActivities")
        .withIndex("by_action", (q) => q.eq("action", action))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("inventoryActivities")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
