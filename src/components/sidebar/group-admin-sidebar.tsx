import { Link, useRouteContext } from "@tanstack/react-router";
import { ShieldUserIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AdminSidebarGroup() {
  const { user } = useRouteContext({ from: "/(main)" });
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <>
      {user.role === "admin" ? (
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <span>Admin</span>
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link
                  to={`/admin/users`}
                  onClick={() => isMobile && setOpenMobile(false)}
                  activeProps={{
                    className: "bg-sidebar-accent text-sidebar-accent-foreground",
                  }}
                  tabIndex={0}
                >
                  <ShieldUserIcon />
                  <span>User Management</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      ) : null}
    </>
  );
}
