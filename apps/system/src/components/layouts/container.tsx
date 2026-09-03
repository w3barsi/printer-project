import { cn, type ClassValue } from "@dg/ui/lib/utils";
import type { ComponentProps } from "react";

/**
 * -------------------------------------------------------------------------------------
 * `container mx-auto p-2 md:p-4`.
 * -------------------------------------------------------------------------------------
 */
export function Container({
  children,
  className,
}: ComponentProps<"div"> & { parentClassName?: ClassValue }) {
  return (
    <div
      data-slot="container"
      className={cn("mx-auto w-full gap-2 p-2 md:container md:gap-4 md:p-4", className)}
    >
      {children}
    </div>
  );
}
