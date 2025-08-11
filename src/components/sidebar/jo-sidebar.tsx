import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { FileTextIcon } from "lucide-react"
import { Suspense } from "react"

export function RecentJobOrders() {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Job Order">
            <Link
              to="/jo"
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground",
              }}
              activeOptions={{ exact: true }}
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
  )
}

function RecentSubMenu() {
  const { data: recent } = useSuspenseQuery(convexQuery(api.jo.getRecent, {}))
  const [parent] = useAutoAnimate(/* optional config */)
  return (
    <div ref={parent}>
      {recent.map((item) => (
        <SidebarMenuSub key={item.id}>
          <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild>
              <Link
                to={`/jo/$joId`}
                params={{ joId: item.id }}
                activeProps={{ className: "bg-sidebar-accent" }}
              >
                {item.name}
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
      ))}
    </div>
  )
}

function RecentSubMenuSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, idx) => (
        <SidebarMenuSub key={idx}>
          <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild>
              <SidebarMenuSkeleton />
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
      ))}
    </>
  )
}
