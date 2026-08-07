import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { UploadToast } from "@/components/ui-custom/upload-toast";

export type NewDriveUploadFile = {
  file: File;
  relativePath: string;
};

export type NewDriveUploadSelection = {
  files: NewDriveUploadFile[];
  folderPaths: string[];
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

export function useNewDriveUpload(
  spaceId: Id<"newDriveSpaces">,
  parentId?: Id<"newDriveItems">,
) {
  const createFolder = useMutation(api.newDrive.createFolder);
  const createUploadTicket = useMutation(api.newDrive.createUploadTicket);
  const finalizeUpload = useAction(api.newDrive.finalizeUpload);
  const cancelUpload = useAction(api.newDrive.cancelUpload);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async ({ files, folderPaths }: NewDriveUploadSelection) => {
      if (isUploading || (files.length === 0 && folderPaths.length === 0)) return;
      setIsUploading(true);
      const folders = new Map<string, Id<"newDriveItems">>();

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
            spaceId,
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
          let ticketId: Id<"newDriveUploadTickets"> | undefined;
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
              spaceId,
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
      spaceId,
    ],
  );

  return { upload, isUploading };
}
