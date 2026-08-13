import { saveAs } from "file-saver";
import JSZip from "jszip";

type ArchiveFile = { path: string; url: string };

function safePath(path: string) {
  if (path.startsWith("/") || path.includes("\\") || /[\u0000-\u001f\u007f]/.test(path)) {
    throw new Error("The archive contains an invalid path");
  }
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("The archive contains an invalid path");
  }
  return segments.join("/");
}

function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").trim() || "shared-folder";
}

export async function downloadSharedFolder(
  rootName: string,
  files: ArchiveFile[],
  onProgress: (completed: number, total: number) => void,
  signal?: AbortSignal,
) {
  const zip = new JSZip();
  zip.folder(safeFileName(rootName));
  const paths = new Set<string>();
  const queue = files.map((file) => ({ ...file, path: safePath(file.path) }));
  for (const file of queue) {
    if (paths.has(file.path)) throw new Error("The archive contains duplicate paths");
    paths.add(file.path);
  }

  let completed = 0;
  async function worker() {
    while (queue.length > 0) {
      if (signal?.aborted) throw new DOMException("Archive cancelled", "AbortError");
      const file = queue.shift();
      if (!file) return;
      const response = await fetch(file.url, { signal });
      if (!response.ok) throw new Error("A shared file could not be downloaded");
      zip.file(file.path, await response.blob());
      completed += 1;
      onProgress(completed, files.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, () => worker()));
  const blob = await zip.generateAsync({ type: "blob" }, (metadata) => {
    if (signal?.aborted) throw new DOMException("Archive cancelled", "AbortError");
    onProgress(files.length + metadata.percent / 100, files.length + 1);
  });
  if (signal?.aborted) throw new DOMException("Archive cancelled", "AbortError");
  saveAs(blob, `${safeFileName(rootName)}.zip`);
}
