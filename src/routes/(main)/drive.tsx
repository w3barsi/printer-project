import { DetailsView } from "@/components/drive/details-view";
import { Container } from "@/components/layouts/container";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { cn } from "@/lib/utils";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/(main)/drive")({
  component: RouteComponent,
});

function RouteComponent() {
  const [drag, setDrag] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [image, setImage] = useState<string | undefined>(undefined);

  const { data } = useSuspenseQuery(
    convexQuery(api.drive.getDrive, { parent: "private" as const }),
  );

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
        <UploadDropzone parent="private" />
        <div className="space-y-1">
          <DetailsView />
        </div>
      </Container>
      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogContent className="min-h-1/2 min-w-9/10">
          <img src={image} alt="Image" className="w-full" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
