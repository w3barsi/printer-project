import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { FolderOpenIcon } from "lucide-react";

import { Container } from "@/components/layouts/container";
import { AddItemsMenu } from "@/components/new-drive/add-items-menu";
import { NewDriveFileList } from "@/components/new-drive/file-list";
import { NewDriveUploadDropzone } from "@/components/new-drive/upload-dropzone";
import type { NewDriveItem } from "@/lib/new-drive-items";

export const Route = createFileRoute("/app/newdrive/$spaceId/{-$folderId}")({
  component: SpaceBrowserPage,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const spaces = await qc.ensureQueryData(convexQuery(api.spaces.list, {}));
    const space = spaces.find((item) => item._id === params.spaceId);
    const folder = params.folderId
      ? await qc.ensureQueryData(
          convexQuery(api.newDrive.getFolder, {
            spaceId: params.spaceId as Id<"newDriveSpaces">,
            folderId: params.folderId as Id<"newDriveItems">,
          }),
        )
      : undefined;

    return {
      space,
      folder,
      crumb: [
        { value: "New Drive", href: "/app/newdrive", type: "static" },
        {
          value: space?.name ?? "Space",
          href: `/app/newdrive/${params.spaceId}`,
          type: "static",
        },
        ...(folder
          ? [
              {
                value: folder.name,
                href: `/app/newdrive/${params.spaceId}/${folder._id}`,
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
  const { user } = useRouteContext({ from: "/app" });
  const { spaceId, folderId } = Route.useParams();
  const { space, folder } = Route.useLoaderData();
  const typedSpaceId = spaceId as Id<"newDriveSpaces">;
  const typedFolderId = folderId as Id<"newDriveItems"> | undefined;
  const { data } = useSuspenseQuery(
    convexQuery(api.newDrive.listItems, {
      spaceId: typedSpaceId,
      parentId: typedFolderId,
    }),
  );
  const deleteItems = useMutation(api.newDrive.deleteItems);
  const items: NewDriveItem[] = data.map((item) => ({
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
    owner: item.createdBy === user.userId ? "You" : item.ownerName,
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

  return (
    <NewDriveUploadDropzone spaceId={typedSpaceId} parentId={typedFolderId}>
      <Container className="flex min-h-[calc(100svh-4.1rem)] max-w-7xl flex-col gap-6 px-3 py-5 md:px-6 md:py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FolderOpenIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
              <p className="truncate text-sm text-muted-foreground">
                {folder ? `Inside ${space?.name ?? "space"}` : space?.description}
              </p>
            </div>
          </div>
          <AddItemsMenu spaceId={typedSpaceId} parentId={typedFolderId} />
        </div>

        <NewDriveFileList
          key={`${spaceId}:${folderId ?? "root"}`}
          items={items}
          title="Files and folders"
          interactive
          onDeleteItems={(itemIds) =>
            deleteItems({
              spaceId: typedSpaceId,
              itemIds: itemIds as Id<"newDriveItems">[],
            }).then(() => undefined)
          }
        />
      </Container>
    </NewDriveUploadDropzone>
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
