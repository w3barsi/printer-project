import { Link, useMatch, useRouteContext } from "@tanstack/react-router";
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
  const { user } = useRouteContext({ from: "/app" });
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/app/_admin/admin/users", shouldThrow: false });

  return (
    <>
      {user.role === "admin" ? (
        <SidebarGroup>
          <SidebarGroupLabel render={<span />}>Admin</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={!!match}
                render={
                  <Link
                    to={`/app/admin/users`}
                    onClick={() => isMobile && setOpenMobile(false)}
                    tabIndex={0}
                  />
                }
              >
                <ShieldUserIcon />
                <span>User Management</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      ) : null}
    </>
  );
}
