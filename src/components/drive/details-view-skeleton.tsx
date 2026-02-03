import { Skeleton } from "@/components/ui/skeleton";

export function DetailsViewSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-9" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex flex-col gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-border hover:bg-muted/30 bg-card flex h-14 cursor-pointer items-center gap-4 rounded-lg border px-4 transition-colors duration-200 select-none"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex-shrink-0">
                <Skeleton className="size-5 rounded-full" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium">
                  <Skeleton className="h-3 w-full" />
                </h3>
              </div>
            </div>

            {/* File Details */}
            <div className="text-muted-foreground flex items-center gap-6 text-sm">
              <div className="text-right">
                <div className="font-mono">
                  <Skeleton className="size-4" />
                </div>
              </div>
              <div className="min-w-[120px] text-right">
                <div>
                  <Skeleton className="size-4" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Skeleton className="size-4" />
              <Skeleton className="size-4" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
