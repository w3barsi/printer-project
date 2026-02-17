import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useMatch } from "@tanstack/react-router";
import { FileTextIcon } from "lucide-react";
import { Suspense } from "react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function RecentJobOrdersGroup() {
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/(main)/jo/", shouldThrow: false });

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Job Order" isActive={!!match}>
            <Link
              to="/jo"
              preload="render"
              onClick={() => isMobile && setOpenMobile(false)}
            >
              <FileTextIcon />
              <span>Job Orders</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <Suspense fallback={<RecentSubMenuSkeleton />}>
          <RecentSubMenu />
        </Suspense>
      </SidebarMenu>
    </SidebarGroup>
  );
}

function RecentSubMenu() {
  const { data: recent } = useSuspenseQuery(convexQuery(api.jo.getRecent, {}));
  const [parent] = useAutoAnimate(/* optional config */);
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/(main)/jo/$joId", shouldThrow: false });

  return (
    <div ref={parent}>
      {recent.map((item) => (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuSub>
            <SidebarMenuSubItem className="truncate">
              <SidebarMenuSubButton asChild isActive={match?.params?.joId === item.id}>
                <Link
                  to={`/jo/$joId`}
                  params={{ joId: item.id }}
                  onClick={() => isMobile && setOpenMobile(false)}
                  tabIndex={0}
                >
                  {item.name}
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </SidebarMenuItem>
      ))}
    </div>
  );
}

function RecentSubMenuSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, idx) => (
        <SidebarMenuItem key={idx}>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton asChild>
                <SidebarMenuSkeleton />
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </SidebarMenuItem>
      ))}
    </>
  );
}
