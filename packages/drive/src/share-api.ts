import type { Id } from "@dg/backend/dataModel";
import { makeFunctionReference } from "convex/server";

export type PublicShareItem =
  | {
      _id: Id<"newDriveItems">;
      name: string;
      kind: "folder";
      parentId?: Id<"newDriveItems">;
      updatedAt: number;
      isShareRoot: boolean;
    }
  | {
      _id: Id<"newDriveItems">;
      name: string;
      kind: "file";
      parentId?: Id<"newDriveItems">;
      updatedAt: number;
      contentType: string;
      size: number;
      isShareRoot: boolean;
    };

type Unavailable = { status: "unavailable" };
type AvailableRoot = {
  status: "available";
  access: "read" | "edit";
  item: PublicShareItem;
};
type AvailableItems = {
  status: "available";
  access: "read" | "edit";
  parent: PublicShareItem;
  items: PublicShareItem[];
  breadcrumbs: PublicShareItem[];
  folders: PublicShareItem[];
};
type AvailableFile = {
  status: "available";
  item: PublicShareItem;
  previewable: boolean;
  url?: string;
};

export type ShareSettings =
  | { status: "restricted"; itemKind: "file" | "folder" }
  | {
      status: "shared";
      itemKind: "file" | "folder";
      access: "read" | "edit";
      token: string;
      expiresAt: number | null;
      expired: boolean;
    };

export const shareApi = {
  getShareSettings: makeFunctionReference<
    "query",
    { itemId: Id<"newDriveItems"> },
    ShareSettings
  >("drive/shares:getShareSettings"),
  setShare: makeFunctionReference<
    "mutation",
    {
      itemId: Id<"newDriveItems">;
      access: "read" | "edit";
      expiresAt: number | null;
    },
    { token: string; access: "read" | "edit"; expiresAt: number | null }
  >("drive/shares:setShare"),
  disableShare: makeFunctionReference<"mutation", { itemId: Id<"newDriveItems"> }, null>(
    "drive/shares:disableShare",
  ),
  getSharedRoot: makeFunctionReference<
    "query",
    { token: string },
    Unavailable | AvailableRoot
  >("drive/shares:getSharedRoot"),
  getSharedFolder: makeFunctionReference<
    "query",
    { token: string; folderId: string },
    | Unavailable
    | {
        status: "available";
        access: "read" | "edit";
        folder: PublicShareItem;
      }
  >("drive/shares:getSharedFolder"),
  listSharedItems: makeFunctionReference<
    "query",
    { token: string; parentId?: string },
    Unavailable | AvailableItems
  >("drive/shares:listSharedItems"),
  getSharedFilePreview: makeFunctionReference<
    "query",
    { token: string; itemId: string },
    Unavailable | AvailableFile
  >("drive/shares:getSharedFilePreview"),
  getSharedDownloadUrl: makeFunctionReference<
    "query",
    { token: string; itemId: string },
    Unavailable | AvailableFile
  >("drive/shares:getSharedDownloadUrl"),
  getSharedArchiveManifest: makeFunctionReference<
    "query",
    { token: string; itemId?: string },
    | Unavailable
    | { status: "archiveTooLarge"; maxFiles: number; maxBytes: number }
    | {
        status: "available";
        rootName: string;
        fileCount: number;
        totalSize: number;
        files: { path: string; size: number; url: string }[];
        folders: string[];
      }
  >("drive/shares:getSharedArchiveManifest"),
  createSharedFolder: makeFunctionReference<
    "mutation",
    { token: string; parentId: Id<"newDriveItems">; name: string },
    Id<"newDriveItems">
  >("drive/shares:createSharedFolder"),
  renameSharedItem: makeFunctionReference<
    "mutation",
    { token: string; itemId: Id<"newDriveItems">; name: string },
    null
  >("drive/shares:renameSharedItem"),
  moveSharedItems: makeFunctionReference<
    "mutation",
    {
      token: string;
      itemIds: Id<"newDriveItems">[];
      destinationFolderId: Id<"newDriveItems">;
    },
    boolean
  >("drive/shares:moveSharedItems"),
  deleteSharedItems: makeFunctionReference<
    "mutation",
    { token: string; itemIds: Id<"newDriveItems">[] },
    number
  >("drive/shares:deleteSharedItems"),
  createSharedUploadTicket: makeFunctionReference<
    "mutation",
    {
      token: string;
      parentId: Id<"newDriveItems">;
      name: string;
      contentType: string;
      size: number;
    },
    { ticketId: Id<"newDriveUploadTickets">; url: string }
  >("drive/shares:createSharedUploadTicket"),
  finalizeSharedUpload: makeFunctionReference<
    "action",
    { token: string; ticketId: Id<"newDriveUploadTickets"> },
    Id<"newDriveItems">
  >("drive/sharedUploads:finalizeSharedUpload"),
  cancelSharedUpload: makeFunctionReference<
    "action",
    { token: string; ticketId: Id<"newDriveUploadTickets"> },
    null
  >("drive/sharedUploads:cancelSharedUpload"),
};
