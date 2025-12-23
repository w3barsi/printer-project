import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { MainBreadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/layouts/container";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useConvexAuth } from "convex/react";

export const Route = createFileRoute("/(main)")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/login", search: { redirectUrl: location.pathname } });
    }
    const user = await context.queryClient.ensureQueryData(
      convexQuery(api.auth.getCurrentUser, {}),
    );

    //
    // `context.queryClient` is also available in our loaders
    // https://tanstack.com/start/latest/docs/framework/react/examples/start-basic-react-query
    // https://tanstack.com/router/latest/docs/framework/react/guide/external-data-loading
    return { user };
  },
  loader: ({ context }) => {
    return { user: context.user };
  },
});

function Wrapper() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) {
    return <AnimatedLoading />;
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-foreground font-mono text-2xl">Authentication Error</div>
      </div>
    );
  }
  return <RouteComponent />;
}

export function AnimatedLoading() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="text-foreground font-mono text-2xl">
        Loading
        <span className="inline-flex">
          <span className="animate-dot-appear delay-0">.</span>
          <span className="animate-dot-appear delay-500">.</span>
          <span className="animate-dot-appear delay-1000">.</span>
        </span>
      </div>
    </div>
  );
}

function RouteComponent() {
  const { impersonatedBy } = Route.useLoaderData();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div
          className={`${impersonatedBy ? "flex" : "hidden"} h-12 w-full items-center justify-center gap-4 bg-blue-400 text-white`}
        >
          <p>Impersonated by : {impersonatedBy}</p>
          <Button
            variant="secondary"
            onClick={async () => {
              await authClient.admin.stopImpersonating();
              window.location.reload();
            }}
          >
            Stop Impersonation
          </Button>
        </div>
        <Container className="flex h-16 items-center justify-center">
          <header className="mx-auto flex w-full shrink-0 items-center justify-between">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 size-9" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <MainBreadcrumbs />
            </div>
            <div>
              <ThemeToggle />
            </div>
          </header>
        </Container>

        <Separator />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
