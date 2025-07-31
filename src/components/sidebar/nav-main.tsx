"use client"

import { ChevronRight, FileTextIcon, TrelloIcon } from "lucide-react"

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
import { Link } from "@tanstack/react-router"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"

export function NavMain() {
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
        </SidebarMenuItem>

        <TrelloSidebar />
      </SidebarMenu>
    </SidebarGroup>
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
          <Link to="/trello" activeProps={{ className: "bg-sidebar-accent" }}>
            <TrelloIcon />
            <span>Trello</span>
          </Link>
        </SidebarMenuButton>
        {lists.length ? (
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction
                className="hover:bg-neutral-500/10 data-[state=open]:rotate-90 dark:hover:bg-neutral-500/70"
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
                      <Link to={`/trello/$listId`} params={{ listId: list.id }}>
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
