import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, ArrowRightIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Container } from "@/components/layouts/container";
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
} from "@/components/ui/table";

const PAGE_SIZE = 12;

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(120),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export const Route = createFileRoute("/app/_admin/admin/suppliers/")({
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
  const navigate = useNavigate();
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.inventory.listSuppliers, {
      paginationOpts: { numItems: PAGE_SIZE, cursor },
    }),
  );

  return (
    <Card className="pt-6 pb-0">
      <CardHeader>
        <CardTitle>Suppliers</CardTitle>
        <CardDescription>Supplier names are shared throughout inventory.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Name</TableHead>
              <TableHead>Added by</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-0 pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.page.length ? (
              data.page.map((supplier) => (
                <TableRow
                  key={supplier._id}
                  className="cursor-pointer"
                  onClick={(event) => {
                    if (
                      event.target instanceof Element &&
                      event.target.closest("a, button")
                    ) {
                      return;
                    }
                    navigate({
                      to: "/app/admin/suppliers/$supplierId",
                      params: { supplierId: supplier._id },
                    });
                  }}
                >
                  <TableCell className="pl-6 font-medium">
                    <Link
                      to="/app/admin/suppliers/$supplierId"
                      params={{ supplierId: supplier._id }}
                      className="underline-offset-4 hover:underline"
                    >
                      {supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell>{supplier.createdByName}</TableCell>
                  <TableCell>
                    {new Date(supplier._creationTime).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="pr-6">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      nativeButton={false}
                      render={
                        <Link
                          to="/app/admin/suppliers/$supplierId"
                          params={{ supplierId: supplier._id }}
                        />
                      }
                    >
                      <ChevronRightIcon />
                      <span className="sr-only">View {supplier.name}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                  No suppliers yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="px-6 pb-6">
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
      </CardContent>
    </Card>
  );
}

function SupplierFormDialog() {
  const [open, setOpen] = useState(false);
  const createSupplier = useConvexMutation(api.inventory.createSupplier);
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: SupplierFormData) => createSupplier(values),
    onSuccess: () => {
      toast.success("Supplier created");
      setOpen(false);
      form.reset();
    },
    onError: (error) => toast.error(error.message || "Could not save supplier"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" />}>
        <PlusIcon data-icon="inline-start" />
        Add supplier
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create supplier</DialogTitle>
          <DialogDescription>
            Create a reusable supplier for inventory items.
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
                  <FieldLabel htmlFor="new-supplier-name">Supplier name</FieldLabel>
                  <Input
                    {...field}
                    id="new-supplier-name"
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
              Create supplier
            </Button>
          </DialogFooter>
        </form>
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
