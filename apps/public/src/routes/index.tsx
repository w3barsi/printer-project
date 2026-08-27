import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: PublicShell });

function PublicShell() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 text-foreground">
      <div className="max-w-xl space-y-3 text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">
          DARCYGRAPHiX
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Public application shell
        </h1>
        <p className="text-muted-foreground">
          Shop routes will move into this application next.
        </p>
      </div>
    </main>
  );
}
