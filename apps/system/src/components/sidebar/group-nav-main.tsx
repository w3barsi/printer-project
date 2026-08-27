import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@dg/ui/components/collapsible";
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
} from "@dg/ui/components/sidebar";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useMatch, useRouteContext } from "@tanstack/react-router";
import {
  BoxesIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderPlusIcon,
  PiggyBankIcon,
} from "lucide-react";

import { CreateSpaceDialog } from "@/components/new-drive/create-space-dialog";

import { TrelloSidebar } from "./trello-sidebar";

export function MainNavGroup() {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <CashflowSidebarItem />
        <InventorySidebarItem />
        <NewDriveSidebarItem />
        <TrelloSidebar />
      </SidebarMenu>
    </SidebarGroup>
  );
}

function InventorySidebarItem() {
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/_authenticated/inventory", shouldThrow: false });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip="Inventory"
        isActive={!!match}
        render={
          <Link
            to="/inventory"
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

function NewDriveSidebarItem() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { data: spaces } = useSuspenseQuery(convexQuery(api.drive.spaces.list, {}));
  const { isMobile, setOpenMobile } = useSidebar();
  const landingMatch = useMatch({
    from: "/_authenticated/newdrive/",
    shouldThrow: false,
  });
  const spaceMatch = useMatch({
    from: "/_authenticated/newdrive/$spaceId/{-$folderId}",
    shouldThrow: false,
  });

  return (
    <Collapsible defaultOpen render={<SidebarMenuItem />}>
      <SidebarMenuButton
        tooltip="New Drive"
        isActive={!!landingMatch || !!spaceMatch}
        render={
          <Link
            to="/newdrive"
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
          <SidebarMenuAction className="border border-sidebar-border transition-[color,background-color,border-color,transform] peer-data-active/menu-button:hover:border-sidebar-primary peer-data-active/menu-button:hover:bg-sidebar-primary peer-data-active/menu-button:hover:text-sidebar-primary-foreground data-panel-open:rotate-90" />
        }
      >
        <ChevronRightIcon />
        <span className="sr-only">Toggle New Drive spaces</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {spaces.map((space) => (
            <SidebarMenuSubItem key={space._id}>
              <SidebarMenuSubButton
                isActive={spaceMatch?.params.spaceId === space._id}
                render={
                  <Link
                    to="/newdrive/$spaceId/{-$folderId}"
                    params={{ spaceId: space._id }}
                    onClick={() => isMobile && setOpenMobile(false)}
                    aria-label={`Open ${space.name}`}
                  />
                }
              >
                <FolderIcon />
                <span>{space.name}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
          {user.role === "admin" && (
            <SidebarMenuSubItem>
              <CreateSpaceDialog variant="sidebar" />
            </SidebarMenuSubItem>
          )}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

function CashflowSidebarItem() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({
    from: "/_authenticated/_cashier/cashflow",
    shouldThrow: false,
  });

  return (
    <SidebarMenuItem>
      {(user.role === "cashier" || user.role === "admin") && (
        <SidebarMenuButton
          tooltip="Job Order"
          isActive={!!match}
          render={
            <Link
              to="/cashflow"
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
