import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { useNewDriveUploadWithOperations } from "@dg/drive/use-upload";
import { useAction, useMutation } from "convex/react";

export function useNewDriveUpload(
  spaceId: Id<"driveSpaces">,
  parentId?: Id<"driveItems">,
) {
  const createFolder = useMutation(api.drive.items.createFolder);
  const createUploadTicket = useMutation(api.drive.items.createUploadTicket);
  const finalizeUpload = useAction(api.drive.items.finalizeUpload);
  const cancelUpload = useAction(api.drive.items.cancelUpload);

  return useNewDriveUploadWithOperations(parentId, {
    createFolder: (args) => createFolder({ spaceId, ...args }),
    createUploadTicket: (args) => createUploadTicket({ spaceId, ...args }),
    finalizeUpload,
    cancelUpload,
  });
}
