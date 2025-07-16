"use client"

import { ChevronRight, FileTextIcon } from "lucide-react"

import { Suspense, useState } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { Link } from "@tanstack/react-router"
import { Skeleton } from "./ui/skeleton"
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function NavMain() {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>Platform</SidebarGroupLabel>
			<SidebarMenu>
				<Collapsible asChild defaultOpen={true}>
					<SidebarMenuItem>
						<SidebarMenuButton asChild tooltip="Job Order">
							<a href="/jo">
								<FileTextIcon />
								<span>Job Order</span>
							</a>
						</SidebarMenuButton>
						<>
							<CollapsibleTrigger asChild>
								<SidebarMenuAction className="data-[state=open]:rotate-90 hover:bg-black hover:text-white cursor-pointer transition">
									<ChevronRight />
									<span className="sr-only">Toggle</span>
								</SidebarMenuAction>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<Suspense fallback={<RecentSubMenuSkeleton />}>
									<RecentSubMenu />
									<RecentSubMenu />
								</Suspense>
							</CollapsibleContent>
						</>
					</SidebarMenuItem>
				</Collapsible>
			</SidebarMenu>
		</SidebarGroup>
	)
}

function RecentSubMenu() {
	const { data: recent } = useSuspenseQuery(convexQuery(api.jo.getRecent, {}))
	return (
		<>
			{recent.map((item) => (
				<SidebarMenuSub key={item.id}>
					<SidebarMenuSubItem>
						<SidebarMenuSubButton asChild>
							<Link to="/jo/$joId" params={{ joId: item.id }}>
								<span>{item.name}</span>
							</Link>
						</SidebarMenuSubButton>
					</SidebarMenuSubItem>
				</SidebarMenuSub>
			))}
		</>
	)
}

function RecentSubMenuSkeleton() {
	return (
		<>
			{Array.from({ length: 4 }).map((_, idx) => (
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
