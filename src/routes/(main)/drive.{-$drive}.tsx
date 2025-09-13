import { DetailsView } from "@/components/drive/details-view";
import { Container } from "@/components/layouts/container";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { SelectedProvider, useSelected } from "@/contexts/SelectedContext";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/(main)/drive/{-$drive}")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className={cn("relative h-full w-full flex-col")}>
      {/* NOTE: Disabled for now*/}
      {/*

      onDragEnter={() => setDrag(true)}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDrag(false);
      }}
      onDragOver={(e) => e.preventDefault()}
        drag && <DriveUploadDropzone setDrag={setDrag} parent="private" /> */}

      <SelectedProvider>
        <Drive />
      </SelectedProvider>
    </div>
  );
}

function Drive() {
  const { drive } = Route.useParams();
  const { clearSelected } = useSelected();
  return (
    <div
      className="h-full"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          clearSelected();
        }
      }}
    >
      <Container className="flex flex-col overflow-x-hidden">
        <UploadDropzone parent={(drive as Id<"folder">) ?? "private"} />
        <Suspense fallback={<DetailsViewSkeleton />}>
          <div className="space-y-1">
            <DetailsView />
          </div>
        </Suspense>
      </Container>
    </div>
  );
}

function DetailsViewSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="border-border hover:bg-muted/30 bg-card flex h-14 cursor-pointer items-center gap-4 rounded-lg border px-4 transition-colors duration-200 select-none"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex-shrink-0">
              <Skeleton className="size-5 rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium">
                <Skeleton className="h-3 w-full" />
              </h3>
            </div>
          </div>

          {/* File Details */}
          <div className="text-muted-foreground flex items-center gap-6 text-sm">
            <div className="text-right">
              <div className="font-mono">
                <Skeleton className="size-4" />
              </div>
            </div>
            <div className="min-w-[120px] text-right">
              <div>
                <Skeleton className="size-4" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Skeleton className="size-4" />
            <Skeleton className="size-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
