import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@dg/ui/components/collapsible";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@dg/ui/components/sidebar";
import { Spinner } from "@dg/ui/components/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dg/ui/components/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Link, useMatch } from "@tanstack/react-router";
import { ChevronRight, TrelloIcon } from "lucide-react";
import { useEffect } from "react";

import { useLocalStorage } from "@/hooks/use-local-storage";
import { getTrelloLists } from "@/server/trello";

export function TrelloSidebar() {
  const [isOpen, setIsOpen] = useLocalStorage("trello-lists-open", false);
  const {
    data: lists,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["trelloLists"],
    queryFn: getTrelloLists,
  });
  const { isMobile, setOpenMobile } = useSidebar();
  const match = useMatch({ from: "/_authenticated/trello/", shouldThrow: false });
  const listMatch = useMatch({
    from: "/_authenticated/trello/$listId",
    shouldThrow: false,
  });

  useEffect(() => {
    if (isError) {
      console.error("Trello API Error:", error);
    }
  }, [error, isError]);

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
        <TooltipTrigger render={<SidebarMenuItem />}>
          <SidebarMenuButton tooltip="Trello API Error" disabled>
            <TrelloIcon className="text-red-500" />
            <span className="text-red-500">Trello</span>
          </SidebarMenuButton>
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
    <Collapsible defaultOpen={isOpen} render={<SidebarMenuItem />}>
      <SidebarMenuButton
        tooltip="Trello"
        isActive={!!match}
        render={
          <Link
            to="/trello"
            onClick={() => isMobile && setOpenMobile(false)}
            tabIndex={0}
          />
        }
      >
        <TrelloIcon />
        <span>Trello</span>
      </SidebarMenuButton>
      {lists?.length ? (
        <>
          <CollapsibleTrigger
            render={
              <SidebarMenuAction
                className="border border-neutral-500/20 hover:bg-neutral-500/10 data-open:rotate-90 dark:hover:bg-neutral-500/70"
                onClick={() => setIsOpen(!isOpen)}
              />
            }
          >
            <ChevronRight />
            <span className="sr-only">Toggle</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {lists.map((list) => (
                <SidebarMenuSubItem key={list.id}>
                  <SidebarMenuSubButton
                    isActive={listMatch?.params?.listId === list.id}
                    render={
                      <Link
                        to={`/trello/$listId`}
                        params={{ listId: list.id }}
                        onClick={() => isMobile && setOpenMobile(false)}
                        preload={false}
                        tabIndex={0}
                      />
                    }
                  >
                    <span>{list.name}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </>
      ) : null}
    </Collapsible>
  );
}
