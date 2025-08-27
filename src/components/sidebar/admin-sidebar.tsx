import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useRouteContext } from "@tanstack/react-router";

export function AdminSidebarGroup() {
  const { user } = useRouteContext({ from: "/(main)" });
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
                  activeProps={{
                    className: "bg-sidebar-accent text-sidebar-accent-foreground",
                  }}
                  tabIndex={0}
                >
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
