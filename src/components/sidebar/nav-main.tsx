import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { getTrelloLists } from "@/server/trello"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, useRouteContext } from "@tanstack/react-router"
import {
  ChevronRight,
  FileTextIcon,
  PiggyBankIcon,
  TrelloIcon,
  UserRoundCogIcon,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"

export function NavMain() {
  const { user } = useRouteContext({ from: "/(main)" })
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
            >
              <FileTextIcon />
              <span>Job Orders</span>
            </Link>
          </SidebarMenuButton>
          {(user.role === "cashier" || user.role === "admin") && (
            <SidebarMenuButton asChild tooltip="Job Order">
              <Link
                to="/cashflow"
                activeProps={{
                  className: "bg-sidebar-accent text-sidebar-accent-foreground",
                }}
              >
                <PiggyBankIcon />
                <span>Cash Flow</span>
              </Link>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>

        <AdminSidebar />

        <TrelloSidebar />
      </SidebarMenu>
    </SidebarGroup>
  )
}

function AdminSidebar() {
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

function TrelloSidebar() {
  const [isOpen, setIsOpen] = useLocalStorage("trello-lists-open", false)
  const { data: lists } = useSuspenseQuery({
    queryKey: ["trelloLists"],
    queryFn: getTrelloLists,
  })

  return (
    <Collapsible asChild defaultOpen={isOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Trello">
          <Link
            to="/trello"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-sidebar-accent" }}
          >
            <TrelloIcon />
            <span>Trello</span>
          </Link>
        </SidebarMenuButton>
        {lists.length ? (
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction
                className="border border-neutral-500/20 hover:bg-neutral-500/10 data-[state=open]:rotate-90 dark:hover:bg-neutral-500/70"
                onClick={() => setIsOpen(!isOpen)}
              >
                <ChevronRight />
                <span className="sr-only">Toggle</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {lists.map((list) => (
                  <SidebarMenuSubItem key={list.id}>
                    <SidebarMenuSubButton asChild>
                      <Link
                        to={`/trello/$listId`}
                        params={{ listId: list.id }}
                        activeProps={{ className: "bg-sidebar-accent" }}
                      >
                        <span>{list.name}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        ) : null}
      </SidebarMenuItem>
    </Collapsible>
  )
}
