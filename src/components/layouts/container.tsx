import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import type { ClassValue } from "clsx";

/**
 * -------------------------------------------------------------------------------------
 * `container mx-auto p-2 md:p-4`.
 * -------------------------------------------------------------------------------------
 */
export function Container({
  children,
  className,
  parentClassName,
}: ComponentProps<"div"> & { parentClassName?: ClassValue }) {
  return (
    <div className={cn("flex w-full justify-center", parentClassName)}>
      <div className={cn("container max-w-xl gap-2 p-2 md:gap-4 md:p-4", className)}>
        {children}
      </div>
    </div>
  );
}
