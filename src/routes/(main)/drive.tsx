import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { useUploadFiles } from "better-upload/client";
import { useState } from "react";

export const Route = createFileRoute("/(main)/drive")({
  component: RouteComponent,
});

function RouteComponent() {
  const [drag, setDrag] = useState(false);

  const { control, progresses } = useUploadFiles({
    route: "drive",
    onUploadComplete: ({ files, metadata }) => {
      console.log("[FILES]", files);
      console.log("[METADATA]", metadata);
      setDrag(false);
    },
  });
  return (
    <div
      onDragEnter={() => setDrag(true)}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDrag(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => console.log(e.target)}
      className={cn(
        "flex h-full w-full flex-col items-center justify-center",
        drag && "bg-red-200",
      )}
    >
      {drag && <UploadDropzone control={control} />}
      <div className="flex flex-col">
        {progresses.map((progress) => (
          <span key={progress.objectKey}>{progress.progress * 100}</span>
        ))}
      </div>
    </div>
  );
}
