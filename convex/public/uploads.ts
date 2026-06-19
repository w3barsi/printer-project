import { v } from "convex/values";

import { action, mutation } from "../_generated/server";
import { r2 } from "../r2";
import { assertAcceptedAttachment, assertAttachmentKind } from "./orderHelpers";

const attachmentKindValidator = v.union(v.literal("artwork"), v.literal("payment-proof"));

export const generateOrderUploadUrl = mutation({
  args: {
    joId: v.id("jo"),
    kind: attachmentKindValidator,
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  returns: v.object({ key: v.string(), url: v.string() }),
  handler: async (ctx, args) => {
    assertAttachmentKind(args.kind);
    assertAcceptedAttachment(args.filename, args.mimeType, args.size);

    const jo = await ctx.db.get(args.joId);
    if (!jo || jo.source !== "online-order") {
      throw new Error("Online order not found");
    }

    const safeName =
      args.filename
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "upload";
    const key = `orders/${args.joId}/${args.kind}/${crypto.randomUUID()}-${safeName}`;

    return await r2.generateUploadUrl(key);
  },
});

export const syncOrderUploadMetadata = action({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.key.startsWith("orders/")) {
      throw new Error("Invalid order upload key");
    }

    await r2.syncMetadata(ctx, args.key);
    return null;
  },
});
