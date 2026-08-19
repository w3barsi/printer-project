import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
} from "@/components/ui/table";

const PAGE_SIZE = 12;

const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(120),
  handler: z.string().trim().max(120),
  contactNumbers: z.string(),
});

type CustomerFormData = z.infer<typeof customerSchema>;
type Customer = {
  _id: Id<"customer">;
  _creationTime: number;
  name: string;
  handler?: string;
  contactNumbers?: string[];
  createdByName: string;
};

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Customers</h1>
          <p className="text-sm text-muted-foreground">
            Maintain customer contacts and review their Job Orders.
          </p>
        </div>
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
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.customer.list, {
      paginationOpts: { numItems: PAGE_SIZE, cursor },
    }),
  );

  return (
    <Card className="pt-6 pb-0">
      <CardHeader>
        <CardTitle>Customers</CardTitle>
        <CardDescription>Most recently created customers appear first.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Name</TableHead>
              <TableHead>Handler</TableHead>
              <TableHead>Contact numbers</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="w-0 pr-6 text-right">Actions</TableHead>
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
                  <TableCell className="pl-6 font-medium">
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
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
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

function CustomerTableSkeleton() {
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
