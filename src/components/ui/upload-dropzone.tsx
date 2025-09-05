import { cn } from "@/lib/utils";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "@tanstack/react-query";
import { useUploadFiles, type UploadHookControl } from "better-upload/client";
import { Loader2, Upload } from "lucide-react";
import { useId, type SetStateAction } from "react";
import { useDropzone } from "react-dropzone";

type UploadDropzoneProps = {
  control: UploadHookControl<true>;
  accept?: string;
  metadata?: Record<string, unknown>;
  description?:
    | {
        fileTypes?: string;
        maxFileSize?: string;
        maxFiles?: number;
      }
    | string;
  uploadOverride?: (...args: Parameters<UploadHookControl<true>["upload"]>) => void;

  // Add any additional props you need.
};

const PRIVATE = "private" as const;
const PUBLIC = "public" as const;

export type Parent = typeof PRIVATE | typeof PUBLIC | Id<"folder">; // string for folder IDs

interface DriveUploadDropzoneProps extends Omit<UploadDropzoneProps, "control"> {
  parent: Parent;
  setDrag: React.Dispatch<SetStateAction<boolean>>;
}
type UploadDropzonePropsNoControl = Omit<UploadDropzoneProps, "control"> & {
  parent: Parent;
};

export function DriveUploadDropzone({
  accept,
  metadata,
  description,
  uploadOverride,
  parent,
  setDrag,
}: DriveUploadDropzoneProps) {
  const id = useId();

  const { mutate: saveFileToDb } = useMutation({
    mutationFn: useConvexMutation(api.drive.saveFileToDb),
  });

  const {
    control: { upload, isPending },
  } = useUploadFiles({
    route: "drive",
    onUploadComplete: ({ files }) => {
      const uploadedFiles = files
        .filter((f) => f.status === "complete")
        .map((f) => ({
          parent,
          name: f.name,
          key: f.objectKey,
          type: f.type,
          size: f.size,
        }));

      saveFileToDb({ files: uploadedFiles });
      setDrag(false);
    },
  });

  const { getRootProps, getInputProps, inputRef } = useDropzone({
    onDrop: (files) => {
      if (files.length > 0 && !isPending) {
        console.log(metadata);
        if (uploadOverride) {
          uploadOverride(files, { metadata });
        } else {
          upload(files, { metadata });
        }
      }
      inputRef.current.value = "";
    },
    noClick: true,
  });

  return (
    <div
      className={cn(
        "border-input absolute grid h-full w-full grid-cols-1 grid-rows-1 rounded-lg border border-dashed transition-colors",
        {},
      )}
    >
      <div className="z-10 col-start-1 row-start-1 bg-neutral-200 blur"> </div>
      <label
        {...getRootProps()}
        className={cn(
          "dark:bg-input/10 z-100 col-start-1 row-start-1 flex h-full w-full min-w-72 cursor-pointer flex-col items-center justify-center bg-transparent px-2 py-6 transition-colors",
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
    </div>
  );
}

export function UploadDropzone({
  parent,
  accept,
  metadata,
  description,
  uploadOverride,
}: UploadDropzonePropsNoControl) {
  const id = useId();

  const { mutate: saveFileToDb } = useMutation({
    mutationFn: useConvexMutation(api.drive.saveFileToDb),
  });

  const {
    control: { upload, isPending },
  } = useUploadFiles({
    route: "drive",
    onUploadComplete: ({ files }) => {
      const uploadedFiles = files
        .filter((f) => f.status === "complete")
        .map((f) => ({
          parent,
          name: f.name,
          key: f.objectKey,
          type: f.type,
          size: f.size,
        }));

      saveFileToDb({ files: uploadedFiles });
    },
  });

  const { getRootProps, getInputProps, isDragActive, inputRef } = useDropzone({
    onDrop: (files) => {
      if (files.length > 0 && !isPending) {
        if (uploadOverride) {
          uploadOverride(files, { metadata });
        } else {
          upload(files, { metadata });
        }
      }
      inputRef.current.value = "";
    },
    noClick: true,
  });
  return (
    <div
      className={cn(
        "border-input relative rounded-lg border border-dashed transition-colors",
        {
          "border-primary/80": isDragActive,
        },
      )}
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
