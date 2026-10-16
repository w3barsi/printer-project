import { cn } from "@dg/ui-coss/lib/utils";
import { ImageUpIcon, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useDropzone, type Accept } from "react-dropzone";

type FileDropzoneProps = {
  accept: Accept;
  title: string;
  hint: string;
  /** Message shown when the drop is rejected by the accept list. */
  rejection: string;
  icon?: LucideIcon;
  onFile: (file: File) => void;
  disabled?: boolean;
};

export function FileDropzone({
  accept,
  title,
  hint,
  rejection,
  icon: Icon = ImageUpIcon,
  onFile,
  disabled,
}: FileDropzoneProps) {
  const [rejected, setRejected] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple: false,
    disabled,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setRejected(null);
      onFile(file);
    },
    onDropRejected: () => {
      setRejected(rejection);
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
        <Icon className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {rejected ? <p className="text-xs text-destructive">{rejected}</p> : null}
    </div>
  );
}
