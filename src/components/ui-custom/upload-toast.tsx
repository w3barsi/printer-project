import { CircleCheckIcon, OctagonXIcon } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Field, FieldLabel } from "../ui/field";

type UploadToastProps = {
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
};

export function UploadToast({ name, progress, status }: UploadToastProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center gap-2">
        {status === "done" && <CircleCheckIcon className="size-4 text-green-500" />}
        {status === "error" && <OctagonXIcon className="size-4 text-red-500" />}
        <span className="truncate text-sm font-medium">{name}</span>
      </div>
      {status === "uploading" && (
        <Field className="w-full max-w-sm">
          <FieldLabel htmlFor="progress-upload">
            <span>Upload progress</span>
            <span className="ml-auto">{progress}%</span>
          </FieldLabel>
          <Progress value={progress} id="progress-upload" />
        </Field>
      )}
    </div>
  );
}
