import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { AddItemsMenu } from "@dg/drive/components/add-items-menu";
import { DriveFileList } from "@dg/drive/components/file-list";
import { DriveUploadDropzone } from "@dg/drive/components/upload-dropzone";
import { downloadDriveItems } from "@dg/drive/download-drive-item";
import type { DriveItem, DriveShareItem } from "@dg/drive/types";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useConvex, useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { FolderOpenIcon } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { ShareDialog } from "@/components/drive/share-dialog";
import { TrelloAttachmentMenu } from "@/components/drive/trello-attachment-menu";
import { Container } from "@/components/layouts/container";
import { useDriveUpload } from "@/hooks/use-drive-upload";

export const Route = createFileRoute("/_authenticated/drive/$spaceId/{-$folderId}")({
  component: SpaceBrowserPage,
  validateSearch: z.object({
    q: z.string().optional(),
    scope: z.enum(["local", "global"]).optional(),
  }),
  loader: async ({ context: { queryClient: qc }, params }) => {
    const spaceId = params.spaceId as Id<"driveSpaces">;
    const folderId = params.folderId as Id<"driveItems"> | undefined;
    const [spaces, folder] = await Promise.all([
      qc.ensureQueryData(convexQuery(api.drive.spaces.list, {})),
      folderId
        ? qc.ensureQueryData(
            convexQuery(api.drive.items.getFolder, {
              spaceId,
              folderId,
            }),
          )
        : undefined,
      qc.ensureQueryData(
        convexQuery(api.drive.items.listItems, {
          spaceId,
          parentId: folderId,
        }),
      ),
    ]);
    const space = spaces.find((item) => item._id === params.spaceId);
    const parentFolder = folder?.parentId
      ? await qc.ensureQueryData(
          convexQuery(api.drive.items.getFolder, {
            spaceId,
            folderId: folder.parentId,
          }),
        )
      : null;

    return {
      space,
      folder,
      parentFolder,
      crumb: [
        { value: "Drive", href: "/drive", type: "static" },
        {
          value: space?.name ?? "Space",
          href: `/drive/${params.spaceId}`,
          type: "static",
        },
        ...(folder
          ? [
              {
                value: folder.name,
                href: `/drive/${params.spaceId}/${folder._id}`,
                type: "static",
              },
            ]
          : []),
      ],
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.folder?.name ?? loaderData?.space?.name ?? "Space"} | DG` },
    ],
  }),
});

function SpaceBrowserPage() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const navigate = useNavigate();
  const { spaceId, folderId } = Route.useParams();
  const search = Route.useSearch();
  const { space, folder, parentFolder } = Route.useLoaderData();
  const convex = useConvex();
  const typedSpaceId = spaceId as Id<"driveSpaces">;
  const typedFolderId = folderId as Id<"driveItems"> | undefined;
  const { data } = useSuspenseQuery(
    convexQuery(api.drive.items.listItems, {
      spaceId: typedSpaceId,
      parentId: typedFolderId,
    }),
  );
  const deleteItems = useMutation(api.drive.items.deleteItems);
  const moveItems = useMutation(api.drive.items.moveItems);
  const renameItem = useMutation(api.drive.items.renameItem);
  const createFolder = useMutation(api.drive.items.createFolder);
  const { upload, isUploading } = useDriveUpload(typedSpaceId, typedFolderId);
  const [shareItem, setShareItem] = useState<DriveShareItem | null>(null);
  const searchText = search.q ?? "";
  const searchMode = search.scope ?? "local";
  function setSearchText(value: string) {
    void navigate({
      search: (previous) => ({ ...previous, q: value || undefined }),
      replace: true,
    });
  }
  function setSearchMode(mode: "local" | "global") {
    void navigate({
      search: (previous) => ({
        ...previous,
        scope: mode === "local" ? undefined : mode,
      }),
      replace: true,
    });
  }
  const deferredSearch = useDeferredValue(searchText);
  const trimmedSearch = searchText.trim();
  const trimmedDeferredSearch = deferredSearch.trim();
  const isGlobalMode = searchMode === "global";
  const isGlobalSearchActive = isGlobalMode && trimmedDeferredSearch !== "";
  const globalSearch = useQuery({
    ...convexQuery(api.drive.items.searchItems, {
      spaceId: typedSpaceId,
      parentId: typedFolderId,
      query: trimmedDeferredSearch,
    }),
    enabled: isGlobalSearchActive,
    placeholderData: (previousData) => previousData,
  });
  // Local search filters the route's currently loaded items, presently capped
  // at 500 by listItems. Paginate the folder listing and local search together
  // if folders later need more than 500 immediate children.
  const normalizedSearch = trimmedSearch.toLowerCase();
  const localRows =
    !isGlobalMode && trimmedSearch
      ? data.filter((item) => item.name.toLowerCase().includes(normalizedSearch))
      : data;
  const displayedRows =
    isGlobalSearchActive && globalSearch.data ? globalSearch.data : localRows;
  const items: DriveItem[] = displayedRows.map((item) => ({
    id: item._id,
    name: item.name,
    kind:
      item.kind === "folder"
        ? "folder"
        : item.r2.contentType.startsWith("image/")
          ? "image"
          : item.r2.contentType === "application/pdf" || item.name.endsWith(".pdf")
            ? "pdf"
            : "text",
    owner: item.createdBy === user.actorId ? "You" : item.ownerName,
    updated: formatDistanceToNow(item.updatedAt, { addSuffix: true }),
    size: item.kind === "file" ? formatFileSize(item.r2.size) : "-",
    access:
      item.publicAccess === "edit"
        ? "Editors"
        : item.publicAccess === "read"
          ? "Viewers"
          : "Restricted",
    spaceId,
    parentId: item.parentId ?? null,
  }));
  const title = folder?.name ?? space?.name ?? "Space";

  async function downloadItems(items: Array<Pick<DriveItem, "id" | "kind">>) {
    const toastId = toast.loading("Download in progress");
    try {
      const manifests = await Promise.all(
        items.map((item) =>
          convex.query(api.drive.items.getDownloadManifest, {
            itemId: item.id as Id<"driveItems">,
          }),
        ),
      );
      await downloadDriveItems(manifests);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      toast.dismiss(toastId);
    }
  }

  function downloadItem(item: Pick<DriveItem, "id" | "kind">) {
    return downloadItems([item]);
  }

  function openItem(item: DriveItem) {
    if (item.kind === "folder") {
      void navigate({
        to: "/drive/$spaceId/{-$folderId}",
        params: { spaceId: item.spaceId, folderId: item.id },
      });
      return;
    }
    void navigate({
      to: "/drive/file/$itemId",
      params: { itemId: item.id },
    });
  }

  return (
    <DriveUploadDropzone upload={upload}>
      <Container className="flex flex-col">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FolderOpenIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
            </div>
          </div>
        </div>

        <DriveFileList
          key={`${spaceId}:${folderId ?? "root"}`}
          items={items}
          title="Files and folders"
          searchValue={searchText}
          onSearchChange={setSearchText}
          searchPlaceholder={typedFolderId ? "Search this folder" : "Search this space"}
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          isSearchPending={isGlobalSearchActive && globalSearch.isFetching}
          headerActions={
            <AddItemsMenu
              upload={upload}
              isUploading={isUploading}
              onCreateFolder={(name) =>
                createFolder({ spaceId: typedSpaceId, parentId: typedFolderId, name })
              }
              onDownloadFolder={
                folderId
                  ? () =>
                      void downloadItem({
                        id: folderId,
                        kind: "folder",
                      })
                  : undefined
              }
              onShareFolder={
                folderId
                  ? () =>
                      setShareItem({
                        id: folderId,
                        name: folder?.name ?? title,
                        kind: "folder",
                      })
                  : undefined
              }
            />
          }
          interactive
          onOpenItem={openItem}
          parentPath={
            folder
              ? {
                  spaceId,
                  name: parentFolder?.name ?? space?.name ?? "Space",
                  folderId: folder.parentId ?? null,
                }
              : undefined
          }
          onOpenParent={
            folder
              ? () =>
                  void navigate({
                    to: "/drive/$spaceId/{-$folderId}",
                    params: {
                      spaceId,
                      folderId: folder.parentId ?? undefined,
                    },
                  })
              : undefined
          }
          onDeleteItems={(itemIds) =>
            deleteItems({
              spaceId: typedSpaceId,
              itemIds: itemIds as Id<"driveItems">[],
            }).then(() => undefined)
          }
          onDownloadItem={downloadItem}
          onDownloadItems={downloadItems}
          onMoveItems={(itemIds, destinationFolderId) =>
            moveItems({
              spaceId: typedSpaceId,
              itemIds: itemIds as Id<"driveItems">[],
              destinationFolderId: destinationFolderId as Id<"driveItems"> | null,
            })
          }
          onRenameItem={(itemId, name) =>
            renameItem({
              spaceId: typedSpaceId,
              itemId: itemId as Id<"driveItems">,
              name,
            }).then(() => undefined)
          }
          onShareItem={setShareItem}
          renderItemActions={(item, { keepMenuOpen }) => (
            <TrelloAttachmentMenu item={item} onDetachStart={keepMenuOpen} />
          )}
        />
        <ShareDialog
          item={shareItem}
          onOpenChange={(open) => !open && setShareItem(null)}
        />
      </Container>
    </DriveUploadDropzone>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
}
