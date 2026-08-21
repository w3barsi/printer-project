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
  ReceiptTextIcon,
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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

const JOB_ORDER_PAGE_SIZE = 10;

const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(120),
  handler: z.string().trim().max(120),
  contactNumbers: z.string(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export const Route = createFileRoute("/app/_admin/admin/customers/$customerId")({
  component: RouteComponent,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const customerId = params.customerId as Id<"customer">;
    const customer = await qc.ensureQueryData(
      convexQuery(api.customer.get, { customerId }),
    );

    if (!customer) throw notFound();

    await qc.ensureQueryData(
      convexQuery(api.customer.listJobOrders, {
        customerId,
        paginationOpts: { numItems: JOB_ORDER_PAGE_SIZE, cursor: null },
      }),
    );

    return {
      customerId,
      customerName: customer.name,
      crumb: [
        { value: "Manage Customers", href: "/app/admin/customers", type: "static" },
        {
          value: customer.name,
          href: `/app/admin/customers/${customer._id}`,
          type: "static",
        },
      ],
    };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.customerName ?? "Customer"} | DG` }],
  }),
});

function RouteComponent() {
  const { customerId } = Route.useLoaderData();
  const { data: customer } = useSuspenseQuery(
    convexQuery(api.customer.get, { customerId }),
  );

  if (!customer) return null;

  return (
    <Container className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            nativeButton={false}
            render={<Link to="/app/admin/customers" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Customers
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-sm text-muted-foreground">
              Customer since {new Date(customer._creationTime).toLocaleDateString()} ·
              Added by {customer.createdByName}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.5fr)]">
        <CustomerProfile customer={customer} />
        <CustomerJobOrders customerId={customer._id} customerName={customer.name} />
      </div>
    </Container>
  );
}

function CustomerProfile({
  customer,
}: {
  customer: {
    _id: Id<"customer">;
    name: string;
    handler?: string;
    contactNumbers?: string[];
  };
}) {
  const updateCustomer = useConvexMutation(api.customer.update);
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer.name,
      handler: customer.handler ?? "",
      contactNumbers: customer.contactNumbers?.join(", ") ?? "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: CustomerFormData) =>
      updateCustomer({
        customerId: customer._id,
        name: values.name,
        handler: values.handler || undefined,
        contactNumbers: parseContactNumbers(values.contactNumbers),
      }),
    onSuccess: () => {
      toast.success("Customer updated");
      form.reset(form.getValues());
    },
    onError: (error) => toast.error(error.message || "Could not update customer"),
  });

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Customer Details</CardTitle>
        <CardDescription>
          Contact information used when creating Job Orders.
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
                  <FieldLabel htmlFor="customer-name">Customer name</FieldLabel>
                  <Input
                    {...field}
                    id="customer-name"
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
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
                  <FieldLabel htmlFor="customer-handler">Handler</FieldLabel>
                  <Input
                    {...field}
                    id="customer-handler"
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
                  <FieldLabel htmlFor="customer-contacts">Contact numbers</FieldLabel>
                  <Input
                    {...field}
                    id="customer-contacts"
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

function CustomerJobOrders({
  customerId,
  customerName,
}: {
  customerId: Id<"customer">;
  customerName: string;
}) {
  const navigate = useNavigate();
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.customer.listJobOrders, {
      customerId,
      paginationOpts: { numItems: JOB_ORDER_PAGE_SIZE, cursor },
    }),
  );

  return (
    <Card className="pt-6 pb-0">
      <CardHeader>
        <CardTitle>Job Orders</CardTitle>
        <CardDescription>Orders linked to {customerName}, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        {data.page.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">JO</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead className="w-0 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.page.map((jobOrder) => (
                <TableRow
                  key={jobOrder._id}
                  className="cursor-pointer"
                  onClick={(event) => {
                    if (
                      event.target instanceof Element &&
                      event.target.closest("a, button")
                    ) {
                      return;
                    }
                    navigate({
                      to: "/app/jo/$joId",
                      params: { joId: jobOrder._id },
                    });
                  }}
                >
                  <TableCell className="pl-6 font-medium">
                    <Link
                      to="/app/jo/$joId"
                      params={{ joId: jobOrder._id }}
                      className="underline-offset-4 hover:underline"
                    >
                      #{jobOrder.joNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{formatStatus(jobOrder.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    {jobOrder.pickupDate
                      ? new Date(jobOrder.pickupDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {jobOrder.contactNumber ?? "-"}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      nativeButton={false}
                      render={<Link to="/app/jo/$joId" params={{ joId: jobOrder._id }} />}
                    >
                      Open JO
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
                <ReceiptTextIcon />
              </EmptyMedia>
              <EmptyTitle>No Job Orders</EmptyTitle>
              <EmptyDescription>
                Job Orders created for {customerName} will appear here.
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

function formatStatus(status: string) {
  return status.replaceAll("-", " ");
}
