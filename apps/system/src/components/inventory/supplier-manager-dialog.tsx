import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { Button } from "@dg/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@dg/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@dg/ui/components/field";
import { Input } from "@dg/ui/components/input";
import { Skeleton } from "@dg/ui/components/skeleton";
import { Spinner } from "@dg/ui/components/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Building2Icon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const PAGE_SIZE = 10;

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(120),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export function SupplierManagerDialog() {
  const [open, setOpen] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isPending, isFetching } = useQuery({
    ...convexQuery(api.inventory.listSuppliers, {
      paginationOpts: {
        numItems: PAGE_SIZE,
        cursor,
      },
    }),
    enabled: open,
  });
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
    },
  });
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.createSupplier),
    onSuccess: () => {
      toast.success("Supplier created");
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Could not create supplier");
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setCursorHistory([]);
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Building2Icon data-icon="inline-start" />
        Manage suppliers
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage suppliers</DialogTitle>
          <DialogDescription>
            Create reusable suppliers or rename an existing supplier.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FieldGroup className="flex-row items-end gap-2">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-2">
                  <FieldLabel htmlFor="new-supplier-name">New supplier</FieldLabel>
                  <Input
                    {...field}
                    id="new-supplier-name"
                    placeholder="e.g. Acme Paper Co."
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Button type="submit" disabled={mutation.isPending} className="shrink-0">
              {mutation.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              Add
            </Button>
          </FieldGroup>
        </form>

        <div className="overflow-hidden rounded-lg border">
          <div className="border-b bg-muted/40 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Suppliers
          </div>
          {isPending ? (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-4/5" />
            </div>
          ) : data?.page.length ? (
            <div className="divide-y">
              {data.page.map((supplier) => (
                <div
                  key={supplier._id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{supplier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Added by {supplier.createdByName}
                    </p>
                  </div>
                  <RenameSupplierDialog
                    supplierId={supplier._id}
                    currentName={supplier.name}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No suppliers yet. Add the first one above.
            </p>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Page {cursorHistory.length + 1}
            {isFetching ? " · Updating" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetching || cursorHistory.length === 0}
              onClick={() => setCursorHistory((history) => history.slice(0, -1))}
            >
              <ArrowLeftIcon />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetching || !data || data.isDone}
              onClick={() => {
                if (data && !data.isDone) {
                  setCursorHistory((history) => [...history, data.continueCursor]);
                }
              }}
            >
              Next
              <ArrowRightIcon />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameSupplierDialog({
  supplierId,
  currentName,
}: {
  supplierId: Id<"inventorySuppliers">;
  currentName: string;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: currentName,
    },
  });
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.renameSupplier),
    onSuccess: () => {
      toast.success("Supplier renamed");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Could not rename supplier");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) form.reset({ name: currentName });
      }}
    >
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
        <PencilIcon />
        <span className="sr-only">Rename {currentName}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename supplier</DialogTitle>
          <DialogDescription>
            This updates the supplier name everywhere it is referenced.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({ supplierId, ...values }),
          )}
          className="flex flex-col gap-6"
        >
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`supplier-${supplierId}`}>Name</FieldLabel>
                <Input
                  {...field}
                  id={`supplier-${supplierId}`}
                  aria-invalid={fieldState.invalid}
                  disabled={mutation.isPending}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
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
