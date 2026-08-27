import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@dg/ui/components/sidebar";
import { Link, useMatch, useRouteContext } from "@tanstack/react-router";
import { ContactRoundIcon, ShieldUserIcon, TruckIcon } from "lucide-react";

export function AdminSidebarGroup() {
  const { user } = useRouteContext({ from: "/app" });
  const { isMobile, setOpenMobile } = useSidebar();
  const usersMatch = useMatch({ from: "/app/_admin/admin/users", shouldThrow: false });
  const customersMatch = useMatch({
    from: "/app/_admin/admin/customers",
    shouldThrow: false,
  });
  const suppliersMatch = useMatch({
    from: "/app/_admin/admin/suppliers",
    shouldThrow: false,
  });

  return (
    <>
      {user.role === "admin" ? (
        <SidebarGroup>
          <SidebarGroupLabel render={<span />}>Admin</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={!!usersMatch}
                render={
                  <Link
                    to={`/app/admin/users`}
                    onClick={() => isMobile && setOpenMobile(false)}
                    tabIndex={0}
                  />
                }
              >
                <ShieldUserIcon />
                <span>Manage Users</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={!!customersMatch}
                render={
                  <Link
                    to="/app/admin/customers"
                    onClick={() => isMobile && setOpenMobile(false)}
                  />
                }
              >
                <ContactRoundIcon />
                <span>Manage Customers</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={!!suppliersMatch}
                render={
                  <Link
                    to="/app/admin/suppliers"
                    onClick={() => isMobile && setOpenMobile(false)}
                  />
                }
              >
                <TruckIcon />
                <span>Manage Suppliers</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      ) : null}
    </>
  );
}
