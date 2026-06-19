import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { authedMutation, authedQuery } from "../auth";
import { r2 } from "../r2";
import {
  MAX_ARTWORK_FILES_PER_ITEM,
  MAX_PAYMENT_PROOF_FILES,
  PRODUCT_TYPE,
  TARPAULIN_PRICE_PER_SQFT,
  assertAcceptedAttachment,
  assertArtworkOption,
  assertAttachmentKind,
  assertPaymentMethod,
  assertPositiveDimension,
  assertPositiveIntegerQuantity,
  assertSupportedService,
  calculateAreaSqft,
  calculateLineTotal,
  calculatePiecePrice,
  formatInternalItemName,
  normalizeAndValidatePhilippineMobile,
} from "./orderHelpers";

const artworkOptionValidator = v.union(
  v.literal("upload-now"),
  v.literal("send-later"),
  v.literal("design-requested"),
);

const paymentMethodValidator = v.union(
  v.literal("gcash"),
  v.literal("bank-transfer"),
  v.literal("pay-later"),
);

const attachmentKindValidator = v.union(v.literal("artwork"), v.literal("payment-proof"));

const attachmentUploadStatusValidator = v.union(
  v.literal("none"),
  v.literal("complete"),
  v.literal("partial-failure"),
);

export const createUnconfirmedOrder = mutation({
  args: {
    items: v.array(
      v.object({
        serviceSlug: v.string(),
        width: v.number(),
        height: v.number(),
        quantity: v.number(),
        artworkOption: artworkOptionValidator,
        designInstructions: v.optional(v.string()),
      }),
    ),
    contact: v.object({
      name: v.string(),
      mobile: v.string(),
      email: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
    paymentMethod: paymentMethodValidator,
    paymentProofStatus: v.optional(
      v.union(
        v.literal("not-required"),
        v.literal("pending-upload"),
        v.literal("uploaded"),
        v.literal("missing"),
      ),
    ),
    acceptedTerms: v.boolean(),
    honeypot: v.optional(v.string()),
  },
  returns: v.object({
    joId: v.union(v.id("jo"), v.null()),
    joNumber: v.union(v.number(), v.null()),
    itemMappings: v.array(
      v.object({
        clientIndex: v.number(),
        itemId: v.id("items"),
        onlineOrderItemId: v.id("onlineOrderItems"),
      }),
    ),
    estimatedTotal: v.number(),
    honeypot: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (args.honeypot?.trim()) {
      return {
        joId: null,
        joNumber: null,
        itemMappings: [],
        estimatedTotal: 0,
        honeypot: true,
      };
    }

    if (args.items.length === 0) {
      throw new Error("Add at least one item");
    }

    const customerName = args.contact.name.trim();
    if (!customerName) {
      throw new Error("Customer name is required");
    }

    if (!args.acceptedTerms) {
      throw new Error("Terms must be accepted");
    }

    assertPaymentMethod(args.paymentMethod);
    const mobile = normalizeAndValidatePhilippineMobile(args.contact.mobile);
    const submittedAt = Date.now();
    const normalizedItems = args.items.map((item) => {
      assertSupportedService(item.serviceSlug);
      assertPositiveDimension(item.width, "Width");
      assertPositiveDimension(item.height, "Height");
      assertPositiveIntegerQuantity(item.quantity);
      assertArtworkOption(item.artworkOption);

      return {
        ...item,
        areaSqft: calculateAreaSqft(item.width, item.height),
        piecePrice: calculatePiecePrice(item.width, item.height),
        lineTotal: calculateLineTotal(item.width, item.height, item.quantity),
        name: formatInternalItemName(item.width, item.height),
      };
    });

    const estimatedTotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const lastJoNumber = await ctx.db
      .query("jo")
      .withIndex("by_joNumber")
      .order("desc")
      .first();
    const joNumber = lastJoNumber ? lastJoNumber.joNumber + 1 : 1;

    const joId = await ctx.db.insert("jo", {
      joNumber,
      name: customerName,
      contactNumber: mobile,
      status: "unconfirmed",
      source: "online-order",
      submittedAt,
      updatedAt: submittedAt,
    });

    const paymentProofStatus =
      args.paymentProofStatus ??
      (args.paymentMethod === "pay-later" ? "not-required" : "pending-upload");

    await ctx.db.insert("onlineOrderDetails", {
      joId,
      customerName,
      mobile,
      email: normalizeOptionalString(args.contact.email),
      notes: normalizeOptionalString(args.contact.notes),
      paymentMethod: args.paymentMethod,
      paymentProofStatus,
      attachmentUploadStatus: "none",
      acceptedTerms: true,
      termsAcceptedAt: submittedAt,
      submittedAt,
    });

    const itemMappings = [];
    for (const [clientIndex, item] of normalizedItems.entries()) {
      const itemId = await ctx.db.insert("items", {
        joId,
        name: item.name,
        quantity: item.quantity,
        price: item.piecePrice,
      });

      const onlineOrderItemId = await ctx.db.insert("onlineOrderItems", {
        joId,
        itemId,
        serviceSlug: item.serviceSlug,
        productType: PRODUCT_TYPE,
        width: item.width,
        height: item.height,
        areaSqft: item.areaSqft,
        unitPricePerSqft: TARPAULIN_PRICE_PER_SQFT,
        artworkOption: item.artworkOption,
        designInstructions: normalizeOptionalString(item.designInstructions),
      });

      itemMappings.push({ clientIndex, itemId, onlineOrderItemId });
    }

    return { joId, joNumber, itemMappings, estimatedTotal, honeypot: false };
  },
});

export const saveOrderAttachment = mutation({
  args: {
    joId: v.id("jo"),
    itemId: v.optional(v.id("items")),
    onlineOrderItemId: v.optional(v.id("onlineOrderItems")),
    kind: attachmentKindValidator,
    key: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  returns: v.id("orderAttachments"),
  handler: async (ctx, args) => {
    assertAttachmentKind(args.kind);
    assertAcceptedAttachment(args.filename, args.mimeType, args.size);

    const jo = await ctx.db.get(args.joId);
    if (!jo || jo.source !== "online-order") {
      throw new Error("Online order not found");
    }

    if (args.kind === "artwork") {
      await validateArtworkAttachmentTarget(ctx, args);
    } else {
      await validatePaymentProofAttachmentLimit(ctx, args.joId);
    }

    return await ctx.db.insert("orderAttachments", {
      joId: args.joId,
      itemId: args.itemId,
      onlineOrderItemId: args.onlineOrderItemId,
      kind: args.kind,
      key: args.key,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      createdAt: Date.now(),
    });
  },
});

export const markAttachmentUploadStatus = mutation({
  args: {
    joId: v.id("jo"),
    status: attachmentUploadStatusValidator,
    paymentProofStatus: v.optional(
      v.union(
        v.literal("not-required"),
        v.literal("pending-upload"),
        v.literal("uploaded"),
        v.literal("missing"),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const details = await ctx.db
      .query("onlineOrderDetails")
      .withIndex("by_joId", (q) => q.eq("joId", args.joId))
      .unique();

    if (!details) {
      throw new Error("Online order details not found");
    }

    await ctx.db.patch(details._id, {
      attachmentUploadStatus: args.status,
      paymentProofStatus: args.paymentProofStatus ?? details.paymentProofStatus,
    });

    return null;
  },
});

export const getOnlineOrderDetails = authedQuery({
  args: { joId: v.id("jo") },
  returns: v.union(
    v.null(),
    v.object({
      details: v.any(),
      items: v.array(v.any()),
      attachments: v.array(v.any()),
    }),
  ),
  handler: async (ctx, args) => {
    const jo = await ctx.db.get(args.joId);
    if (!jo || jo.source !== "online-order") {
      return null;
    }

    const details = await ctx.db
      .query("onlineOrderDetails")
      .withIndex("by_joId", (q) => q.eq("joId", args.joId))
      .unique();

    if (!details) {
      return null;
    }

    const items = await ctx.db
      .query("onlineOrderItems")
      .withIndex("by_joId", (q) => q.eq("joId", args.joId))
      .collect();
    const attachments = await ctx.db
      .query("orderAttachments")
      .withIndex("by_joId", (q) => q.eq("joId", args.joId))
      .collect();

    return { details, items, attachments };
  },
});

export const getOrderAttachmentUrl = authedQuery({
  args: { attachmentId: v.id("orderAttachments") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) {
      return null;
    }

    const jo = await ctx.db.get(attachment.joId);
    if (!jo || jo.source !== "online-order") {
      return null;
    }

    return await r2.getUrl(attachment.key, { expiresIn: 15 * 60 });
  },
});

export const confirmOnlineOrder = authedMutation({
  args: { joId: v.id("jo") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const jo = await ctx.db.get(args.joId);
    if (!jo) {
      throw new Error("JO not found");
    }

    if (jo.status !== "unconfirmed") {
      throw new Error("Only unconfirmed online orders can be confirmed");
    }

    await ctx.db.patch(args.joId, {
      status: "pending",
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.trello.createTrelloCard, {
      joId: args.joId,
    });

    return null;
  },
});

function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

async function validateArtworkAttachmentTarget(
  ctx: MutationCtx,
  args: {
    joId: Id<"jo">;
    itemId?: Id<"items">;
    onlineOrderItemId?: Id<"onlineOrderItems">;
  },
) {
  if (!args.itemId || !args.onlineOrderItemId) {
    throw new Error("Artwork attachments require an item target");
  }

  const item = await ctx.db.get(args.itemId);
  const onlineOrderItem = await ctx.db.get(args.onlineOrderItemId);
  if (
    !item ||
    !onlineOrderItem ||
    item.joId !== args.joId ||
    onlineOrderItem.joId !== args.joId ||
    onlineOrderItem.itemId !== args.itemId
  ) {
    throw new Error("Attachment target does not belong to this order");
  }

  const existing = await ctx.db
    .query("orderAttachments")
    .withIndex("by_onlineOrderItemId", (q) =>
      q.eq("onlineOrderItemId", args.onlineOrderItemId),
    )
    .take(MAX_ARTWORK_FILES_PER_ITEM);

  const artworkCount = existing.filter(
    (attachment) => attachment.kind === "artwork",
  ).length;
  if (artworkCount >= MAX_ARTWORK_FILES_PER_ITEM) {
    throw new Error("Too many artwork files for this item");
  }
}

async function validatePaymentProofAttachmentLimit(ctx: MutationCtx, joId: Id<"jo">) {
  const existing = await ctx.db
    .query("orderAttachments")
    .withIndex("by_joId", (q) => q.eq("joId", joId))
    .take(25);

  const paymentProofCount = existing.filter(
    (attachment) => attachment.kind === "payment-proof",
  ).length;
  if (paymentProofCount >= MAX_PAYMENT_PROOF_FILES) {
    throw new Error("Only one payment proof file is allowed");
  }
}
