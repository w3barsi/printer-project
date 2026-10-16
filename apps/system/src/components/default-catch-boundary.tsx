import { Button } from "@dg/ui-coss/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@dg/ui-coss/components/collapsible";
import { cn } from "@dg/ui-coss/lib/utils";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, rootRouteId, useMatch, useRouter } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  HouseIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";

export function DefaultCatchBoundary({ error }: Readonly<ErrorComponentProps>) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(import.meta.env.DEV);

  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  console.error(error);

  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center" role="alert">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-card">
          <TriangleAlertIcon aria-hidden="true" className="text-destructive" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          An unexpected error occurred. Try again, or go back.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            onClick={() => {
              void router.invalidate();
            }}
          >
            <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
            Try again
          </Button>
          {isRoot ? (
            <Button variant="outline" render={<Link to="/" />}>
              <HouseIcon aria-hidden="true" data-icon="inline-start" />
              Home
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
              Go back
            </Button>
          )}
        </div>

        {message.trim() ? (
          <Collapsible className="mt-8" open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger
              render={<Button type="button" variant="ghost" size="sm" />}
            >
              Error details
              <ChevronDownIcon
                aria-hidden="true"
                className={cn("transition-transform", showDetails && "rotate-180")}
              />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <div className="pt-3 text-left">
                <pre className="scrollbar-themed max-h-52 overflow-auto rounded-lg border bg-muted/50 p-3 text-xs break-words whitespace-pre-wrap text-muted-foreground">
                  {message}
                </pre>
              </div>
            </CollapsiblePanel>
          </Collapsible>
        ) : null}
      </div>
    </div>
  );
}
