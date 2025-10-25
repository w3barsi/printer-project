import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, TrelloIcon } from "lucide-react";

import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getTrelloLists } from "@/server/trello";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

export function TrelloSidebar() {
  const [isOpen, setIsOpen] = useLocalStorage("trello-lists-open", false);
  const { data: lists } = useSuspenseQuery({
    queryKey: ["trelloLists"],
    queryFn: getTrelloLists,
  });
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Collapsible asChild defaultOpen={isOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Trello">
          <Link
            to="/trello"
            onClick={() => isMobile && setOpenMobile(false)}
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-sidebar-accent" }}
            tabIndex={0}
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
                        onClick={() => isMobile && setOpenMobile(false)}
                        activeProps={{ className: "bg-sidebar-accent" }}
                        preload={false}
                        tabIndex={0}
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
  );
}
