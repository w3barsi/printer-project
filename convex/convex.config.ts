import migrations from "@convex-dev/migrations/convex.config";
import r2 from "@convex-dev/r2/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

import betterAuth from "./betterAuth/convex.config";

const app = defineApp({
  env: {
    VERCEL_URL: v.optional(v.string()),
    TRELLO_KEY: v.optional(v.string()),
    TRELLO_TOKEN: v.optional(v.string()),
    TELEGRAM_BOT_TOKEN: v.optional(v.string()),
    TELEGRAM_CHAT_ID: v.optional(v.string()),
  },
});
app.use(betterAuth);
app.use(migrations);
app.use(r2);

export default app;
