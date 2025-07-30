import { MainBreadcrumbs } from "@/components/breadcrumbs"
import { Container } from "@/components/layouts/container"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/(main)")({
  component: RouteComponent,
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login" })
    }

    // `context.queryClient` is also available in our loaders
    // https://tanstack.com/start/latest/docs/framework/react/examples/start-basic-react-query
    // https://tanstack.com/router/latest/docs/framework/react/guide/external-data-loading
  },
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(convexQuery(api.jo.getRecent, {}))
  },
})

function RouteComponent() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
  )
}
