import type { Id } from "@convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";

import type { Parent } from "@/types/drive";

export function useGetParentFolder() {
  const { drive } = useParams({ from: "/app/drive/{-$drive}" });
  const parent: Parent = drive ? (drive as Id<"folder">) : "private";
  return parent;
}
