import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FolderIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Share2Icon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { type DragEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { Container } from "@/components/layouts/container";
import { UploadToast } from "@/components/ui-custom/upload-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { newDriveSpaces } from "@/lib/new-drive-spaces";
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

function mockFileUpload(name: string) {
  let progress = 0;
  const toastId = toast.custom(
    () => <UploadToast name={name} progress={progress} status="uploading" />,
    { duration: Infinity, position: "bottom-right" },
  );

  const interval = window.setInterval(() => {
    progress = Math.min(progress + 8, 100);

    toast.custom(
      () => (
        <UploadToast
          name={name}
          progress={progress}
          status={progress === 100 ? "success" : "uploading"}
        />
      ),
      {
        id: toastId,
        duration: progress === 100 ? 3000 : Infinity,
        position: "bottom-right",
      },
    );

    if (progress === 100) {
      window.clearInterval(interval);
    }
  }, 240);
}

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

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) {
      mockFileUpload("Dropped folder");
      return;
    }

    files.forEach((file) => mockFileUpload(file.name));
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

        <section aria-labelledby="spaces-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="spaces-heading" className="text-sm font-semibold">
              Spaces
            </h2>
            <span className="text-xs text-muted-foreground">
              {newDriveSpaces.length} spaces
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {newDriveSpaces.map((space) => (
              <Button
                key={space.id}
                type="button"
                variant="outline"
                className="h-auto min-w-0 justify-start gap-3 bg-card p-3 text-left"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FolderIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{space.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {space.description}
                  </span>
                </span>
                <ChevronRightIcon className="shrink-0 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </section>

        <section aria-labelledby="files-heading" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
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
            </div>
          </div>

          <div className="flex flex-col gap-1" role="list" aria-label="Files and folders">
            <div className="grid grid-cols-[minmax(0,1fr)_32px] px-4 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase md:grid-cols-[minmax(220px,1.7fr)_minmax(90px,.65fr)_minmax(130px,.85fr)_80px_110px_32px]">
              <span>Name</span>
              <span className="hidden md:block">Owner</span>
              <span className="hidden md:block">Last modified</span>
              <span className="hidden md:block">Size</span>
              <span className="hidden md:block">Access</span>
              <span className="sr-only">Actions</span>
            </div>

            {items.map((item) => (
              <div
                key={item.name}
                className="group grid min-h-14 grid-cols-[minmax(0,1fr)_32px] items-center gap-3 rounded-lg bg-card px-4 py-2.5 transition-colors duration-200 hover:bg-muted/50 md:grid-cols-[minmax(220px,1.7fr)_minmax(90px,.65fr)_minmax(130px,.85fr)_80px_110px_32px]"
                role="listitem"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ItemIcon kind={item.kind} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
                      {item.owner} / {item.updated} / {item.size}
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
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground md:opacity-0 md:group-hover:opacity-100 md:data-popup-open:opacity-100"
                        aria-label={`More actions for ${item.name}`}
                      />
                    }
                  >
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <PencilIcon />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2Icon />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive">
                        <Trash2Icon />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </section>
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
