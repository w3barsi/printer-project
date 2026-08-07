import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpDownIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  Clock3Icon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FolderIcon,
  Grid2X2Icon,
  ListIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  Share2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { type DragEvent, useRef, useState } from "react";

import { Container } from "@/components/layouts/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const items = [
  {
    name: "Brand assets",
    kind: "folder",
    owner: "You",
    updated: "Today, 10:24 AM",
    size: "-",
    access: "Editors",
  },
  {
    name: "Client proofs",
    kind: "folder",
    owner: "You",
    updated: "Yesterday, 4:18 PM",
    size: "-",
    access: "Restricted",
  },
  {
    name: "Q3 campaign brief.pdf",
    kind: "pdf",
    owner: "Mara S.",
    updated: "Aug 6, 2026",
    size: "4.8 MB",
    access: "Viewers",
  },
  {
    name: "Storefront mockup.png",
    kind: "image",
    owner: "You",
    updated: "Aug 5, 2026",
    size: "12.6 MB",
    access: "Restricted",
  },
  {
    name: "Print specifications.txt",
    kind: "text",
    owner: "Ari D.",
    updated: "Aug 2, 2026",
    size: "18 KB",
    access: "Viewers",
  },
];

export const Route = createFileRoute("/app/newdrive")({
  component: NewDrivePage,
  loader: () => ({
    crumb: [{ value: "New Drive", href: "/app/newdrive", type: "static" }],
  }),
  head: () => ({
    meta: [{ title: "New Drive | DG" }],
  }),
});

function NewDrivePage() {
  const [view, setView] = useState<"list" | "grid">("list");
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragDepth = useRef(0);

  function hasFiles(event: DragEvent<HTMLDivElement>) {
    return event.dataTransfer.types.includes("Files");
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;

    event.preventDefault();
    dragDepth.current += 1;
    setIsDraggingFiles(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!isDraggingFiles) return;

    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDraggingFiles(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;

    event.preventDefault();
    dragDepth.current = 0;
    setIsDraggingFiles(false);
  }

  return (
    <div
      className="relative min-h-[calc(100svh-4.1rem)] bg-muted/25"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Container className="max-w-7xl space-y-6 px-3 py-5 md:px-6 md:py-7">
        <div className="flex gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Button className="ml-auto sm:shrink-0">
            <PlusIcon data-icon="inline-start" />
            Add File/Folder
          </Button>
        </div>

        <section aria-label="Drive tools" className="space-y-3">
          <div className="relative max-w-2xl">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="drive-search" className="sr-only">
              Search this drive
            </label>
            <Input
              id="drive-search"
              placeholder="Search files and folders"
              className="h-11 bg-card pr-12 pl-9 shadow-none"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
              Ctrl K
            </kbd>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <FilterButton label="Type" />
            <FilterButton label="People" />
            <FilterButton label="Modified" />
            <span className="ml-auto hidden text-xs whitespace-nowrap text-muted-foreground md:block">
              96 items
            </span>
          </div>
        </section>

        <section
          aria-labelledby="files-heading"
          className="overflow-hidden rounded-lg border bg-card shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 id="files-heading" className="text-sm font-semibold">
                Files and folders
              </h2>
              <p className="text-xs text-muted-foreground">
                Root of DarcyGraphix workspace
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ArrowUpDownIcon />
                <span className="hidden sm:inline">Last modified</span>
              </Button>
              <div className="mx-1 h-5 w-px bg-border" />
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label="List view"
                aria-pressed={view === "list"}
                aria-controls="drive-items"
                onClick={() => setView("list")}
              >
                <ListIcon />
              </Button>
              <Button
                variant={view === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                aria-controls="drive-items"
                onClick={() => setView("grid")}
              >
                <Grid2X2Icon />
              </Button>
            </div>
          </div>

          <div id="drive-items">
            {view === "list" ? (
              <>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] border-b bg-muted/40 px-4 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase md:grid-cols-[minmax(240px,1.7fr)_minmax(100px,.65fr)_minmax(140px,.85fr)_90px_110px_32px]">
                  <span>Name</span>
                  <span className="hidden md:block">Owner</span>
                  <span className="hidden md:block">Last modified</span>
                  <span className="hidden md:block">Size</span>
                  <span className="hidden md:block">Access</span>
                  <span className="sr-only">Actions</span>
                </div>

                <div className="divide-y">
                  {items.map((item) => (
                    <div
                      key={item.name}
                      className="group grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/45 md:grid-cols-[minmax(240px,1.7fr)_minmax(100px,.65fr)_minmax(140px,.85fr)_90px_110px_32px]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ItemIcon kind={item.kind} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
                            {item.updated} / {item.size}
                          </p>
                        </div>
                      </div>
                      <span className="hidden truncate text-xs text-muted-foreground md:block">
                        {item.owner}
                      </span>
                      <span className="hidden truncate text-xs text-muted-foreground md:block">
                        {item.updated}
                      </span>
                      <span className="hidden text-xs text-muted-foreground md:block">
                        {item.size}
                      </span>
                      <div className="hidden md:block">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-6 rounded-md bg-background px-1.5 font-normal text-muted-foreground",
                            item.access !== "Restricted" &&
                              "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-400",
                          )}
                        >
                          {item.access !== "Restricted" && <Share2Icon />}
                          {item.access}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground md:opacity-0 md:group-hover:opacity-100"
                        aria-label={`More actions for ${item.name}`}
                      >
                        <MoreHorizontalIcon />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <div
                    key={item.name}
                    className="group min-w-0 overflow-hidden rounded-lg border bg-background transition-[border-color,box-shadow] hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-800"
                  >
                    <div className="flex h-28 items-center justify-center border-b bg-muted/35">
                      <ItemIcon kind={item.kind} size="lg" />
                    </div>
                    <div className="p-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {item.updated} / {item.size}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="-mt-1 -mr-1 text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label={`More actions for ${item.name}`}
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-6 rounded-md bg-background px-1.5 font-normal text-muted-foreground",
                            item.access !== "Restricted" &&
                              "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-400",
                          )}
                        >
                          {item.access !== "Restricted" && <Share2Icon />}
                          {item.access}
                        </Badge>
                        <span className="truncate text-xs text-muted-foreground">
                          {item.owner}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          aria-label="Upload status"
          className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3 sm:flex-row sm:items-center dark:border-blue-900 dark:bg-blue-950/25"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-700 text-white dark:bg-blue-600">
            <UploadCloudIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium">Artwork-package.zip</p>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                72%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-950">
              <div className="h-full w-[72%] rounded-full bg-blue-700 dark:bg-blue-500" />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3Icon className="size-3" />
              Uploading to Client proofs / about 1 minute left
            </div>
          </div>
          <Button variant="ghost" size="sm" className="self-end sm:self-center">
            Cancel
          </Button>
        </section>

        <div className="flex items-center justify-center gap-1.5 pb-2 text-xs text-muted-foreground">
          <CheckCircle2Icon className="size-3.5 text-blue-700 dark:text-blue-400" />
          All other changes are saved
        </div>
      </Container>

      {isDraggingFiles && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex p-3 md:p-6"
          role="status"
          aria-live="polite"
        >
          <div className="flex min-h-full w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-primary/60 bg-background/90 p-8 text-center shadow-lg backdrop-blur-sm">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <UploadCloudIcon className="size-7" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-xl font-semibold tracking-tight">
                Drop files or folders here
              </p>
              <p className="text-sm text-muted-foreground">
                Release to add them to this drive space
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterButton({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm" className="shrink-0 bg-card font-normal">
      {label}
      <ChevronDownIcon className="size-3.5 text-muted-foreground" />
    </Button>
  );
}

function ItemIcon({ kind, size = "sm" }: { kind: string; size?: "sm" | "lg" }) {
  const iconClassName = size === "lg" ? "size-8" : "size-4";
  const containerClassName = size === "lg" ? "size-16 rounded-lg" : "size-8 rounded-md";

  if (kind === "folder") {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
          containerClassName,
        )}
      >
        <FolderIcon className={cn(iconClassName, "fill-current/10")} />
      </span>
    );
  }

  if (kind === "image") {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-muted text-muted-foreground",
          containerClassName,
        )}
      >
        <FileImageIcon className={iconClassName} />
      </span>
    );
  }

  if (kind === "pdf" || kind === "text") {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-muted text-muted-foreground",
          containerClassName,
        )}
      >
        <FileTextIcon className={iconClassName} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-muted text-muted-foreground",
        containerClassName,
      )}
    >
      <FileIcon className={iconClassName} />
    </span>
  );
}
