import type { Id } from "@dg/backend/dataModel";
import { shareApi } from "@dg/drive/share-api";
import type { DriveShareItem } from "@dg/drive/types";
import { Button } from "@dg/ui-coss/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@dg/ui-coss/components/dialog";
import { Field, FieldLabel } from "@dg/ui-coss/components/field";
import { Input } from "@dg/ui-coss/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dg/ui-coss/components/select";
import { Spinner } from "@dg/ui-coss/components/spinner";
import { toastManager } from "@dg/ui-coss/components/toast";
import { useMutation, useQuery } from "convex/react";
import { CopyIcon, LinkIcon, Share2Icon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { storefrontOrigin } from "@/lib/app-origins";

type Expiration = "never" | "day" | "week" | "month" | "custom";
type Access = "restricted" | "read" | "edit";

const expirationItems: Array<{ label: string; value: Expiration }> = [
  { label: "Never", value: "never" },
  { label: "24 hours", value: "day" },
  { label: "7 days", value: "week" },
  { label: "30 days", value: "month" },
  { label: "Custom", value: "custom" },
];

function formatExpiration(expiresAt: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(expiresAt);
}

function accessLabel(access: "read" | "edit") {
  return access === "read" ? "Viewer" : "Editor";
}

function accessDescription(access: "read" | "edit") {
  return access === "read"
    ? "Anyone with the link can view."
    : "Anyone with the link can edit.";
}

function expirationDescription(expiresAt: number | null) {
  return expiresAt === null
    ? "Never expires."
    : `Expires on ${formatExpiration(expiresAt)}.`;
}

function expirationChangeLabel(expiration: Expiration, expiresAt: number | null) {
  switch (expiration) {
    case "never":
      return "Expiration set to never";
    case "day":
      return "Expiration changed to 24 hours";
    case "week":
      return "Expiration changed to 7 days";
    case "month":
      return "Expiration changed to 30 days";
    case "custom":
      return `Expiration changed to ${
        expiresAt === null ? "a custom date" : formatExpiration(expiresAt)
      }`;
  }
}

function sameExpiration(expiresAt: number | null, current: number | null) {
  if (expiresAt === null || current === null) return expiresAt === current;
  // The datetime-local input only stores minutes, so compare at that precision.
  return Math.floor(expiresAt / 60_000) === Math.floor(current / 60_000);
}

export function ShareDialog({
  item,
  onOpenChange,
}: {
  item: DriveShareItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const itemId = item?.id as Id<"driveItems"> | undefined;
  const settings = useQuery(shareApi.getShareSettings, itemId ? { itemId } : "skip");
  const setShare = useMutation(shareApi.setShare);
  const disableShare = useMutation(shareApi.disableShare);
  const [access, setAccess] = useState<Access>("restricted");
  const [expiration, setExpiration] = useState<Expiration>("never");
  const [customExpiration, setCustomExpiration] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const accessItems: Array<{ label: string; value: Access }> = [
    { label: "Restricted", value: "restricted" },
    { label: "Viewer", value: "read" },
    ...(item?.kind === "folder" ? [{ label: "Editor", value: "edit" as const }] : []),
  ];

  useEffect(() => {
    if (!settings) return;
    setAccess(settings.status === "shared" ? settings.access : "restricted");
    if (settings.status !== "shared" || settings.expiresAt === null) {
      setExpiration("never");
      setCustomExpiration("");
      return;
    }
    setExpiration("custom");
    const local = new Date(settings.expiresAt - new Date().getTimezoneOffset() * 60_000);
    setCustomExpiration(local.toISOString().slice(0, 16));
  }, [settings]);

  const url =
    settings?.status === "shared" ? `${storefrontOrigin}/share/${settings.token}` : "";

  function expiresAt() {
    if (expiration === "never") return null;
    if (expiration === "custom") return new Date(customExpiration).getTime();
    const duration = expiration === "day" ? 1 : expiration === "week" ? 7 : 30;
    return Date.now() + duration * 24 * 60 * 60 * 1000;
  }

  async function save() {
    if (!itemId || !settings) return;
    if (access === "restricted") {
      if (settings.status === "shared") {
        await disable();
      } else {
        toastManager.add({
          title: "Nothing to create",
          description: "Choose Viewer or Editor to create a public link.",
          type: "info",
        });
      }
      return;
    }
    const expirationTime = expiresAt();
    if (
      expirationTime !== null &&
      (!Number.isFinite(expirationTime) || expirationTime <= Date.now())
    ) {
      toastManager.add({ title: "Choose a future expiration date", type: "error" });
      return;
    }

    const shared = settings.status === "shared" ? settings : null;
    const accessChanged = shared ? access !== shared.access : false;
    const expirationChanged = shared
      ? !sameExpiration(expirationTime, shared.expiresAt)
      : false;
    if (shared && !accessChanged && !expirationChanged) {
      toastManager.add({
        title: "No changes",
        description: "The public link already has these settings.",
        type: "info",
      });
      return;
    }

    setIsSaving(true);
    try {
      await setShare({ itemId, access, expiresAt: expirationTime });
      const description = `${accessDescription(access)} ${expirationDescription(expirationTime)}`;
      const title = !shared
        ? "Public link created"
        : accessChanged && expirationChanged
          ? "Public link updated"
          : accessChanged
            ? `Access changed to ${accessLabel(access)}`
            : expirationChangeLabel(expiration, expirationTime);
      toastManager.add({ title, description, type: "success" });
    } catch (error) {
      toastManager.add({
        title: error instanceof Error ? error.message : "Sharing could not be updated",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function disable() {
    if (!itemId) return;
    setIsSaving(true);
    try {
      await disableShare({ itemId });
      toastManager.add({
        title: "Public link disabled",
        description: "The link no longer works.",
        type: "success",
      });
    } catch (error) {
      toastManager.add({
        title: error instanceof Error ? error.message : "Sharing could not be disabled",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2Icon /> Share {item?.name}
          </DialogTitle>
          <DialogDescription>
            Anyone with the URL receives the selected access until the link expires or is
            disabled.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {settings === undefined ? (
            <div className="flex min-h-32 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="flex w-full flex-col gap-7">
              <Field>
                <FieldLabel>Access</FieldLabel>
                <Select
                  items={accessItems}
                  value={access}
                  onValueChange={(value) => setAccess(value as Access)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {accessItems.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Expiration</FieldLabel>
                <Select
                  items={expirationItems}
                  value={expiration}
                  onValueChange={(value) => setExpiration(value as Expiration)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {expirationItems.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {expiration === "custom" && (
                <Field>
                  <FieldLabel htmlFor="share-expiration">Expires at</FieldLabel>
                  <Input
                    id="share-expiration"
                    type="datetime-local"
                    value={customExpiration}
                    onChange={(event) => setCustomExpiration(event.target.value)}
                  />
                </Field>
              )}
              {url && (
                <Field>
                  <FieldLabel>Public link</FieldLabel>
                  <div className="flex gap-2">
                    <Input readOnly value={url} />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Copy public link"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(url);
                          toastManager.add({ title: "Link copied", type: "success" });
                        } catch {
                          toastManager.add({
                            title: "Link could not be copied",
                            type: "error",
                          });
                        }
                      }}
                    >
                      <CopyIcon />
                    </Button>
                  </div>
                </Field>
              )}
            </div>
          )}
        </DialogPanel>
        <DialogFooter className="sm:justify-between">
          {settings?.status === "shared" ? (
            <Button
              type="button"
              variant="destructive"
              disabled={isSaving}
              onClick={() => void disable()}
            >
              <Trash2Icon data-icon="inline-start" /> Disable public link
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            disabled={isSaving || settings === undefined}
            onClick={() => void save()}
          >
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <LinkIcon data-icon="inline-start" />
            )}
            {settings?.status === "shared" ? "Save changes" : "Create public link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
