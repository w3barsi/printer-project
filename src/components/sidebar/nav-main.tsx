import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useRouteContext } from "@tanstack/react-router";
import { PiggyBankIcon } from "lucide-react";
import { TrelloSidebar } from "./trello-sidebar";

export function MainNavGroup() {
  const { user } = useRouteContext({ from: "/(main)" });
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
                tabIndex={0}
              >
                <PiggyBankIcon />
                <span>Cash Flow</span>
              </Link>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>

        <TrelloSidebar />
      </SidebarMenu>
    </SidebarGroup>
  );
}
