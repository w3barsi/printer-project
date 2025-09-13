import { env } from "@/env/server";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { handleRequest, route, type Router } from "better-upload/server";
import { cloudflare } from "better-upload/server/helpers";

const client = cloudflare({
  accountId: env.CLOUDFLARE_ACCOUNT_ID,
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
});

const router: Router = {
  client,
  bucketName: "dg-system",
  routes: {
    drive: route({
      fileTypes: ["image/*", "video/*", "audio/*", "application/*", "text/*"],
      multipleFiles: true,
      maxFiles: 50,
      maxFileSize: 1024 * 1024 * 5000,
    }),
  },
};

export const ServerRoute = createServerFileRoute("/api/upload").methods({
  POST: async ({ request }) => {
    return handleRequest(request, router);
  },
});
