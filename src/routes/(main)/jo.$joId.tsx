import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontalIcon, PackageIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { AddItemDialog } from "@/components/jo/add-item-dialog";
import { DeleteItemAlertDialog } from "@/components/jo/delete-item-alert-dialog";
import { DeleteJoAlertDialog } from "@/components/jo/delete-jo-alert-dialog";
import { EditItemDialog } from "@/components/jo/edit-item-dialog";
import { PaymentsCard } from "@/components/jo/payment-card";
import { Container } from "@/components/layouts/container";
import { PrintJoButton } from "@/components/printer/print-jo-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Item } from "@/types/convex";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export const Route = createFileRoute("/(main)/jo/$joId")({
  component: JoDetailComponent,
  loader: async ({ context, params }) => {
    const id = params.joId as Id<"jo">;
    const jo = await context.queryClient.ensureQueryData(
      convexQuery(api.jo.getOneComplete, { id }),
    );

    return {
      joId: id,
      joNumber: jo?.joNumber,
      crumb: [
        { value: "Job Order", href: "/jo/", type: "static" },
        { value: params.joId, href: `/jo/${params.joId}`, type: "jo" },
      ],
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        name: "description",
        content: "My App is a web application",
      },
      {
        title: `Job Order #${loaderData?.joNumber} | DG`,
      },
    ],
  }),
});

function JoDetailComponent() {
  const { joId } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  useHotkeys("b", () => navigate({ to: "/jo" }));

  return (
    <Container className="pwa-padding flex flex-col">
      <JobOrderHeader />
      <div className="grid gap-2 md:gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-2 md:gap-4 lg:col-span-2">
          <JoDetails />
          <JoOrderSummary />
          <JoItemsCard />
        </div>
        <PaymentsCard joId={joId} />
      </div>
      {/*  OLD CODE BELOW */}
    </Container>
  );
}

function JoOrderSummary() {
  const { joId } = Route.useLoaderData();
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));

  if (!jo) {
    return <div> Error JO Not Found</div>;
  }
  const balance = jo.totalPayments - jo.totalOrderValue;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 md:gap-4">
          <div className="flex items-center justify-between">
            <p className="">Total Order Value</p>
            <p className="font-mono text-xl">{formatCurrency(jo.totalOrderValue)}</p>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="">Total Payments</p>
            <p className="font-mono text-xl">{formatCurrency(jo.totalPayments)}</p>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="">Balance</p>
            <p
              className={cn(
                "font-mono text-xl",
                balance >= 0 ? "text-green-600" : "text-red-700",
              )}
            >
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function JoDetails() {
  const { joId } = Route.useLoaderData();
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));

  if (!jo) {
    return <div> Error JO Not Found</div>;
  }

  const itemCount = jo.items.reduce((acc, curr) => acc + curr.quantity * 1, 0);

  return (
    <div className="flex w-full flex-col gap-2 md:flex-row md:gap-4">
      <Card className="flex-1 gap-0">
        <CardHeader>
          <CardDescription>PICKUP DATE</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xl">
            {new Date(Number(jo.pickupDate)).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
      <Card className="flex-1 gap-0">
        <CardHeader>
          <CardDescription>CREATED AT</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xl">
            {new Date(Number(jo._creationTime)).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
      <Card className="flex-1 gap-0">
        <CardHeader>
          <CardDescription>TOTAL ITEMS</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xl">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function JobOrderHeader() {
  const { joId } = Route.useLoaderData();
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));

  if (!jo) {
    return <div> Error JO Not Found</div>;
  }

  return (
    <div className="flex items-center justify-between px-2 py-4 md:py-0">
      <div className="flex flex-col items-center md:gap-0">
        <span className="flex items-center gap-2">
          <PackageIcon />
          <h1 className="text-3xl font-bold">{jo?.name}</h1>
        </span>
        <p className="text-muted-foreground text-sm">Job Order #{jo?.joNumber}</p>
      </div>
      <div className="flex gap-2">
        <PrintJoButton jo={jo} />
        <DeleteJoAlertDialog joId={joId} />
      </div>
    </div>
  );
}

function JoItemsCard() {
  const { joId } = Route.useLoaderData();

  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));
  const [item, setItem] = useState<Item | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertDialogOpen, setIsDeleteAlertDialogOpen] = useState(false);

  if (jo === null) {
    return null;
  }
  console.log(joId);

  return (
    <>
      <EditItemDialog
        open={isEditDialogOpen}
        setOpen={setIsEditDialogOpen}
        item={item}
        joId={joId}
      />
      <DeleteItemAlertDialog
        open={isDeleteAlertDialogOpen}
        setOpen={setIsDeleteAlertDialogOpen}
        item={item}
        joId={joId}
      />
      <Card className="pt-6 pb-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Order Items</h3>

            <AddItemDialog joId={joId} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="">
              <TableRow>
                <TableHead className="text-muted-foreground text-xs font-semibold uppercase md:pl-4">
                  Item Name
                </TableHead>
                <TableHead className="text-muted-foreground text-center text-xs font-semibold uppercase">
                  Quantity
                </TableHead>
                <TableHead className="text-muted-foreground text-right text-xs font-semibold uppercase">
                  Unit Price
                </TableHead>
                <TableHead className="text-muted-foreground text-right text-xs font-semibold uppercase">
                  Total
                </TableHead>
                <TableHead className="text-muted-foreground w-12 text-xs font-semibold uppercase"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jo.items.map((item) => (
                <TableRow key={item._id} className="group">
                  <TableCell className="font-medium md:pl-4">{item.name}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.price)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.quantity * item.price)}
                  </TableCell>
                  <TableCell className="w-12 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setIsEditDialogOpen(true);
                            setItem(item);
                          }}
                        >
                          <PencilIcon />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            setIsDeleteAlertDialogOpen(true);
                            setItem(item);
                          }}
                        >
                          <Trash2Icon />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="border-t-2">
                <TableCell
                  colSpan={3}
                  className="text-lg font-semibold md:pl-4"
                ></TableCell>
                <TableCell className="text-right">
                  <span className="text-muted-foreground text-xs">Total Order Value</span>
                  <p className="text-lg">{formatCurrency(jo.totalOrderValue)}</p>
                </TableCell>
                <TableCell className=""></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}
