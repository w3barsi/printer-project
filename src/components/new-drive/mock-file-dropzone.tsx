import { UploadCloudIcon } from "lucide-react";
import { type DragEvent, type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";

import { UploadToast } from "@/components/ui-custom/upload-toast";

function mockFileUpload(name: string) {
  let progress = 0;
  const toastId = toast.custom(
    () => <UploadToast name={name} progress={progress} status="uploading" />,
    { duration: Infinity, position: "bottom-right" },
  );

  const interval = window.setInterval(() => {
    progress = Math.min(progress + 8, 100);
    toast.custom(
      () => (
        <UploadToast
          name={name}
          progress={progress}
          status={progress === 100 ? "success" : "uploading"}
        />
      ),
      {
        id: toastId,
        duration: progress === 100 ? 3000 : Infinity,
        position: "bottom-right",
      },
    );

    if (progress === 100) window.clearInterval(interval);
  }, 240);
}

export function MockFileDropzone({ children }: { children: ReactNode }) {
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

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setIsDraggingFiles(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) {
      mockFileUpload("Dropped folder");
      return;
    }
    files.forEach((file) => mockFileUpload(file.name));
  }

  return (
    <div
      className="relative min-h-[calc(100svh-4.1rem)] bg-muted/25"
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
                Release to add them to this folder
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
