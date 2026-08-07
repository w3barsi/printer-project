import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { NewDriveProvider } from "@/contexts/new-drive-context";

export const Route = createFileRoute("/app/newdrive")({
  component: NewDriveLayout,
  loader: ({ context: { queryClient: qc } }) =>
    qc.ensureQueryData(convexQuery(api.spaces.list, {})),
});

function NewDriveLayout() {
  return (
    <NewDriveProvider>
      <Outlet />
    </NewDriveProvider>
  );
}
