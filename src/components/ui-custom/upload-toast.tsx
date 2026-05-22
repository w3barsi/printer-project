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
    <div className="bg-popover text-popover-foreground w-89 overflow-hidden rounded-lg border shadow-lg">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="mt-0.5 shrink-0">
          {status === "uploading" && (
            <Loader2Icon className="text-muted-foreground h-4 w-4 animate-spin" />
          )}
          {status === "success" && (
            <CheckCircle2Icon className="h-4 w-4 text-green-500" />
          )}
          {status === "error" && <XCircleIcon className="text-destructive h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-none font-medium">
            {status === "uploading" && `Uploading ${name}`}
            {status === "success" && `${name} uploaded`}
            {status === "error" && "Upload failed"}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
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
