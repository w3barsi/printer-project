import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { Button, buttonVariants } from "@dg/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  LockKeyholeIcon,
} from "lucide-react";

import { Container } from "@/components/layouts/container";

export const Route = createFileRoute("/_authenticated/drive/file/$itemId")({
  component: FilePreviewPage,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const file = await qc.ensureQueryData(
      convexQuery(api.drive.items.getFilePreview, {
        itemId: params.itemId as Id<"driveItems">,
      }),
    );

    return {
      file,
      crumb: [
        { value: "Drive", href: "/drive", type: "static" },
        ...(file
          ? [
              {
                value: file.spaceName,
                href: `/drive/${file.spaceId}`,
                type: "static",
              },
              { value: file.name, type: "static" },
            ]
          : [{ value: "File preview", type: "static" }]),
      ],
    };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.file?.name ?? "File preview"} | DG` }],
  }),
});

function FilePreviewPage() {
  const { itemId } = Route.useParams();
  const { data: file } = useSuspenseQuery(
    convexQuery(api.drive.items.getFilePreview, {
      itemId: itemId as Id<"driveItems">,
    }),
  );

  if (!file) {
    return (
      <Container className="flex min-h-[calc(100svh-4.1rem)] max-w-7xl items-center justify-center px-4 py-10">
        <div className="max-w-md text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-card text-muted-foreground">
            <FileIcon className="size-5" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">File unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This file may have been moved, deleted, or restricted.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            nativeButton={false}
            render={<Link to="/drive" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Drive
          </Button>
        </div>
      </Container>
    );
  }

  const previewKind = getPreviewKind(file.contentType, file.name);
  const parentParams = {
    spaceId: file.spaceId,
    folderId: file.parentId ?? undefined,
  };

  return (
    <Container
      className="flex min-h-[calc(100svh-4.1rem)] max-w-[1600px] flex-col px-3 py-3 md:px-5 md:py-5"
      parentClassName="bg-muted/25"
    >
      <main className="grid min-h-[calc(100svh-6.6rem)] gap-3 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-5">
        <aside className="flex flex-col rounded-xl border bg-card/70 p-4 shadow-[0_16px_48px_-32px_rgba(0,0,0,0.28)] lg:p-5">
          <Button
            variant="outline"
            className="w-fit"
            nativeButton={false}
            render={<Link to="/drive/$spaceId/{-$folderId}" params={parentParams} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Parent folder
          </Button>

          <div className="mt-6 flex min-w-0 items-start gap-3 lg:mt-10 lg:block">
            <FileMark kind={previewKind} />
            <div className="min-w-0 lg:mt-5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                File preview
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight break-words lg:text-2xl">
                {file.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{file.spaceName}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t pt-5 text-sm lg:mt-auto lg:grid-cols-1 lg:gap-y-5">
            <Metadata label="Type" value={file.contentType || "Unknown"} />
            <Metadata label="Size" value={formatFileSize(file.size)} />
            <Metadata label="Owner" value={file.ownerName} />
            <Metadata
              label="Modified"
              value={format(file.updatedAt, "MMM d, yyyy, h:mm a")}
            />
          </dl>

          <div className="mt-6 flex gap-2 lg:mt-7">
            <a
              href={file.url}
              download={file.name}
              className={buttonVariants({ className: "flex-1" })}
            >
              <DownloadIcon data-icon="inline-start" />
              Download
            </a>
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open file in a new tab"
              className={buttonVariants({ variant: "outline", size: "icon" })}
            >
              <ExternalLinkIcon />
            </a>
          </div>
        </aside>

        <section className="relative flex min-h-[58svh] items-center justify-center overflow-hidden rounded-xl border bg-muted/35 p-3 shadow-[0_16px_48px_-32px_rgba(0,0,0,0.28)] sm:p-5 lg:min-h-0 lg:p-8">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-md border bg-background/90 px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur-sm">
            <LockKeyholeIcon className="size-3.5" />
            Employee access
          </div>
          <FilePreview
            kind={previewKind}
            name={file.name}
            url={file.url}
            contentType={file.contentType}
          />
        </section>
      </main>
    </Container>
  );
}

function FilePreview({
  kind,
  name,
  url,
  contentType,
}: {
  kind: PreviewKind;
  name: string;
  url: string;
  contentType: string;
}) {
  if (kind === "image") {
    return (
      <img
        src={url}
        alt={name}
        className="max-h-[calc(100svh-11rem)] max-w-full rounded-lg object-contain shadow-[0_16px_44px_-28px_rgba(0,0,0,0.35)]"
      />
    );
  }

  if (kind === "pdf") {
    return (
      <iframe
        src={url}
        title={`Preview of ${name}`}
        sandbox="allow-same-origin"
        className="h-[68svh] w-full rounded-lg border bg-background shadow-sm lg:h-full"
      />
    );
  }

  if (kind === "text") {
    return (
      <iframe
        src={url}
        title={`Preview of ${name}`}
        sandbox="allow-same-origin"
        className="h-[68svh] w-full max-w-5xl rounded-lg border bg-background shadow-sm lg:h-full"
      />
    );
  }

  return (
    <div className="max-w-sm rounded-xl border bg-background p-8 text-center shadow-sm">
      <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <FileIcon className="size-5" />
      </span>
      <h2 className="mt-5 text-lg font-semibold">Preview unavailable</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {contentType || "This file type"} cannot be displayed in the browser. Download it
        to view the original file.
      </p>
    </div>
  );
}

type PreviewKind = "image" | "pdf" | "text" | "unsupported";

function getPreviewKind(contentType: string, name: string): PreviewKind {
  const normalizedName = name.toLowerCase();
  if (contentType.startsWith("image/")) return "image";
  if (contentType === "application/pdf" || normalizedName.endsWith(".pdf")) return "pdf";
  if (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    normalizedName.endsWith(".txt") ||
    normalizedName.endsWith(".md")
  ) {
    return "text";
  }
  return "unsupported";
}

function FileMark({ kind }: { kind: PreviewKind }) {
  const Icon =
    kind === "image" ? FileImageIcon : kind === "unsupported" ? FileIcon : FileTextIcon;
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:size-14">
      <Icon className="size-5 lg:size-6" />
    </span>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-medium" title={value}>
        {value}
      </dd>
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
}
