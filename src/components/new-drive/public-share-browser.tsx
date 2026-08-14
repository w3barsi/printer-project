import type { Id } from "@convex/_generated/dataModel";
import { useNavigate } from "@tanstack/react-router";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import { format, formatDistanceToNow } from "date-fns";
import fileSaver from "file-saver";
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileIcon,
  FolderOpenIcon,
  LockKeyholeIcon,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Container } from "@/components/layouts/container";
import { AddItemsMenu } from "@/components/new-drive/add-items-menu";
import { NewDriveFileList } from "@/components/new-drive/file-list";
import { NewDriveUploadDropzone } from "@/components/new-drive/upload-dropzone";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useNewDriveUploadWithOperations } from "@/hooks/use-new-drive-upload";
import { downloadSharedFolder } from "@/lib/download-shared-folder";
import type { NewDriveItem } from "@/lib/new-drive-items";
import { shareApi, type PublicShareItem } from "@/lib/share-api";

export function PublicShareBrowser({
  token,
  itemId,
}: {
  token: string;
  itemId?: string;
}) {
  const navigate = useNavigate();
  const root = useQuery(shareApi.getSharedRoot, { token });
  const requestedId = itemId as Id<"newDriveItems"> | undefined;
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
      to: "/share/$token/{-$itemId}" as never,
      params: { token, itemId: item.id } as never,
    });
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
  const moveDestinations = folder.folders
    .filter((item) => item.kind === "folder")
    .map((item) => ({ id: item._id, name: item.name }));
  const content = (
    <Container className="flex min-h-svh max-w-7xl flex-col gap-6 px-3 py-5 md:px-6 md:py-7">
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
          {canEdit && (
            <AddItemsMenu
              upload={upload}
              isUploading={isUploading}
              onCreateFolder={(name) =>
                createFolder({ token, parentId: parent._id, name })
              }
            />
          )}
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
                        to: "/share/$token/{-$itemId}" as never,
                        params: {
                          token,
                          itemId: breadcrumb.isShareRoot ? undefined : breadcrumb._id,
                        } as never,
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
        interactive
        publicSafe
        onOpenItem={openItem}
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
                  to: "/share/$token/{-$itemId}" as never,
                  params: { token, itemId: parent.parentId } as never,
                })
            : undefined
        }
        onRenameItem={
          canEdit
            ? (id, name) =>
                renameItem({ token, itemId: id as Id<"newDriveItems">, name }).then(
                  () => undefined,
                )
            : undefined
        }
        onMoveItems={
          canEdit
            ? (ids, destinationFolderId) =>
                moveItems({
                  token,
                  itemIds: ids as Id<"newDriveItems">[],
                  destinationFolderId: destinationFolderId as Id<"newDriveItems">,
                })
            : undefined
        }
        onDeleteItems={
          canEdit
            ? (ids) =>
                deleteItems({ token, itemIds: ids as Id<"newDriveItems">[] }).then(
                  () => undefined,
                )
            : undefined
        }
        moveDestinations={canEdit ? moveDestinations : undefined}
        deleteDescription={
          canEdit ? "This change affects everyone using this link." : undefined
        }
      />
    </Container>
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
  if (file.item.kind !== "file") return null;
  async function download() {
    setIsDownloading(true);
    try {
      const result = await convex.query(shareApi.getSharedDownloadUrl, {
        token,
        itemId: file.item._id,
      });
      if (result.status !== "available" || !result.url)
        throw new Error("This shared item is unavailable");
      const response = await fetch(result.url);
      if (!response.ok) throw new Error("Download failed");
      fileSaver.saveAs(await response.blob(), file.item.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  }
  return (
    <Container
      className="flex min-h-svh max-w-[1500px] flex-col px-3 py-3 md:px-5 md:py-5"
      parentClassName="bg-muted/25"
    >
      <main className="grid min-h-[calc(100svh-1.5rem)] gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-xl border bg-card p-5">
          <Button
            variant="outline"
            className="w-fit"
            onClick={() =>
              void navigate({
                to: "/share/$token/{-$itemId}" as never,
                params: { token, itemId: file.item.parentId } as never,
              })
            }
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {file.item.parentId ? "Parent folder" : "Shared item"}
          </Button>
          <div className="mt-8">
            <Badge variant="secondary">{access === "edit" ? "Editor" : "Viewer"}</Badge>
            <h1 className="mt-3 text-2xl font-semibold break-words">{file.item.name}</h1>
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
    </Container>
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
        (done, total) =>
          setProgress(total === 0 ? 100 : Math.round((done / total) * 100)),
        controller.signal,
      );
      setProgress(100);
      toast.success("Archive downloaded");
    } catch (error) {
      if (controller.signal.aborted) toast.info("Archive download cancelled");
      else
        toast.error(
          error instanceof Error ? error.message : "Archive could not be created",
        );
    } finally {
      abortController.current = null;
      setProgress(null);
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
