import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ArrowRightIcon, Clock3Icon, FolderKanbanIcon, SearchIcon } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { Container } from "@/components/layouts/container";
import { CreateSpaceDialog } from "@/components/new-drive/create-space-dialog";
import { NewDriveFileList } from "@/components/new-drive/file-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNewDrive } from "@/contexts/new-drive-context";

export const Route = createFileRoute("/app/newdrive/")({
  component: NewDrivePage,
  loader: () => ({
    crumb: [{ value: "New Drive", href: "/app/newdrive", type: "static" }],
  }),
  head: () => ({
    meta: [{ title: "New Drive | DG" }],
  }),
});

function NewDrivePage() {
  const { items } = useNewDrive();
  const { data: spaces } = useSuspenseQuery(convexQuery(api.drive.spaces.list, {}));
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const visibleSpaceIds = new Set<string>(spaces.map((space) => space._id));
  const searchableItems = items.filter((item) => visibleSpaceIds.has(item.spaceId));
  const visibleItems = deferredQuery
    ? searchableItems.filter((item) => item.name.toLowerCase().includes(deferredQuery))
    : searchableItems.slice(0, 6);

  return (
    <main className="min-h-[calc(100svh-4.1rem)] bg-muted/25">
      <Container className="flex max-w-7xl flex-col gap-8 px-3 py-5 md:px-6 md:py-8">
        <section aria-labelledby="spaces-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Workspace library
              </p>
              <h1 id="spaces-heading" className="text-3xl font-bold tracking-tight">
                Spaces
              </h1>
              <p className="text-sm text-muted-foreground">
                Keep client work, shared resources, and production files organized.
              </p>
            </div>
            <CreateSpaceDialog />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <Card key={space._id} size="sm">
                <CardHeader>
                  <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <FolderKanbanIcon className="size-5" />
                  </span>
                  <CardTitle>{space.name}</CardTitle>
                  <CardDescription>
                    {space.description || "No description"}
                  </CardDescription>
                  <CardAction>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Open ${space.name}`}
                      render={
                        <Link
                          to="/app/newdrive/$spaceId/{-$folderId}"
                          params={{ spaceId: space._id }}
                        />
                      }
                    >
                      <ArrowRightIcon />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex items-center gap-4 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    {space.visibility === "admin" ? "Admin only" : "Everyone"}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Clock3Icon className="size-3" />
                    {formatDistanceToNow(space.updatedAt, { addSuffix: true })}
                  </span>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    render={
                      <Link
                        to="/app/newdrive/$spaceId/{-$folderId}"
                        params={{ spaceId: space._id }}
                      />
                    }
                  >
                    Open space
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section aria-label="Search all spaces" className="flex flex-col gap-5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="new-drive-search" className="sr-only">
              Search all spaces
            </label>
            <Input
              id="new-drive-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files and folders across all spaces"
              className="h-12 bg-card pr-4 pl-10 shadow-none"
            />
          </div>

          <NewDriveFileList
            items={visibleItems}
            title={deferredQuery ? "Search results" : "Recently updated"}
          />
        </section>
      </Container>
    </main>
  );
}
