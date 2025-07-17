import { Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery, useConvex } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { Suspense } from "react"
import { Skeleton } from "./ui/skeleton"
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useAutoAnimate } from "@formkit/auto-animate/react"

export function RecentJobOrders() {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>Recent Job Orders</SidebarGroupLabel>
			<SidebarMenu>
				<Suspense fallback={<RecentSubMenuSkeleton />}>
					<RecentSubMenu />
				</Suspense>
			</SidebarMenu>
		</SidebarGroup>
	)
}

function RecentSubMenu() {
	const { data: recent } = useSuspenseQuery(convexQuery(api.jo.getRecent, {}))
	const [parent] = useAutoAnimate(/* optional config */)
	return (
		<div ref={parent}>
			{recent.map((item) => (
				<SidebarMenuSub key={item.id}>
					<SidebarMenuSubItem>
						<SidebarMenuSubButton asChild>
							<Link
								to="/jo/$joId"
								params={{ joId: item.id }}
								activeProps={{ className: "font-semibold" }}
							>
								<span>{item.name}</span>
							</Link>
						</SidebarMenuSubButton>
					</SidebarMenuSubItem>
				</SidebarMenuSub>
			))}
		</div>
	)
}

function RecentSubMenuSkeleton() {
	return (
		<>
			{Array.from({ length: 5 }).map((_, idx) => (
				<SidebarMenuSub key={idx}>
					<SidebarMenuSubItem>
						<SidebarMenuSubButton asChild>
							<Skeleton className="h-7 w-full" />
						</SidebarMenuSubButton>
					</SidebarMenuSubItem>
				</SidebarMenuSub>
			))}
		</>
	)
}
