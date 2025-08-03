import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
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
import { Suspense } from "react"
import { Card, CardContent } from "./ui/card"

export function RecentJobOrders() {
  return (
    <SidebarGroup>
      <Card className="px-2 pt-2 pb-3">
        <CardContent className="p-0">
          <SidebarGroupLabel>Recent Job Orders</SidebarGroupLabel>
          <SidebarMenu>
            <Suspense fallback={<RecentSubMenuSkeleton />}>
              <RecentSubMenu />
            </Suspense>
          </SidebarMenu>
        </CardContent>
      </Card>
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
