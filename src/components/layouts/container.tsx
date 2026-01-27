import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * -------------------------------------------------------------------------------------
 * `container mx-auto p-2 md:p-4`.
 * -------------------------------------------------------------------------------------
 */
export function Container({ children, className }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "container mx-auto max-w-xl gap-2 p-1 pt-2 md:gap-4 md:p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
