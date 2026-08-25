import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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

const PAGE_SIZE = 50;

const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(120),
  handler: z.string().trim().max(120),
  contactNumbers: z.string(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export const Route = createFileRoute("/app/_admin/admin/customers/")({
  component: RouteComponent,
  loader: async ({ context: { queryClient: qc } }) => {
    await qc.ensureQueryData(
      convexQuery(api.customer.list, {
        paginationOpts: { numItems: PAGE_SIZE, cursor: null },
      }),
    );
    return {
      crumb: [
        { value: "Manage Customers", href: "/app/admin/customers", type: "static" },
      ],
    };
  },
  head: () => ({ meta: [{ title: "Manage Customers | DG" }] }),
});

function RouteComponent() {
  return (
    <Container className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Manage Customers</h1>

        <CustomerFormDialog />
      </div>
      <Suspense fallback={<CustomerTableSkeleton />}>
        <CustomerTable />
      </Suspense>
    </Container>
  );
}

function CustomerTable() {
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(
    convexQuery(api.customer.list, {
      paginationOpts: { numItems: PAGE_SIZE, cursor: null },
    }),
  );

  return (
    <TableWrapper>
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow>
            <TableHead className="md:pl-4">Name</TableHead>
            <TableHead>Handler</TableHead>
            <TableHead>Contact numbers</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead className="w-0 md:pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.page.length ? (
            data.page.map((customer) => (
              <TableRow
                key={customer._id}
                className="cursor-pointer"
                onClick={(event) => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest("a, button")
                  ) {
                    return;
                  }
                  navigate({
                    to: "/app/admin/customers/$customerId",
                    params: { customerId: customer._id },
                  });
                }}
              >
                <TableCell className="pl-4 font-medium">
                  <Link
                    to="/app/admin/customers/$customerId"
                    params={{ customerId: customer._id }}
                    className="underline-offset-4 hover:underline"
                  >
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell>{customer.handler ?? "-"}</TableCell>
                <TableCell>
                  {customer.contactNumbers?.length
                    ? customer.contactNumbers.join(", ")
                    : "-"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-col">
                    <span>{new Date(customer._creationTime).toLocaleDateString()}</span>
                    <span className="text-xs text-muted-foreground">
                      by {customer.createdByName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    render={
                      <Link
                        to="/app/admin/customers/$customerId"
                        params={{ customerId: customer._id }}
                      />
                    }
                  >
                    <ChevronRightIcon />
                    <span className="sr-only">View {customer.name}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                No customers yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

function CustomerFormDialog() {
  const [open, setOpen] = useState(false);
  const createCustomer = useConvexMutation(api.customer.create);
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      handler: "",
      contactNumbers: "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: CustomerFormData) =>
      createCustomer({
        name: values.name,
        handler: values.handler || undefined,
        contactNumbers: parseContactNumbers(values.contactNumbers),
      }),
    onSuccess: () => {
      toast.success("Customer created");
      setOpen(false);
      form.reset();
    },
    onError: (error) => toast.error(error.message || "Could not save customer"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" />}>
        <PlusIcon data-icon="inline-start" />
        Add customer
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create customer</DialogTitle>
          <DialogDescription>
            Create a reusable customer for future Job Orders.
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
                  <FieldLabel htmlFor="new-customer-name">Customer name</FieldLabel>
                  <Input
                    {...field}
                    id="new-customer-name"
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                    autoFocus
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="handler"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-customer-handler">Handler</FieldLabel>
                  <Input
                    {...field}
                    id="new-customer-handler"
                    placeholder="Customer's go-to person"
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  <FieldDescription>
                    Optional, for company or client accounts.
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="contactNumbers"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="new-customer-contacts">Contact numbers</FieldLabel>
                  <Input
                    {...field}
                    id="new-customer-contacts"
                    placeholder="0917 123 4567, 0928 765 4321"
                    disabled={mutation.isPending}
                  />
                  <FieldDescription>
                    Separate multiple numbers with commas.
                  </FieldDescription>
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              Create customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CustomerTableSkeleton() {
  return (
    <TableWrapper>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow>
            <TableHead className="md:pl-4">Name</TableHead>
            <TableHead>Handler</TableHead>
            <TableHead>Contact numbers</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead className="w-0 md:pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="pl-4">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-8 w-28" />
              </TableCell>
              <TableCell className="pr-4">
                <Skeleton className="h-8 w-8 rounded-full" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

function parseContactNumbers(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((number) => number.trim())
        .filter(Boolean),
    ),
  ];
}
