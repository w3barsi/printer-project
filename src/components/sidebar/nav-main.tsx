"use client"

import { FileTextIcon } from "lucide-react"

import { Collapsible } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link } from "@tanstack/react-router"

export function NavMain() {
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
