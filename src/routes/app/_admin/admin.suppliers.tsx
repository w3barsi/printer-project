import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BoxesIcon,
  PackageOpenIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { Suspense, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Container } from "@/components/layouts/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";

const PAGE_SIZE = 12;
const RELATED_PAGE_SIZE = 8;

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(120),
});

type SupplierFormData = z.infer<typeof supplierSchema>;
type Supplier = {
  _id: Id<"inventorySuppliers">;
  _creationTime: number;
  name: string;
  createdByName: string;
};

export const Route = createFileRoute("/app/_admin/admin/suppliers")({
  component: RouteComponent,
  loader: async ({ context: { queryClient: qc } }) => {
    await qc.ensureQueryData(
      convexQuery(api.inventory.listSuppliers, {
        paginationOpts: { numItems: PAGE_SIZE, cursor: null },
      }),
    );
    return {
      crumb: [
        { value: "Manage Suppliers", href: "/app/admin/suppliers", type: "static" },
      ],
    };
  },
  head: () => ({ meta: [{ title: "Manage Suppliers | DG" }] }),
});

function RouteComponent() {
  return (
    <Container className="flex max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Maintain suppliers and review their current inventory items.
          </p>
        </div>
        <SupplierFormDialog />
      </div>
      <Suspense fallback={<SupplierTableSkeleton />}>
        <SupplierTable />
      </Suspense>
    </Container>
  );
}

function SupplierTable() {
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.inventory.listSuppliers, {
      paginationOpts: { numItems: PAGE_SIZE, cursor },
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suppliers</CardTitle>
        <CardDescription>Supplier names are shared throughout inventory.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Added by</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-0 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.page.length ? (
                data.page.map((supplier) => (
                  <TableRow key={supplier._id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.createdByName}</TableCell>
                    <TableCell>
                      {new Date(supplier._creationTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <SupplierInventoryDialog supplier={supplier} />
                        <SupplierFormDialog supplier={supplier} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-40 text-center text-muted-foreground"
                  >
                    No suppliers yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableWrapper>
        <PaginationControls
          page={cursorHistory.length + 1}
          isFetching={isFetching}
          canGoBack={cursorHistory.length > 0}
          canGoForward={!data.isDone}
          onBack={() => setCursorHistory((history) => history.slice(0, -1))}
          onForward={() =>
            setCursorHistory((history) => [...history, data.continueCursor])
          }
        />
      </CardContent>
    </Card>
  );
}

function SupplierFormDialog({ supplier }: { supplier?: Supplier }) {
  const [open, setOpen] = useState(false);
  const createSupplier = useConvexMutation(api.inventory.createSupplier);
  const renameSupplier = useConvexMutation(api.inventory.renameSupplier);
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: supplier?.name ?? "" },
  });
  const mutation = useMutation({
    mutationFn: supplier
      ? (values: SupplierFormData) =>
          renameSupplier({ supplierId: supplier._id, name: values.name })
      : (values: SupplierFormData) => createSupplier(values),
    onSuccess: () => {
      toast.success(supplier ? "Supplier renamed" : "Supplier created");
      setOpen(false);
      if (!supplier) form.reset();
    },
    onError: (error) => toast.error(error.message || "Could not save supplier"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && supplier) form.reset({ name: supplier.name });
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={supplier ? "ghost" : "default"}
            size={supplier ? "icon-sm" : "default"}
          />
        }
      >
        {supplier ? <PencilIcon /> : <PlusIcon data-icon="inline-start" />}
        {supplier ? (
          <span className="sr-only">Rename {supplier.name}</span>
        ) : (
          "Add supplier"
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Rename supplier" : "Create supplier"}</DialogTitle>
          <DialogDescription>
            {supplier
              ? "The new name will appear everywhere this supplier is referenced."
              : "Create a reusable supplier for inventory items."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="flex flex-col gap-6"
        >
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`supplier-name-${supplier?._id ?? "new"}`}>
                    Supplier name
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`supplier-name-${supplier?._id ?? "new"}`}
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                    autoFocus
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              {supplier ? "Save name" : "Create supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SupplierInventoryDialog({ supplier }: { supplier: Supplier }) {
  const [open, setOpen] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isFetching } = useQuery({
    ...convexQuery(api.inventory.listItemsBySupplier, {
      supplierId: supplier._id,
      paginationOpts: { numItems: RELATED_PAGE_SIZE, cursor },
    }),
    enabled: open,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setCursorHistory([]);
      }}
    >
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
        <BoxesIcon />
        <span className="sr-only">View inventory from {supplier.name}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Inventory from {supplier.name}</DialogTitle>
          <DialogDescription>
            Current inventory items assigned to this supplier.
          </DialogDescription>
        </DialogHeader>
        {!data ? (
          <div className="flex flex-col gap-3 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-4/5" />
          </div>
        ) : data.page.length ? (
          <div className="flex flex-col gap-4">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Added by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.page.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant={item.quantity > 0 ? "secondary" : "outline"}>
                          {item.quantity.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.createdByName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
            <PaginationControls
              page={cursorHistory.length + 1}
              isFetching={isFetching}
              canGoBack={cursorHistory.length > 0}
              canGoForward={!data.isDone}
              onBack={() => setCursorHistory((history) => history.slice(0, -1))}
              onForward={() =>
                setCursorHistory((history) => [...history, data.continueCursor])
              }
            />
          </div>
        ) : (
          <Empty className="min-h-56">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageOpenIcon />
              </EmptyMedia>
              <EmptyTitle>No inventory items</EmptyTitle>
              <EmptyDescription>
                Items assigned to {supplier.name} will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaginationControls({
  page,
  isFetching,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: {
  page: number;
  isFetching: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">Page {page}</span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching || !canGoBack}
          onClick={onBack}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching || !canGoForward}
          onClick={onForward}
        >
          Next
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function SupplierTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
