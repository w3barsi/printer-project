import { defineTable } from "convex/server";
import { v } from "convex/values";

export const inventoryAction = v.union(
  v.literal("add"),
  v.literal("remove"),
  v.literal("update"),
);

export const inventoryOperation = v.union(
  v.literal("item_created"),
  v.literal("stock_added"),
  v.literal("stock_removed"),
  v.literal("quantity_corrected"),
  v.literal("details_updated"),
);

export const inventorySchema = {
  inventorySuppliers: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    createdBy: v.id("users"),
  })
    .index("by_name", ["name"])
    .index("by_normalized_name", ["normalizedName"])
    .searchIndex("search_name", {
      searchField: "name",
    }),

  inventoryItems: defineTable({
    name: v.string(),
    quantity: v.number(),
    supplierId: v.optional(v.id("inventorySuppliers")),
    createdBy: v.id("users"),
  })
    .index("by_name", ["name"])
    .index("by_supplier_id", ["supplierId"])
    .searchIndex("search_name", {
      searchField: "name",
    }),

  inventoryActivities: defineTable({
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
  })
    .index("by_inventory_item_id", ["inventoryItemId"])
    .index("by_action", ["action"])
    .index("by_inventory_item_id_and_action", ["inventoryItemId", "action"]),
};
