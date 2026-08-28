import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { DriveProvider } from "@/contexts/drive-context";

export const Route = createFileRoute("/_authenticated/drive")({
  component: DriveLayout,
  loader: ({ context: { queryClient: qc } }) =>
    qc.ensureQueryData(convexQuery(api.drive.spaces.list, {})),
});

function DriveLayout() {
  return (
    <DriveProvider>
      <Outlet />
    </DriveProvider>
  );
}
