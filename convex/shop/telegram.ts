import { v } from "convex/values";

import { action } from "../_generated/server";

declare const process: {
  env: {
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
  };
};

export const sendOrderTelegramNotification = action({
  args: {
    joNumber: v.number(),
    joUrl: v.string(),
    customerName: v.string(),
    mobile: v.string(),
    email: v.optional(v.string()),
    itemSummary: v.string(),
    estimatedTotal: v.number(),
    artworkSummary: v.string(),
    paymentSummary: v.string(),
    attachmentWarning: v.optional(v.string()),
  },
  returns: v.object({ status: v.union(v.literal("sent"), v.literal("skipped")) }),
  handler: async (_ctx, args) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return { status: "skipped" as const };
    }

    const lines = [
      `New online order request: JO #${args.joNumber}`,
      `Open: ${args.joUrl}`,
      `Customer: ${args.customerName}`,
      `Mobile: ${args.mobile}`,
      args.email ? `Email: ${args.email}` : null,
      `Items: ${args.itemSummary}`,
      `Estimated print total: PHP ${args.estimatedTotal.toFixed(2)}`,
      `Artwork: ${args.artworkSummary}`,
      `Payment: ${args.paymentSummary}`,
      args.attachmentWarning ? `Attachment note: ${args.attachmentWarning}` : null,
    ].filter((line) => line !== null);

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      return { status: "skipped" as const };
    }

    return { status: "sent" as const };
  },
});
