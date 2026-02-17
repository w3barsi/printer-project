import { useQuery } from "@tanstack/react-query";
import { Link, useMatch } from "@tanstack/react-router";
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
import { Spinner } from "../ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function TrelloSidebar() {
  const [isOpen, setIsOpen] = useLocalStorage("trello-lists-open", false);
  const {
    data: lists,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["trelloLists"],
    queryFn: getTrelloLists,
  });
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/(main)/trello/", shouldThrow: false });
  const listMatch = useMatch({ from: "/(main)/trello/$listId", shouldThrow: false });

  if (isLoading) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Loading..." disabled>
          <TrelloIcon className="text-neutral-500" />
          <span className="text-neutral-500">Trello</span>
        </SidebarMenuButton>
        <SidebarMenuAction showOnHover={false} className="hover:bg-transparent">
          <Spinner className="text-neutral-500" />
        </SidebarMenuAction>
      </SidebarMenuItem>
    );
  }

  if (isError) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Trello API Error" disabled>
              <TrelloIcon className="text-red-500" />
              <span className="text-red-500">Trello</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </TooltipTrigger>
        <TooltipContent side="right" align="start">
          Trello API Error
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!lists) {
    <SidebarMenuItem>
      <SidebarMenuButton tooltip="Trello API Error" disabled>
        <TrelloIcon className="text-red-500" />
        <span className="text-red-500">Trello</span>
      </SidebarMenuButton>
    </SidebarMenuItem>;
  }

  return (
    <Collapsible asChild defaultOpen={isOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Trello" isActive={!!match}>
          <Link
            to="/trello"
            onClick={() => isMobile && setOpenMobile(false)}
            tabIndex={0}
          >
            <TrelloIcon />
            <span>Trello</span>
          </Link>
        </SidebarMenuButton>
        {lists?.length ? (
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
                    <SidebarMenuSubButton
                      asChild
                      isActive={listMatch?.params?.listId === list.id}
                    >
                      <Link
                        to={`/trello/$listId`}
                        params={{ listId: list.id }}
                        onClick={() => isMobile && setOpenMobile(false)}
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
