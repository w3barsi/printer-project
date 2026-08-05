import { Link, useMatch, useRouteContext } from "@tanstack/react-router";
import { BoxesIcon, FolderPlusIcon, HardDriveIcon, PiggyBankIcon } from "lucide-react";

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
        <InventorySidebarItem />
        <DriveSidebarItem />
        <NewDriveSidebarItem />
        <TrelloSidebar />
      </SidebarMenu>
    </SidebarGroup>
  );
}

function InventorySidebarItem() {
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/app/inventory", shouldThrow: false });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip="Inventory"
        isActive={!!match}
        render={
          <Link
            to="/app/inventory"
            onClick={() => isMobile && setOpenMobile(false)}
            tabIndex={0}
          />
        }
      >
        <BoxesIcon />
        <span>Inventory</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function DriveSidebarItem() {
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/app/drive/{-$drive}", shouldThrow: false });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip="Drive"
        isActive={!!match}
        render={
          <Link
            to="/app/drive/{-$drive}"
            onClick={() => isMobile && setOpenMobile(false)}
            tabIndex={0}
          />
        }
      >
        <HardDriveIcon />
        <span>Drive</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NewDriveSidebarItem() {
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/app/newdrive", shouldThrow: false });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip="New Drive"
        isActive={!!match}
        render={
          <Link
            to="/app/newdrive"
            onClick={() => isMobile && setOpenMobile(false)}
            tabIndex={0}
          />
        }
      >
        <FolderPlusIcon />
        <span>New Drive</span>
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
        <SidebarMenuButton
          tooltip="Job Order"
          isActive={!!match}
          render={
            <Link
              to="/app/cashflow"
              onClick={() => isMobile && setOpenMobile(false)}
              tabIndex={0}
            />
          }
        >
          <PiggyBankIcon />
          <span>Cash Flow</span>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  );
}
