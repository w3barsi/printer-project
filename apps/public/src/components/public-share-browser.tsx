import type { Id } from "@dg/backend/dataModel";
import { AddItemsMenu } from "@dg/drive/components/add-items-menu";
import { NewDriveFileList } from "@dg/drive/components/file-list";
import { NewDriveUploadDropzone } from "@dg/drive/components/upload-dropzone";
import {
  downloadDriveItem,
  downloadDriveItems,
  type DownloadManifest,
} from "@dg/drive/download-drive-item";
import { downloadSharedFolder } from "@dg/drive/download-shared-folder";
import { shareApi, type PublicShareItem } from "@dg/drive/share-api";
import type { NewDriveItem } from "@dg/drive/types";
import { useNewDriveUploadWithOperations } from "@dg/drive/use-upload";
import { Badge } from "@dg/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@dg/ui/components/breadcrumb";
import { Button } from "@dg/ui/components/button";
import { Progress } from "@dg/ui/components/progress";
import { Spinner } from "@dg/ui/components/spinner";
import { useNavigate } from "@tanstack/react-router";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileIcon,
  FolderOpenIcon,
  LockKeyholeIcon,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function PublicShareBrowser({
  token,
  itemId,
}: {
  token: string;
  itemId?: string;
}) {
  const navigate = useNavigate();
  const convex = useConvex();
  const root = useQuery(shareApi.getSharedRoot, { token });
  const requestedId = itemId as Id<"driveItems"> | undefined;
  const rootItemId = root?.status === "available" ? root.item._id : undefined;
  const currentId = requestedId ?? rootItemId;
  const folder = useQuery(
    shareApi.listSharedItems,
    root?.status === "available" && root.item.kind === "folder" && currentId
      ? { token, parentId: currentId }
      : "skip",
  );
  const file = useQuery(
    shareApi.getSharedFilePreview,
    root?.status === "available" &&
      currentId &&
      (root.item.kind === "file" || requestedId)
      ? { token, itemId: currentId }
      : "skip",
  );
  const createFolder = useMutation(shareApi.createSharedFolder);
  const createTicket = useMutation(shareApi.createSharedUploadTicket);
  const finalizeUpload = useAction(shareApi.finalizeSharedUpload);
  const cancelUpload = useAction(shareApi.cancelSharedUpload);
  const renameItem = useMutation(shareApi.renameSharedItem);
  const moveItems = useMutation(shareApi.moveSharedItems);
  const deleteItems = useMutation(shareApi.deleteSharedItems);
  const uploadParent = folder?.status === "available" ? folder.parent._id : undefined;
  const { upload, isUploading } = useNewDriveUploadWithOperations(uploadParent, {
    createFolder: ({ parentId, name }) => {
      if (!parentId) return Promise.reject(new Error("Shared folder unavailable"));
      return createFolder({ token, parentId, name });
    },
    createUploadTicket: ({ parentId, ...args }) => {
      if (!parentId) return Promise.reject(new Error("Shared folder unavailable"));
      return createTicket({ token, parentId, ...args });
    },
    finalizeUpload: ({ ticketId }) => finalizeUpload({ token, ticketId }),
    cancelUpload: ({ ticketId }) => cancelUpload({ token, ticketId }),
  });

  function openItem(item: NewDriveItem) {
    void navigate({
      to: "/share/$token/{-$itemId}",
      params: { token, itemId: item.id },
    });
  }

  async function getDownloadManifest(
    item: Pick<NewDriveItem, "id" | "kind">,
  ): Promise<DownloadManifest> {
    if (item.kind === "folder") {
      const manifest = await convex.query(shareApi.getSharedArchiveManifest, {
        token,
        itemId: item.id,
      });
      if (manifest.status === "unavailable") {
        throw new Error("This shared folder is unavailable");
      }
      return manifest.status === "available" ? { ...manifest, kind: "folder" } : manifest;
    }

    const result = await convex.query(shareApi.getSharedDownloadUrl, {
      token,
      itemId: item.id,
    });
    if (result.status !== "available" || !result.url) {
      throw new Error("This shared file is unavailable");
    }
    return {
      status: "available",
      kind: "file",
      rootName: result.item.name,
      files: [
        {
          path: result.item.name,
          size: result.item.kind === "file" ? result.item.size : 0,
          url: result.url,
        },
      ],
      folders: [],
    };
  }

  async function downloadItems(items: Array<Pick<NewDriveItem, "id" | "kind">>) {
    const toastId = toast.loading("Download in progress");
    try {
      const manifests = await Promise.all(items.map(getDownloadManifest));
      await downloadDriveItems(manifests);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      toast.dismiss(toastId);
    }
  }

  function downloadItem(item: Pick<NewDriveItem, "id" | "kind">) {
    return downloadItems([item]);
  }

  const nestedItemLoading =
    !!requestedId &&
    root?.status === "available" &&
    root.item.kind === "folder" &&
    (folder === undefined || file === undefined);
  if (
    root === undefined ||
    nestedItemLoading ||
    (root?.status === "available" && !requestedId && !folder && !file)
  ) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (
    root.status === "unavailable" ||
    (folder?.status === "unavailable" && file?.status !== "available") ||
    (file?.status === "unavailable" && folder?.status !== "available")
  ) {
    return <UnavailableShare />;
  }
  if (file?.status === "available" && file.item.kind === "file") {
    return <PublicFile token={token} access={root.access} file={file} />;
  }
  if (!folder || folder.status !== "available" || folder.parent.kind !== "folder")
    return <UnavailableShare />;

  const canEdit = folder.access === "edit";
  const items = folder.items.map(toViewItem);
  const parent = folder.parent;
  const moveDestinations = folder.folders.reduce<Array<{ id: string; name: string }>>(
    (destinations, item) => {
      if (item.kind === "folder") destinations.push({ id: item._id, name: item.name });
      return destinations;
    },
    [],
  );
  const content = (
    <main
      data-slot="container"
      className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 px-3 py-5 md:px-6 md:py-7"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FolderOpenIcon />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight">
                {parent.name}
              </h1>
              <Badge variant="secondary">{canEdit ? "Editor" : "Viewer"}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Shared publicly</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <DownloadAllButton token={token} />
        </div>
      </header>
      <Breadcrumb>
        <BreadcrumbList>
          {folder.breadcrumbs.map((breadcrumb, index) => (
            <Fragment key={breadcrumb._id}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {breadcrumb._id === parent._id ? (
                  <BreadcrumbPage>{breadcrumb.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={<button type="button" />}
                    onClick={() =>
                      void navigate({
                        to: "/share/$token/{-$itemId}",
                        params: {
                          token,
                          itemId: breadcrumb.isShareRoot ? undefined : breadcrumb._id,
                        },
                      })
                    }
                  >
                    {breadcrumb.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <NewDriveFileList
        key={parent._id}
        items={items}
        title="Shared files and folders"
        headerActions={
          canEdit ? (
            <AddItemsMenu
              upload={upload}
              isUploading={isUploading}
              onCreateFolder={(name) =>
                createFolder({ token, parentId: parent._id, name })
              }
              onDownloadFolder={() =>
                void downloadItem({ id: parent._id, kind: "folder" })
              }
            />
          ) : undefined
        }
        interactive
        publicSafe
        onOpenItem={openItem}
        onDownloadItem={downloadItem}
        onDownloadItems={downloadItems}
        parentPath={
          !parent.isShareRoot
            ? {
                spaceId: "public",
                name: "Parent folder",
                folderId: parent.parentId ?? null,
              }
            : undefined
        }
        onOpenParent={
          !parent.isShareRoot && parent.parentId
            ? () =>
                void navigate({
                  to: "/share/$token/{-$itemId}",
                  params: { token, itemId: parent.parentId },
                })
            : undefined
        }
        onRenameItem={
          canEdit
            ? (id, name) =>
                renameItem({ token, itemId: id as Id<"driveItems">, name }).then(
                  () => undefined,
                )
            : undefined
        }
        onMoveItems={
          canEdit
            ? (ids, destinationFolderId) =>
                destinationFolderId
                  ? moveItems({
                      token,
                      itemIds: ids as Id<"driveItems">[],
                      destinationFolderId: destinationFolderId as Id<"driveItems">,
                    })
                  : false
            : undefined
        }
        onDeleteItems={
          canEdit
            ? (ids) =>
                deleteItems({ token, itemIds: ids as Id<"driveItems">[] }).then(
                  () => undefined,
                )
            : undefined
        }
        moveDestinations={canEdit ? moveDestinations : undefined}
        deleteDescription={
          canEdit ? "This change affects everyone using this link." : undefined
        }
      />
    </main>
  );
  return canEdit ? (
    <NewDriveUploadDropzone upload={upload}>{content}</NewDriveUploadDropzone>
  ) : (
    content
  );
}

function PublicFile({
  token,
  access,
  file,
}: {
  token: string;
  access: "read" | "edit";
  file: { item: PublicShareItem; previewable: boolean; url?: string };
}) {
  const convex = useConvex();
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadRequest = useRef(0);
  if (file.item.kind !== "file") return null;
  const fileSize = file.item.size;
  async function download() {
    const request = ++downloadRequest.current;
    setIsDownloading(true);
    try {
      const result = await convex.query(shareApi.getSharedDownloadUrl, {
        token,
        itemId: file.item._id,
      });
      if (result.status !== "available" || !result.url)
        throw new Error("This shared item is unavailable");
      await downloadDriveItem({
        status: "available",
        kind: "file",
        rootName: file.item.name,
        files: [{ path: file.item.name, size: fileSize, url: result.url }],
        folders: [],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      if (downloadRequest.current === request) setIsDownloading(false);
    }
  }
  return (
    <div className="min-h-svh bg-muted/25">
      <div className="mx-auto flex min-h-svh w-full max-w-[1500px] flex-col px-3 py-3 md:px-5 md:py-5">
        <main className="grid min-h-[calc(100svh-1.5rem)] gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="flex flex-col rounded-xl border bg-card p-5">
            <Button
              variant="outline"
              className="w-fit"
              onClick={() =>
                void navigate({
                  to: "/share/$token/{-$itemId}",
                  params: { token, itemId: file.item.parentId },
                })
              }
            >
              <ArrowLeftIcon data-icon="inline-start" />
              {file.item.parentId ? "Parent folder" : "Shared item"}
            </Button>
            <div className="mt-8">
              <Badge variant="secondary">{access === "edit" ? "Editor" : "Viewer"}</Badge>
              <h1 className="mt-3 text-2xl font-semibold break-words">
                {file.item.name}
              </h1>
            </div>
            <dl className="mt-8 flex flex-col gap-4 text-sm">
              <Metadata label="Type" value={file.item.contentType} />
              <Metadata label="Size" value={formatFileSize(file.item.size)} />
              <Metadata
                label="Modified"
                value={format(file.item.updatedAt, "MMM d, yyyy, h:mm a")}
              />
            </dl>
            <Button
              className="mt-8 lg:mt-auto"
              disabled={isDownloading}
              onClick={() => void download()}
            >
              {isDownloading ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <DownloadIcon data-icon="inline-start" />
              )}
              Download
            </Button>
          </aside>
          <section className="flex min-h-[60svh] items-center justify-center overflow-hidden rounded-xl border bg-muted/35 p-4">
            {file.previewable && file.url ? (
              file.item.contentType.startsWith("image/") ? (
                <img
                  src={file.url}
                  alt={file.item.name}
                  className="max-h-[90svh] max-w-full rounded-lg object-contain"
                />
              ) : file.item.contentType.startsWith("audio/") ? (
                <audio controls src={file.url} className="w-full max-w-2xl" />
              ) : file.item.contentType.startsWith("video/") ? (
                <video controls src={file.url} className="max-h-[85svh] max-w-full" />
              ) : (
                <iframe
                  src={file.url}
                  title={`Preview of ${file.item.name}`}
                  sandbox="allow-same-origin"
                  className="h-[75svh] w-full rounded-lg border bg-background"
                />
              )
            ) : (
              <div className="max-w-sm text-center">
                <FileIcon className="mx-auto" />
                <h2 className="mt-4 text-lg font-semibold">Preview unavailable</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Download this file to view it.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function DownloadAllButton({ token }: { token: string }) {
  const convex = useConvex();
  const [progress, setProgress] = useState<number | null>(null);
  const abortController = useRef<AbortController | null>(null);
  useEffect(() => () => abortController.current?.abort(), []);
  async function download() {
    const controller = new AbortController();
    abortController.current = controller;
    setProgress(0);
    try {
      const manifest = await convex.query(shareApi.getSharedArchiveManifest, { token });
      if (manifest.status === "archiveTooLarge")
        throw new Error("Download all is limited to 500 files and 250 MiB");
      if (manifest.status !== "available")
        throw new Error("This shared item is unavailable");
      await downloadSharedFolder(
        manifest.rootName,
        manifest.files,
        (done, total) => {
          if (abortController.current === controller) {
            setProgress(total === 0 ? 100 : Math.round((done / total) * 100));
          }
        },
        controller.signal,
        manifest.folders,
      );
      if (abortController.current === controller) {
        setProgress(100);
        toast.success("Archive downloaded");
      }
    } catch (error) {
      if (controller.signal.aborted) toast.info("Archive download cancelled");
      else
        toast.error(
          error instanceof Error ? error.message : "Archive could not be created",
        );
    } finally {
      if (abortController.current === controller) {
        abortController.current = null;
        setProgress(null);
      }
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        onClick={() =>
          progress === null ? void download() : abortController.current?.abort()
        }
      >
        {progress !== null ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <DownloadIcon data-icon="inline-start" />
        )}
        {progress !== null ? "Cancel download" : "Download all"}
      </Button>
      {progress !== null && <Progress value={progress} className="h-1" />}
    </div>
  );
}

function UnavailableShare() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/25 px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-xl border bg-card">
          <LockKeyholeIcon />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">Shared item unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link may have expired or sharing may have been disabled.
        </p>
      </div>
    </main>
  );
}

function toViewItem(item: PublicShareItem): NewDriveItem {
  return {
    id: item._id,
    name: item.name,
    kind:
      item.kind === "folder"
        ? "folder"
        : item.contentType.startsWith("image/")
          ? "image"
          : item.contentType === "application/pdf"
            ? "pdf"
            : "text",
    owner: "",
    updated: formatDistanceToNow(item.updatedAt, { addSuffix: true }),
    size: item.kind === "file" ? formatFileSize(item.size) : "-",
    access: "Restricted",
    spaceId: "public",
    parentId: item.parentId ?? null,
  };
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium break-words">{value}</dd>
    </div>
  );
}
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}
