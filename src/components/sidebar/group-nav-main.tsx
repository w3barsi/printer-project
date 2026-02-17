import { Link, useMatch, useRouteContext } from "@tanstack/react-router";
import {
  GraduationCapIcon,
  HardDriveIcon,
  PiggyBankIcon,
  Rotate3dIcon,
} from "lucide-react";

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
        <GraduationSidebarItem />
        <TrelloSidebar />
        <ThreeDSidebarItem />
      </SidebarMenu>
    </SidebarGroup>
  );
}

function GraduationSidebarItem() {
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/(main)/graduation", shouldThrow: false });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Drive" isActive={!!match}>
        <Link
          to="/graduation"
          onClick={() => isMobile && setOpenMobile(false)}
          tabIndex={0}
        >
          <GraduationCapIcon />
          <span>Graduation</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ThreeDSidebarItem() {
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/(main)/three", shouldThrow: false });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Drive" isActive={!!match}>
        <Link to="/three" onClick={() => isMobile && setOpenMobile(false)} tabIndex={0}>
          <Rotate3dIcon />
          <span>3D</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function DriveSidebarItem() {
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/(main)/drive/{-$drive}", shouldThrow: false });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Drive" isActive={!!match}>
        <Link
          to="/drive/{-$drive}"
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
  const { user } = useRouteContext({ from: "/(main)" });
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/(main)/(cashier)/cashflow", shouldThrow: false });

  return (
    <SidebarMenuItem>
      {(user.role === "cashier" || user.role === "admin") && (
        <SidebarMenuButton asChild tooltip="Job Order" isActive={!!match}>
          <Link
            to="/cashflow"
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
