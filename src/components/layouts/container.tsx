import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/**
 * -------------------------------------------------------------------------------------
 * `container mx-auto p-2 md:p-4`.
 * -------------------------------------------------------------------------------------
 */
export function Container({ children, className }: ComponentProps<"div">) {
  return (
    <div
      className={cn("container mx-auto max-w-xl gap-2 p-2 md:gap-4 md:p-4", className)}
    >
      {children}
    </div>
  );
}
