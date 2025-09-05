import { DetailsView } from "@/components/drive/details-view";
import { Container } from "@/components/layouts/container";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/(main)/drive/{-$drive}")({
  component: RouteComponent,
});

function RouteComponent() {
  const [dialogOpen, setDialogOpen] = useState(false);
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

      <Container className="flex flex-col">
        <UploadDropzone parent={(drive as Id<"folder">) ?? "private"} />
        <div className="space-y-1">
          <DetailsView />
        </div>
      </Container>
    </div>
  );
}
