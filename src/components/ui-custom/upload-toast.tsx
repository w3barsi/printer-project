import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";

import { Progress } from "@/components/ui/progress";

type UploadToastProps = {
  name: string;
  progress: number;
  status: "uploading" | "success" | "error";
  errorMessage?: string;
};

export function UploadToast({ name, progress, status, errorMessage }: UploadToastProps) {
  return (
    <div className="w-89 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="mt-0.5 shrink-0">
          {status === "uploading" && (
            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {status === "success" && (
            <CheckCircle2Icon className="h-4 w-4 text-green-500" />
          )}
          {status === "error" && <XCircleIcon className="h-4 w-4 text-destructive" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-none font-medium">
            {status === "uploading" && `Uploading ${name}`}
            {status === "success" && `${name} uploaded`}
            {status === "error" && "Upload failed"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "uploading" && `${Math.round(progress)}%`}
            {status === "success" && "File uploaded successfully"}
            {status === "error" && (errorMessage || "Something went wrong")}
          </p>
        </div>
      </div>
      {status === "uploading" && (
        <Progress value={progress} className="h-1.5 rounded-none" />
      )}
    </div>
  );
}
