"use client"

import { FileTextIcon } from "lucide-react"

import { Link, useRouterState } from "@tanstack/react-router"
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Collapsible } from "@/components/ui/collapsible"

export function NavMain() {
	const rstate = useRouterState()

	return (
		<SidebarGroup>
			<SidebarMenu>
				<Collapsible asChild defaultOpen={true}>
					<SidebarMenuItem>
						<SidebarMenuButton asChild tooltip="Job Order">
							<Link
								to="/jo"
								activeProps={{
									className: "bg-sidebar-accent text-sidebar-accent-foreground",
								}}
							>
								<FileTextIcon />
								<span>Job Orders</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</Collapsible>
			</SidebarMenu>
		</SidebarGroup>
	)
}
