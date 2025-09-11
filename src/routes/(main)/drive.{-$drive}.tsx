import { DetailsView, EntryWrapper } from "@/components/drive/details-view";
import { Container } from "@/components/layouts/container";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { SelectedProvider } from "@/contexts/SelectedContext";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/(main)/drive/{-$drive}")({
  component: RouteComponent,
});

function RouteComponent() {
  const { drive } = Route.useParams();

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

      <Container className="flex flex-col overflow-x-hidden">
        <UploadDropzone parent={(drive as Id<"folder">) ?? "private"} />
        <Suspense fallback={<DetailsViewSkeleton />}>
          <div className="space-y-1">
            <SelectedProvider>
              <DetailsView />
            </SelectedProvider>
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
        <EntryWrapper key={i}>
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
        </EntryWrapper>
      ))}
    </div>
  );
}
