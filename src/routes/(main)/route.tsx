import { MainBreadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/layouts/container";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { convexQuery, useConvexAuth } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { Outlet, createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { LoaderIcon } from "lucide-react";

export const Route = createFileRoute("/(main)")({
  component: RouteComponent,
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirectUrl: location.pathname } });
    }

    // `context.queryClient` is also available in our loaders
    // https://tanstack.com/start/latest/docs/framework/react/examples/start-basic-react-query
    // https://tanstack.com/router/latest/docs/framework/react/guide/external-data-loading
  },
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(convexQuery(api.jo.getRecent, {}));
    return { impersonatedBy: context.impersonatedBy };
  },
});

function RouteComponent() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderIcon size={64} className="animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Authenticated />;
  }

  throw redirect({ to: "/" });
}

function Authenticated() {
  const { impersonatedBy } = Route.useLoaderData();
  const router = useRouter();
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
