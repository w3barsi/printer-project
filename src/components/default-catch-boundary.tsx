import { Button } from "@dg/ui/components/button";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { ErrorComponent, Link, rootRouteId, useMatch } from "@tanstack/react-router";

export function DefaultCatchBoundary({ error }: Readonly<ErrorComponentProps>) {
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  console.error(error);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-4">
      <ErrorComponent error={error} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
        >
          Try Again
        </Button>
        {isRoot ? (
          <Button variant="secondary" nativeButton={false} render={<Link to="/" />}>
            Home
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              window.history.back();
            }}
          >
            Go Back
          </Button>
        )}
      </div>
    </div>
  );
}
