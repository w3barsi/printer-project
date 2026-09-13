import { TriangleAlertIcon } from "lucide-react";

import type { ModelWarning } from "@/lib/3d/warnings";

export function WarningsPanel({ warnings }: { warnings: ModelWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-500">
        <TriangleAlertIcon className="size-4" />
        Check before printing
      </h2>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
        {warnings.map((warning) => (
          <li key={warning.id}>{warning.message}</li>
        ))}
      </ul>
    </section>
  );
}
