import type { UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

type SpaceAccessCtx = Pick<QueryCtx, "db"> & {
  user: UserIdentity;
};

export async function requireSpaceAccess(
  ctx: SpaceAccessCtx,
  spaceId: Id<"newDriveSpaces">,
) {
  const space = await ctx.db.get("newDriveSpaces", spaceId);
  if (!space || (space.visibility === "admin" && ctx.user.role !== "admin")) {
    throw new ConvexError("Space not found");
  }
  return space;
}

export async function requireParentFolder(
  ctx: SpaceAccessCtx,
  spaceId: Id<"newDriveSpaces">,
  parentId?: Id<"newDriveItems">,
) {
  if (!parentId) return;
  const parent = await ctx.db.get("newDriveItems", parentId);
  if (
    !parent ||
    parent.kind !== "folder" ||
    parent.spaceId !== spaceId ||
    parent.deletedAt !== undefined
  ) {
    throw new ConvexError("Destination folder not found");
  }
}

export function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function assertItemName(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 255 || trimmed === "." || trimmed === "..") {
    throw new ConvexError("Item name must be between 1 and 255 characters");
  }
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    throw new ConvexError("Item names cannot contain path separators");
  }
  return trimmed;
}
