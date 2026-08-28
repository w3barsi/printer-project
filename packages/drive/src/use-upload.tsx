import type { Id } from "@dg/backend/dataModel";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { UploadToast } from "./components/upload-toast";

export type NewDriveUploadFile = {
  file: File;
  relativePath: string;
};

export type NewDriveUploadSelection = {
  files: NewDriveUploadFile[];
  folderPaths: string[];
};

export type NewDriveUploadOperations = {
  createFolder: (args: {
    parentId?: Id<"driveItems">;
    name: string;
  }) => Promise<Id<"driveItems">>;
  createUploadTicket: (args: {
    parentId?: Id<"driveItems">;
    name: string;
    contentType: string;
    size: number;
  }) => Promise<{ ticketId: Id<"driveUploadTickets">; url: string }>;
  finalizeUpload: (args: { ticketId: Id<"driveUploadTickets"> }) => Promise<unknown>;
  cancelUpload: (args: { ticketId: Id<"driveUploadTickets"> }) => Promise<unknown>;
};

function pathSegments(path: string) {
  return path.split(/[\\/]/).filter(Boolean);
}

function putFile(url: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}

export function useNewDriveUploadWithOperations(
  parentId: Id<"driveItems"> | undefined,
  operations: NewDriveUploadOperations,
) {
  const { createFolder, createUploadTicket, finalizeUpload, cancelUpload } = operations;
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async ({ files, folderPaths }: NewDriveUploadSelection) => {
      if (isUploading || (files.length === 0 && folderPaths.length === 0)) return;
      setIsUploading(true);
      const folders = new Map<string, Id<"driveItems">>();

      async function ensureFolder(path: string) {
        const segments = pathSegments(path);
        let currentParent = parentId;
        let currentPath = "";
        for (const segment of segments) {
          currentPath = currentPath ? `${currentPath}/${segment}` : segment;
          const cached = folders.get(currentPath.toLocaleLowerCase());
          if (cached) {
            currentParent = cached;
            continue;
          }
          currentParent = await createFolder({
            parentId: currentParent,
            name: segment,
          });
          folders.set(currentPath.toLocaleLowerCase(), currentParent);
        }
        return currentParent;
      }

      try {
        const allFolderPaths = new Set(folderPaths);
        for (const uploadFile of files) {
          const segments = pathSegments(uploadFile.relativePath);
          if (segments.length > 1) allFolderPaths.add(segments.slice(0, -1).join("/"));
        }
        for (const folderPath of [...allFolderPaths].sort(
          (a, b) => pathSegments(a).length - pathSegments(b).length,
        )) {
          await ensureFolder(folderPath);
        }

        for (const uploadFile of files) {
          const segments = pathSegments(uploadFile.relativePath);
          const name = segments.at(-1) ?? uploadFile.file.name;
          const targetParent = await ensureFolder(segments.slice(0, -1).join("/"));
          let ticketId: Id<"driveUploadTickets"> | undefined;
          let progress = 0;
          const toastId = toast.custom(
            () => (
              <UploadToast
                name={uploadFile.relativePath}
                progress={progress}
                status="uploading"
              />
            ),
            { duration: Infinity, position: "bottom-right" },
          );
          try {
            const ticket = await createUploadTicket({
              parentId: targetParent,
              name,
              contentType: uploadFile.file.type || "application/octet-stream",
              size: uploadFile.file.size,
            });
            ticketId = ticket.ticketId;
            await putFile(ticket.url, uploadFile.file, (nextProgress) => {
              progress = nextProgress;
              toast.custom(
                () => (
                  <UploadToast
                    name={uploadFile.relativePath}
                    progress={progress}
                    status="uploading"
                  />
                ),
                { id: toastId, duration: Infinity, position: "bottom-right" },
              );
            });
            await finalizeUpload({ ticketId });
            toast.custom(
              () => (
                <UploadToast
                  name={uploadFile.relativePath}
                  progress={100}
                  status="success"
                />
              ),
              { id: toastId, duration: 3000, position: "bottom-right" },
            );
          } catch (error) {
            if (ticketId) void cancelUpload({ ticketId });
            toast.custom(
              () => (
                <UploadToast
                  name={uploadFile.relativePath}
                  progress={progress}
                  status="error"
                  errorMessage={error instanceof Error ? error.message : "Upload failed"}
                />
              ),
              { id: toastId, duration: 5000, position: "bottom-right" },
            );
          }
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Upload could not be started",
          {
            position: "bottom-right",
          },
        );
      } finally {
        setIsUploading(false);
      }
    },
    [
      cancelUpload,
      createFolder,
      createUploadTicket,
      finalizeUpload,
      isUploading,
      parentId,
    ],
  );

  return { upload, isUploading };
}
