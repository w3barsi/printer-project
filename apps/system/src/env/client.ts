import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_CONVEX_URL: z.url(),
    VITE_CONVEX_SITE_URL: z.url(),
    VITE_FLAG_SIGNUP: z
      .string()
      .refine((value) => value === "true" || value === "false")
      .transform((value) => value === "true"),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
