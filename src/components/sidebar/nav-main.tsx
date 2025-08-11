import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link, useRouteContext } from "@tanstack/react-router"
import { PiggyBankIcon } from "lucide-react"
import { AdminSidebar } from "./admin-sidebar"
import { TrelloSidebar } from "./trello-sidebar"

export function NavMain() {
  const { user } = useRouteContext({ from: "/(main)" })
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          {(user.role === "cashier" || user.role === "admin") && (
            <SidebarMenuButton asChild tooltip="Job Order">
              <Link
                to="/cashflow"
                activeProps={{
                  className: "bg-sidebar-accent text-sidebar-accent-foreground",
                }}
              >
                <PiggyBankIcon />
                <span>Cash Flow</span>
              </Link>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>

        <AdminSidebar />
        <TrelloSidebar />
      </SidebarMenu>
    </SidebarGroup>
  )
}
