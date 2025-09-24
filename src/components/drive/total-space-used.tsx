import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { bytesToMB } from "./entry";

export function TotalSpaceUsed() {
  const { data } = useSuspenseQuery(convexQuery(api.drive.getTotalSpaceUsed, {}));
  return (
    <div className="flex gap-4">
      <span>Total Space Used:</span>
      <span className="font-mono">{bytesToMB(data)}</span>
    </div>
  );
}
