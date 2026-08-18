import { UploadCloudIcon } from "lucide-react";
import { type DragEvent, type ReactNode, useRef, useState } from "react";

import type {
  NewDriveUploadFile,
  NewDriveUploadSelection,
} from "@/hooks/use-new-drive-upload";

type FileSystemEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
};

type FileSystemFileEntry = FileSystemEntry & {
  file: (success: (file: File) => void, error?: (error: DOMException) => void) => void;
};

type FileSystemDirectoryEntry = FileSystemEntry & {
  createReader: () => {
    readEntries: (
      success: (entries: FileSystemEntry[]) => void,
      error?: (error: DOMException) => void,
    ) => void;
  };
};

function readFile(entry: FileSystemFileEntry) {
  return new Promise<File>((resolve, reject) => entry.file(resolve, reject));
}

async function readDirectoryEntries(entry: FileSystemDirectoryEntry) {
  const reader = entry.createReader();
  const entries: FileSystemEntry[] = [];
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) return entries;
    entries.push(...batch);
  }
}

async function walkEntry(
  entry: FileSystemEntry,
  parentPath: string,
  files: NewDriveUploadFile[],
  folderPaths: string[],
) {
  const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
  if (entry.isFile) {
    files.push({ file: await readFile(entry as FileSystemFileEntry), relativePath });
    return;
  }
  if (!entry.isDirectory) return;
  folderPaths.push(relativePath);
  const children = await readDirectoryEntries(entry as FileSystemDirectoryEntry);
  for (const child of children) await walkEntry(child, relativePath, files, folderPaths);
}

interface UploadDropzoneProps {
  upload: (selection: NewDriveUploadSelection) => Promise<void>;
  children: ReactNode;
}

export function NewDriveUploadDropzone({ upload, children }: UploadDropzoneProps) {
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragDepth = useRef(0);

  function hasFiles(event: DragEvent<HTMLDivElement>) {
    return event.dataTransfer.types.includes("Files");
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    setIsDraggingFiles(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!isDraggingFiles) return;
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDraggingFiles(false);
    }
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setIsDraggingFiles(false);

    const files: NewDriveUploadFile[] = [];
    const folderPaths: string[] = [];
    const entries = Array.from(event.dataTransfer.items).flatMap((item) => {
      const entry = (
        item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }
      ).webkitGetAsEntry?.();
      return entry ? [entry] : [];
    });
    if (entries.length > 0) {
      for (const entry of entries) await walkEntry(entry, "", files, folderPaths);
    } else {
      files.push(
        ...Array.from(event.dataTransfer.files).map((file) => ({
          file,
          relativePath: file.name,
        })),
      );
    }
    await upload({ files, folderPaths });
  }

  return (
    <div
      className="relative min-h-[calc(100svh-4.1rem)]"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDraggingFiles && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex p-3 md:p-6"
          role="status"
          aria-live="polite"
        >
          <div className="flex min-h-full w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-primary/60 bg-background/90 p-8 text-center shadow-lg backdrop-blur-sm">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <UploadCloudIcon className="size-7" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-xl font-semibold tracking-tight">
                Drop files or folders here
              </p>
              <p className="text-sm text-muted-foreground">
                Folder structure will be preserved in this location
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
