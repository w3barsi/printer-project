import { v } from "convex/values";

export const pricingItemListItemValidator = v.object({
  _id: v.id("printPricingItems"),
  _creationTime: v.number(),
  name: v.string(),
  normalizedName: v.string(),
  notes: v.optional(v.string()),
  createdBy: v.id("users"),
  createdByName: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  latestTotal: v.optional(v.number()),
  latestCalculatedAt: v.optional(v.number()),
  groupId: v.optional(v.id("printPricingGroups")),
});
