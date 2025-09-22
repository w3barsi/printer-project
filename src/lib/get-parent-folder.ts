import type { Parent } from "@/components/ui/upload-dropzone";
import type { Id } from "@convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";

export function useGetParentFolder() {
  const { drive } = useParams({ from: "/(main)/drive/{-$drive}" });
  const parent: Parent = drive ? (drive as Id<"folder">) : "private";
  return parent;
}
