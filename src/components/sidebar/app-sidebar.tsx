import * as React from "react";

import { MainNavGroup } from "@/components/sidebar/group-nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { PrinterButton } from "../printer/printer-button";
import { AdminSidebarGroup } from "./group-admin-sidebar";
import { RecentJobOrdersGroup } from "./group-jo-sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg bg-white p-1">
                  <img src="/logo-small.svg" alt="logo" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Darcy Graphix</span>
                  <span className="truncate text-xs">Advertising</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <RecentJobOrdersGroup />
        <SidebarSeparator className="mx-0" />
        <MainNavGroup />
        <SidebarSeparator className="mx-0" />
        <AdminSidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <PrinterButton />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
