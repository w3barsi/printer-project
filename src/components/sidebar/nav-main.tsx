"use client"

import { ChevronRight, CircuitBoardIcon, FileTextIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { getTrelloLists } from "@/server/trello"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Suspense } from "react"
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

        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Trello">
            <Link
              to="/trello"
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground",
              }}
            >
              <CircuitBoardIcon />
              <span>Trello</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <TrelloSidebar />
      </SidebarMenu>
    </SidebarGroup>
  )
}

function TrelloSidebar() {
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <div className="flex">
          <SidebarMenuButton asChild tooltip="Trello">
            <Link
              to="/trello"
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground",
              }}
            >
              <CircuitBoardIcon />
              <span>Trello</span>
            </Link>
          </SidebarMenuButton>
        </div>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="w-full">
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Suspense fallback={<div>Loading...</div>}>
            <TrelloSidebarSubMenu />
          </Suspense>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function TrelloSidebarSubMenu() {
  const { data: lists } = useSuspenseQuery({
    queryKey: ["trelloLists"],
    queryFn: getTrelloLists,
  })
  return (
    <SidebarMenuSub>
      {lists.map((list) => (
        <SidebarMenuSubItem key={list.id}>
          <SidebarMenuSubButton asChild>
            <Link
              to={`/trello/$listId`}
              params={{ listId: list.id }}
              activeProps={{ className: "bg-sidebar-accent" }}
              className="truncate"
            >
              {list.name}
            </Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      ))}
    </SidebarMenuSub>
  )
}
