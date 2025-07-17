import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { api } from "@convex/_generated/api"
import { convexQuery } from "@convex-dev/react-query"
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"

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
				<header className="flex h-16 shrink-0 items-center justify-between px-4">
					<div className="flex items-center gap-2">
						<SidebarTrigger className="-ml-1 size-9" />
						<Separator
							orientation="vertical"
							className="mr-2 data-[orientation=vertical]:h-4"
						/>
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem className="hidden md:block">
									<BreadcrumbLink href="#">
										Building Your Application
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator className="hidden md:block" />
								<BreadcrumbItem>
									<BreadcrumbPage>Data Fetching</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<div>
						<ThemeToggle />
					</div>
				</header>
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	)
}
