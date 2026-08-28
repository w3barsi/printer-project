import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { r2 } from "../r2";

export const finalizeSharedUpload = action({
  args: { token: v.string(), ticketId: v.id("driveUploadTickets") },
  returns: v.id("driveItems"),
  handler: async (ctx, args): Promise<Id<"driveItems">> => {
    const ticket = await ctx.runQuery(
      internal.drive.shares.getAuthorizedGuestUploadTicket,
      args,
    );
    await r2.syncMetadata(ctx, ticket.key);
    const metadata = await r2.getMetadata(ctx, ticket.key);
    if (!metadata || metadata.size === undefined) {
      throw new ConvexError("Uploaded file metadata is unavailable");
    }
    return await ctx.runMutation(internal.drive.shares.completeSharedUpload, {
      ...args,
      contentType: metadata.contentType ?? ticket.declaredContentType,
      size: metadata.size,
      sha256: metadata.sha256,
    });
  },
});

export const cancelSharedUpload = action({
  args: { token: v.string(), ticketId: v.id("driveUploadTickets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await ctx.runMutation(
      internal.drive.shares.removeAuthorizedSharedUploadTicket,
      args,
    );
    await r2.deleteObject(ctx, key);
    return null;
  },
});
