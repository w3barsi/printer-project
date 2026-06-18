import { Link, useMatch, useRouteContext } from "@tanstack/react-router";
import { HardDriveIcon, PiggyBankIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { TrelloSidebar } from "./trello-sidebar";

export function MainNavGroup() {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <CashflowSidebarItem />
        <DriveSidebarItem />
        <TrelloSidebar />
      </SidebarMenu>
    </SidebarGroup>
  );
}

function DriveSidebarItem() {
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/app/drive/{-$drive}", shouldThrow: false });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Drive" isActive={!!match}>
        <Link
          to="/app/drive/{-$drive}"
          onClick={() => isMobile && setOpenMobile(false)}
          tabIndex={0}
        >
          <HardDriveIcon />
          <span>Drive</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function CashflowSidebarItem() {
  const { user } = useRouteContext({ from: "/app" });
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/app/_cashier/cashflow", shouldThrow: false });

  return (
    <SidebarMenuItem>
      {(user.role === "cashier" || user.role === "admin") && (
        <SidebarMenuButton asChild tooltip="Job Order" isActive={!!match}>
          <Link
            to="/app/cashflow"
            onClick={() => isMobile && setOpenMobile(false)}
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
