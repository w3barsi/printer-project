import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { DetailsView } from "@/components/drive/details-view";
import { DetailsViewSkeleton } from "@/components/drive/details-view-skeleton";
import { Container } from "@/components/layouts/container";
import { UploadDropzone } from "@/components/ui-custom/upload-dropzone";
import { SelectedProvider, useSelected } from "@/contexts/SelectedContext";
import { useGetParentFolder } from "@/lib/get-parent-folder";
import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  value: string;
  href: string;
  type: "static" | "drive";
};

export const Route = createFileRoute("/(main)/drive/{-$drive}")({
  component: RouteComponent,
  loader: ({ params }): { crumb: BreadcrumbItem[] } => {
    const crumb: BreadcrumbItem[] =
      !params.drive || params.drive === "private"
        ? [{ value: "Drive", href: "/drive/", type: "static" }]
        : [
            { value: "Drive", href: "/drive/", type: "static" },
            { value: params.drive, href: `/drive/${params.drive}`, type: "drive" },
          ];
    return {
      crumb,
    };
  },
  head: () => ({
    meta: [{ title: "Drive | DG" }],
  }),
});

function RouteComponent() {
  return (
    <div className={cn("relative h-full w-full flex-col")}>
      <SelectedProvider>
        <Drive />
      </SelectedProvider>
    </div>
  );
}

function Drive() {
  const { clearSelected } = useSelected();
  const parent = useGetParentFolder();
  return (
    <div
      className="h-full"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          clearSelected();
        }
      }}
    >
      <Container className="flex flex-col">
        <UploadDropzone parent={parent} />
        <Suspense fallback={<DetailsViewSkeleton />}>
          <DetailsView />
        </Suspense>
      </Container>
    </div>
  );
}
