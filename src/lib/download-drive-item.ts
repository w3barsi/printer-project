import fileSaver from "file-saver";

import { downloadSharedFolder } from "@/lib/download-shared-folder";

type DownloadFile = { path: string; size: number; url: string };

export type DownloadManifest =
  | { status: "archiveTooLarge"; maxFiles: number; maxBytes: number }
  | {
      status: "available";
      kind: "file" | "folder";
      rootName: string;
      files: DownloadFile[];
      folders: string[];
    };

export async function downloadDriveItem(manifest: DownloadManifest) {
  if (manifest.status === "archiveTooLarge") {
    throw new Error("Folder downloads are limited to 500 files and 250 MiB");
  }

  if (manifest.kind === "file") {
    const file = manifest.files[0];
    if (!file) throw new Error("File download is unavailable");
    const response = await fetch(file.url);
    if (!response.ok) throw new Error("File download failed");
    fileSaver.saveAs(await response.blob(), manifest.rootName);
    return;
  }

  await downloadSharedFolder(
    manifest.rootName,
    manifest.files,
    () => undefined,
    undefined,
    manifest.folders,
  );
}
