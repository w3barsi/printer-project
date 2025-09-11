import { env } from "@/env/server";
import { createServerFn } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { handleRequest, route, type Router } from "better-upload/server";
import { cloudflare } from "better-upload/server/helpers";
import z from "zod";

const client = cloudflare({
  accountId: env.CLOUDFLARE_ACCOUNT_ID,
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
});

export const deleteFromR2 = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ key: z.string().min(1) }).parse(data))
  .handler(async (ctx) => {
    const { key } = ctx.data;
    const url = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/dg-system/${key}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${env.R2_TOKEN_VALUE}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete file from R2: ${response.statusText}`);
    }

    return { success: true };
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
