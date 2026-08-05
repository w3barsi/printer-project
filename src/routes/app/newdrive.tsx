import { createFileRoute } from "@tanstack/react-router";
import { FolderPlusIcon } from "lucide-react";

import { Container } from "@/components/layouts/container";

export const Route = createFileRoute("/app/newdrive")({
  component: NewDrivePage,
  loader: () => ({
    crumb: [{ value: "New Drive", href: "/app/newdrive", type: "static" }],
  }),
  head: () => ({
    meta: [{ title: "New Drive | DG" }],
  }),
});

function NewDrivePage() {
  return (
    <Container className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <FolderPlusIcon className="text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">New Drive</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Create and organize files in your new workspace.
      </p>
    </Container>
  );
}
