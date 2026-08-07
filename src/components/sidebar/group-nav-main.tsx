import { Link, useMatch, useRouteContext } from "@tanstack/react-router";
import {
  BoxesIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderPlusIcon,
  HardDriveIcon,
  PiggyBankIcon,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { newDriveSpaces } from "@/lib/new-drive-spaces";

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
    <Collapsible defaultOpen render={<SidebarMenuItem />}>
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
      <CollapsibleTrigger
        render={
          <SidebarMenuAction className="border border-sidebar-border transition-[color,background-color,border-color,transform] peer-data-active/menu-button:hover:border-sidebar-primary peer-data-active/menu-button:hover:bg-sidebar-primary peer-data-active/menu-button:hover:text-sidebar-primary-foreground data-open:rotate-90" />
        }
      >
        <ChevronRightIcon />
        <span className="sr-only">Toggle New Drive spaces</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {newDriveSpaces.map((space) => (
            <SidebarMenuSubItem key={space.id}>
              <SidebarMenuSubButton
                render={<button type="button" aria-label={`Open ${space.name}`} />}
              >
                <FolderIcon />
                <span>{space.name}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
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
