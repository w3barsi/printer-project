import type { Id } from "@dg/backend/dataModel";

export type Parent = "private" | "public" | Id<"folder">;
