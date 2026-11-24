import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { formatPeso } from "@dg/backend/printPricing";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dg/ui-coss/components/alert-dialog";
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
import { Field, FieldError, FieldLabel } from "@dg/ui-coss/components/field";
import { Input } from "@dg/ui-coss/components/input";
import { Spinner } from "@dg/ui-coss/components/spinner";
import { toastManager } from "@dg/ui-coss/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

export type PricingGroup = FunctionReturnType<
  typeof api.printPricing.groups.listGroups
>[number];

export type PricingGroupDraftItem = {
  _id: Id<"printPricingItems">;
  name: string;
  latestTotal?: number;
};

const groupNameSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(120),
});

type GroupNameFormData = z.infer<typeof groupNameSchema>;

function suggestedGroupName(items: PricingGroupDraftItem[]) {
  return items
    .map((item) => item.name)
    .join(" + ")
    .slice(0, 120);
}

export function CreatePricingGroupDialog({
  items,
  open,
  onOpenChange,
}: {
  items: PricingGroupDraftItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<GroupNameFormData>({
    resolver: zodResolver(groupNameSchema),
    defaultValues: { name: suggestedGroupName(items) },
  });
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.printPricing.groups.createGroup),
    onSuccess: () => {
      toastManager.add({ title: "Group created", type: "success" });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not create group",
        type: "error",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Name this group</DialogTitle>
          <DialogDescription>
            Group priced items that belong together. The group total is the sum of its
            items.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({
              name: values.name,
              itemIds: items.map((item) => item._id),
            }),
          )}
          className="contents"
        >
          <DialogPanel>
            <div className="flex w-full flex-col gap-4">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="pricing-group-name">Group name</FieldLabel>
                    <Input
                      {...field}
                      id="pricing-group-name"
                      placeholder="e.g. Planter set"
                      aria-invalid={fieldState.invalid}
                      disabled={mutation.isPending}
                    />
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Items in this group
                </p>
                <ul className="flex flex-col gap-1.5">
                  {items.map((item) => (
                    <li
                      key={item._id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate">{item.name}</span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {item.latestTotal !== undefined
                          ? formatPeso(item.latestTotal)
                          : "Not priced"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              Create group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RenamePricingGroupDialog({
  group,
  open,
  onOpenChange,
}: {
  group: PricingGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<GroupNameFormData>({
    resolver: zodResolver(groupNameSchema),
    defaultValues: { name: group.name },
  });
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.printPricing.groups.renameGroup),
    onSuccess: () => {
      toastManager.add({ title: "Group renamed", type: "success" });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not rename group",
        type: "error",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename group</DialogTitle>
          <DialogDescription>
            The group keeps its items and their price history.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({ groupId: group._id, name: values.name }),
          )}
          className="contents"
        >
          <DialogPanel>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="pricing-group-rename">Group name</FieldLabel>
                  <Input
                    {...field}
                    id="pricing-group-rename"
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError>{fieldState.error?.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </DialogPanel>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              Save name
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeletePricingGroupDialog({
  group,
  open,
  onOpenChange,
}: {
  group: PricingGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.printPricing.groups.deleteGroup),
    onSuccess: () => {
      toastManager.add({ title: `"${group.name}" group deleted`, type: "success" });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not delete group",
        type: "error",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete the &quot;{group.name}&quot; group?</AlertDialogTitle>
          <AlertDialogDescription>
            The {group.items.length} item{group.items.length === 1 ? "" : "s"} stay in
            your pricing list with their price history. Only the group is removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            disabled={mutation.isPending}
            render={<Button variant="outline" />}
          >
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ groupId: group._id })}
            render={<Button variant="destructive" />}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Delete group
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
