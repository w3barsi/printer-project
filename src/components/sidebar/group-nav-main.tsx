import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useRouteContext } from "@tanstack/react-router";
import { HardDriveIcon, PiggyBankIcon, Rotate3dIcon } from "lucide-react";
import { TrelloSidebar } from "./trello-sidebar";

export function MainNavGroup() {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <CashflowSidebarItem />
        <DriveSidebarItem />
        <TrelloSidebar />
        <ThreeDSidebarItem />
      </SidebarMenu>
    </SidebarGroup>
  );
}

function ThreeDSidebarItem() {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuButton asChild tooltip="Drive">
      <Link
        to="/three"
        onClick={() => isMobile && setOpenMobile(false)}
        activeProps={{
          className: "bg-sidebar-accent text-sidebar-accent-foreground",
        }}
        tabIndex={0}
      >
        <Rotate3dIcon />
        <span>3D</span>
      </Link>
    </SidebarMenuButton>
  );
}

function DriveSidebarItem() {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuButton asChild tooltip="Drive">
      <Link
        to="/drive/{-$drive}"
        onClick={() => isMobile && setOpenMobile(false)}
        activeProps={{
          className: "bg-sidebar-accent text-sidebar-accent-foreground",
        }}
        tabIndex={0}
      >
        <HardDriveIcon />
        <span>Drive</span>
      </Link>
    </SidebarMenuButton>
  );
}

function CashflowSidebarItem() {
  const { user } = useRouteContext({ from: "/(main)" });
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      {(user.role === "cashier" || user.role === "admin") && (
        <SidebarMenuButton asChild tooltip="Job Order">
          <Link
            to="/cashflow"
            onClick={() => isMobile && setOpenMobile(false)}
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
  );
}
