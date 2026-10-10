import { cn } from "@dg/ui-coss/lib/utils";
import { ImageUpIcon } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";

type ImageDropzoneProps = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

export function ImageDropzone({ onFile, disabled }: ImageDropzoneProps) {
  const [rejection, setRejection] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/png": [".png"], "image/svg+xml": [".svg"] },
    multiple: false,
    disabled,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setRejection(null);
      onFile(file);
    },
    onDropRejected: () => {
      setRejection("Only PNG and SVG files are supported.");
    },
  });

  return (
    <div className="flex w-full flex-col gap-2">
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card p-6 text-center transition-colors hover:bg-muted/50",
          isDragActive && "border-primary bg-primary/5",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} />
        <ImageUpIcon className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Drop a PNG or SVG here</p>
        <p className="text-xs text-muted-foreground">
          or click to browse. Transparent pixels are ignored.
        </p>
      </div>
      {rejection ? <p className="text-xs text-destructive">{rejection}</p> : null}
    </div>
  );
}
