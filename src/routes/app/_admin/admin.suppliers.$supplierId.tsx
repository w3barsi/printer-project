import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  PackageOpenIcon,
  SaveIcon,
} from "lucide-react";
import { useState } from "react";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SUPPLIES_PAGE_SIZE = 10;

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(120),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export const Route = createFileRoute("/app/_admin/admin/suppliers/$supplierId")({
  component: RouteComponent,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const supplierId = params.supplierId as Id<"inventorySuppliers">;
    const supplier = await qc.ensureQueryData(
      convexQuery(api.inventory.getSupplier, { supplierId }),
    );

    if (!supplier) throw notFound();

    await qc.ensureQueryData(
      convexQuery(api.inventory.listItemsBySupplier, {
        supplierId,
        paginationOpts: { numItems: SUPPLIES_PAGE_SIZE, cursor: null },
      }),
    );

    return {
      supplierId,
      supplierName: supplier.name,
      crumb: [
        { value: "Manage Suppliers", href: "/app/admin/suppliers", type: "static" },
        {
          value: supplier.name,
          href: `/app/admin/suppliers/${supplier._id}`,
          type: "static",
        },
      ],
    };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.supplierName ?? "Supplier"} | DG` }],
  }),
});

function RouteComponent() {
  const { supplierId } = Route.useLoaderData();
  const { data: supplier } = useSuspenseQuery(
    convexQuery(api.inventory.getSupplier, { supplierId }),
  );

  if (!supplier) return null;

  return (
    <Container className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            render={<Link to="/app/admin/suppliers" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Suppliers
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
            <p className="text-sm text-muted-foreground">
              Supplier since {new Date(supplier._creationTime).toLocaleDateString()} ·
              Added by {supplier.createdByName}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.5fr)]">
        <SupplierProfile supplier={supplier} />
        <SupplierSupplies supplierId={supplier._id} supplierName={supplier.name} />
      </div>
    </Container>
  );
}

function SupplierProfile({
  supplier,
}: {
  supplier: {
    _id: Id<"inventorySuppliers">;
    name: string;
  };
}) {
  const renameSupplier = useConvexMutation(api.inventory.renameSupplier);
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: supplier.name },
  });
  const mutation = useMutation({
    mutationFn: (values: SupplierFormData) =>
      renameSupplier({ supplierId: supplier._id, name: values.name }),
    onSuccess: () => {
      toast.success("Supplier updated");
      form.reset(form.getValues());
    },
    onError: (error) => toast.error(error.message || "Could not update supplier"),
  });

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Supplier Details</CardTitle>
        <CardDescription>
          The supplier name shown throughout inventory management.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                  <FieldLabel htmlFor="supplier-name">Supplier name</FieldLabel>
                  <Input
                    {...field}
                    id="supplier-name"
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending || !form.formState.isDirty}
          >
            {mutation.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            Save details
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SupplierSupplies({
  supplierId,
  supplierName,
}: {
  supplierId: Id<"inventorySuppliers">;
  supplierName: string;
}) {
  const navigate = useNavigate();
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.inventory.listItemsBySupplier, {
      supplierId,
      paginationOpts: { numItems: SUPPLIES_PAGE_SIZE, cursor },
    }),
  );

  return (
    <Card className="pt-6 pb-0">
      <CardHeader>
        <CardTitle>Supplies</CardTitle>
        <CardDescription>Inventory previously added from {supplierName}.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        {data.page.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Supply</TableHead>
                <TableHead>On hand</TableHead>
                <TableHead className="hidden sm:table-cell">Added</TableHead>
                <TableHead className="hidden md:table-cell">Added by</TableHead>
                <TableHead className="w-0 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.page.map((item) => (
                <TableRow
                  key={item._id}
                  className="cursor-pointer"
                  onClick={(event) => {
                    if (
                      event.target instanceof Element &&
                      event.target.closest("a, button")
                    ) {
                      return;
                    }
                    navigate({
                      to: "/app/inventory/$id",
                      params: { id: item._id },
                    });
                  }}
                >
                  <TableCell className="pl-6 font-medium">
                    <Link
                      to="/app/inventory/$id"
                      params={{ id: item._id }}
                      className="underline-offset-4 hover:underline"
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.quantity > 0 ? "secondary" : "outline"}>
                      {item.quantity.toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {new Date(item._creationTime).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {item.createdByName}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link to="/app/inventory/$id" params={{ id: item._id }} />}
                    >
                      Open supply
                      <ExternalLinkIcon data-icon="inline-end" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty className="min-h-64">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageOpenIcon />
              </EmptyMedia>
              <EmptyTitle>No supplies</EmptyTitle>
              <EmptyDescription>
                Inventory added from {supplierName} will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {(cursorHistory.length > 0 || !data.isDone) && (
          <div className="flex items-center justify-between gap-3 px-6 pb-6">
            <span className="text-xs text-muted-foreground">
              Page {cursorHistory.length + 1}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetching || cursorHistory.length === 0}
                onClick={() => setCursorHistory((history) => history.slice(0, -1))}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetching || data.isDone}
                onClick={() =>
                  setCursorHistory((history) => [...history, data.continueCursor])
                }
              >
                Next
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
