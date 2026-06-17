import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useId, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { UploadToast } from "@/components/ui-custom/upload-toast";
import { useUploadFile } from "@/lib/drive/use-upload-file";
import { cn } from "@/lib/utils";
import type { Parent } from "@/types/drive";

type UploadDropzoneProps = {
  accept?: string;
  description?:
    | {
        fileTypes?: string;
        maxFileSize?: string;
        maxFiles?: number;
      }
    | string;

  // Add any additional props you need.
};

type UploadDropzonePropsNoControl = Omit<UploadDropzoneProps, "control"> & {
  parent: Parent;
};

export function UploadDropzone({
  parent,
  accept,
  description,
}: UploadDropzonePropsNoControl) {
  const id = useId();

  const { mutateAsync: saveFileToDb } = useMutation({
    mutationFn: useConvexMutation(api.drive.saveFileToDb),
  });

  const { uploadFile } = useUploadFile();
  const [isPending, setIsPending] = useState(false);

  const { getRootProps, getInputProps, isDragActive, inputRef } = useDropzone({
    onDrop: async (files) => {
      if (files.length > 0 && !isPending) {
        setIsPending(true);
        try {
          await Promise.allSettled(
            files.map(async (file) => {
              const toastId = toast.custom(
                () => <UploadToast name={file.name} progress={0} status="uploading" />,
                { duration: Infinity },
              );

              try {
                const key = await uploadFile(file, (progress) => {
                  toast.custom(
                    () => (
                      <UploadToast
                        name={file.name}
                        progress={progress}
                        status="uploading"
                      />
                    ),
                    { id: toastId, duration: Infinity },
                  );
                });

                await saveFileToDb({
                  files: [
                    {
                      parent,
                      name: file.name,
                      key,
                      type: file.type,
                      size: file.size,
                    },
                  ],
                });

                toast.custom(
                  () => <UploadToast name={file.name} progress={100} status="done" />,
                  {
                    id: toastId,
                    duration: 3000,
                  },
                );
              } catch (error) {
                toast.custom(
                  () => <UploadToast name={file.name} progress={0} status="error" />,
                  {
                    id: toastId,
                    duration: 4000,
                  },
                );
                console.error(`Upload failed for ${file.name}:`, error);
              }
            }),
          );
        } finally {
          setIsPending(false);
        }
      }
      inputRef.current.value = "";
    },
    noClick: true,
  });
  return (
    <div
      className={cn("relative rounded-lg border border-input bg-card transition-colors", {
        "border-primary/80": isDragActive,
      })}
    >
      <label
        {...getRootProps()}
        className={cn(
          "flex w-full min-w-72 cursor-pointer flex-col items-center justify-center rounded-lg bg-transparent px-2 py-6 transition-colors dark:bg-input/10",
          {
            "cursor-not-allowed text-muted-foreground": isPending,
            "hover:bg-accent dark:hover:bg-accent/30": !isPending,
          },
        )}
        htmlFor={id}
      >
        <div className="my-2">
          {isPending ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <Upload className="size-6" />
          )}
        </div>
        <div className="mt-3 space-y-1 text-center">
          <p className="text-sm font-semibold">Drag and drop files here</p>
          <p className="max-w-64 text-xs text-muted-foreground">
            {typeof description === "string" ? (
              description
            ) : (
              <>
                {description?.maxFiles &&
                  `You can upload ${description.maxFiles} file${description.maxFiles !== 1 ? "s" : ""}.`}{" "}
                {description?.maxFileSize &&
                  `${description.maxFiles !== 1 ? "Each u" : "U"}p to ${description.maxFileSize}.`}{" "}
                {description?.fileTypes && `Accepted ${description.fileTypes}.`}
              </>
            )}
          </p>
        </div>
        <input
          {...getInputProps()}
          type="file"
          multiple
          id={id}
          accept={accept}
          disabled={isPending}
        />
      </label>
      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-background">
          <div className="flex size-full flex-col items-center justify-center rounded-lg bg-accent dark:bg-accent/30">
            <div className="my-2">
              <Upload className="size-6" />
            </div>
            <p className="mt-3 text-sm font-semibold">Drop files here</p>
          </div>
        </div>
      )}
    </div>
  );
}
