import { Badge } from "@dg/ui/components/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dg/ui/components/empty";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRoundIcon } from "lucide-react";

import { Container } from "@/components/layouts/container";

export const Route = createFileRoute("/_authenticated/3d/keychain")({
  component: KeychainMakerPage,
  loader: () => ({
    crumb: [
      { value: "3D", href: "/3d", type: "static" },
      { value: "Keychain Maker", href: "/3d/keychain", type: "static" },
    ],
  }),
  head: () => ({
    meta: [{ title: "Keychain Maker | DG" }],
  }),
});

function KeychainMakerPage() {
  return (
    <main className="min-h-[calc(100svh-4.1rem)] bg-muted/25">
      <Container className="flex max-w-7xl flex-col gap-6 px-3 py-5 md:px-6 md:py-8">
        <Empty className="min-h-[60svh] border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <KeyRoundIcon />
            </EmptyMedia>
            <EmptyTitle>Keychain Maker</EmptyTitle>
            <EmptyDescription>
              Upload a PNG, pick up to five colors, and shape a printable keychain. The
              workspace arrives here.
            </EmptyDescription>
          </EmptyHeader>
          <Badge variant="secondary">In development</Badge>
        </Empty>
      </Container>
    </main>
  );
}
