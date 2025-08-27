import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Link, useRouteContext } from "@tanstack/react-router";
import { UserRoundCogIcon } from "lucide-react";

export function AdminSidebarGroup() {
  const [isOpen, setIsOpen] = useLocalStorage("admin-sidebar-open", false);
  const { user } = useRouteContext({ from: "/(main)" });
  return (
    <>
      {user.role === "admin" ? (
        <SidebarGroup>
          <SidebarMenu>
            <SidebarGroupLabel onClick={() => setIsOpen(!isOpen)}>
              <UserRoundCogIcon />
              <span>Admin</span>
            </SidebarGroupLabel>
            <SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={`/admin/users`}
                    activeProps={{
                      className: "bg-sidebar-accent text-sidebar-accent-foreground",
                    }}
                  >
                    <span>User Management</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      ) : null}
    </>
  );
}
