import type { Id } from "@convex/_generated/dataModel";
import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useUploadFile } from "@convex-dev/r2/react";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { Loader2, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { cn } from "@/lib/utils";

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

const PRIVATE = "private" as const;
const PUBLIC = "public" as const;

export type Parent = typeof PRIVATE | typeof PUBLIC | Id<"folder">; // string for folder IDs

type UploadDropzonePropsNoControl = Omit<UploadDropzoneProps, "control"> & {
  parent: Parent;
};

export function UploadDropzone({
  parent,
  accept,
  description,
}: UploadDropzonePropsNoControl) {
  const id = useId();

  const { mutate: saveFileToDb } = useMutation({
    mutationFn: useConvexMutation(api.drive.saveFileToDb),
  });

  // Use the Convex R2 upload hook
  const uploadFile = useUploadFile(api.r2);
  const [isPending, setIsPending] = useState(false);

  const { getRootProps, getInputProps, isDragActive, inputRef } = useDropzone({
    onDrop: async (files) => {
      if (files.length > 0 && !isPending) {
        setIsPending(true);
        try {
          // Upload files using R2
          for (const file of files) {
            const key = await uploadFile(file);
            console.log("Upload result key:", key);

            // Save file info to database
            saveFileToDb({
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
          }
        } catch (error) {
          console.error("Upload failed:", error);
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
      className={cn("border-input bg-card relative rounded-lg border transition-colors", {
        "border-primary/80": isDragActive,
      })}
    >
      <label
        {...getRootProps()}
        className={cn(
          "dark:bg-input/10 flex w-full min-w-72 cursor-pointer flex-col items-center justify-center rounded-lg bg-transparent px-2 py-6 transition-colors",
          {
            "text-muted-foreground cursor-not-allowed": isPending,
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
          <p className="text-muted-foreground max-w-64 text-xs">
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
        <div className="bg-background pointer-events-none absolute inset-0 rounded-lg">
          <div className="dark:bg-accent/30 bg-accent flex size-full flex-col items-center justify-center rounded-lg">
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
