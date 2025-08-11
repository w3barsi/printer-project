import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Link, useRouteContext } from "@tanstack/react-router"
import { ChevronRight, UserRoundCogIcon } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"

export function AdminSidebar() {
  const [isOpen, setIsOpen] = useLocalStorage("admin-sidebar-open", false)
  const { user } = useRouteContext({ from: "/(main)" })
  return (
    <>
      {user.role === "admin" ? (
        <Collapsible className="group/collapsible" defaultOpen={isOpen}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton onClick={() => setIsOpen(!isOpen)}>
                <UserRoundCogIcon />
                <span>Admin</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuItem>
                  <SidebarMenuSubButton asChild>
                    <Link
                      to={`/admin/users`}
                      activeProps={{
                        className: "bg-sidebar-accent text-sidebar-accent-foreground",
                      }}
                    >
                      <span>User Management</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      ) : null}
    </>
  )
}
