import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import {
  ChevronDownIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";

import { AddItemDialog } from "@/components/jo/add-item-dialog";
import { DeleteItemAlertDialog } from "@/components/jo/delete-item-alert-dialog";
import { DeleteJoAlertDialog } from "@/components/jo/delete-jo-alert-dialog";
import { EditItemDialog } from "@/components/jo/edit-item-dialog";
import { PaymentsCard } from "@/components/jo/payment-card";
import { Container } from "@/components/layouts/container";
import { PrintJoButton } from "@/components/printer/print-jo-button";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

export const Route = createFileRoute("/app/jo/$joId")({
  component: JoDetailComponent,
  loader: async ({ context, params }) => {
    const id = params.joId as Id<"jo">;

    const [jo] = await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.jo.getOneComplete, { id })),
      context.queryClient.ensureQueryData(
        convexQuery(api.public.orders.getOnlineOrderDetails, { joId: id }),
      ),
    ]);

    return {
      joId: id,
      joNumber: jo?.joNumber,
      crumb: [
        { value: "Job Order", href: "/app/jo/", type: "static" },
        { value: params.joId, href: `/app/jo/${params.joId}`, type: "jo" },
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
  useHotkeys("b", () => navigate({ to: "/app/jo" }));

  return (
    <Container className="pwa-padding flex flex-col">
      <JobOrderHeader />
      <div className="grid gap-2 md:gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-2 md:gap-4 lg:col-span-2">
          <JoDetails />
          <OnlineOrderDetailsCard />
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
    <div>
      <div>
        <Card className="block p-0 md:hidden">
          <CardContent className="flex gap-2 p-4">
            <div className="flex w-full flex-col items-center">
              <h3 className="text-muted-foreground">PICKUP DATE</h3>
              <p className="">{formatOptionalDate(jo.pickupDate)}</p>
            </div>
            <Separator orientation="vertical" />
            <div className="flex w-full flex-col items-center">
              <h3 className="text-muted-foreground">PICKUP DATE</h3>
              <p className="">
                {new Date(Number(jo._creationTime)).toLocaleDateString()}
              </p>
            </div>
            <Separator orientation="vertical" />
            <div className="flex w-full flex-col items-center">
              <h3 className="text-muted-foreground">TOTAL ITEMS</h3>
              <p className="">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="hidden w-full flex-col gap-2 md:flex md:flex-row md:gap-4">
        <Card className="flex-1 gap-0">
          <CardHeader>
            <CardDescription>PICKUP DATE</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl">{formatOptionalDate(jo.pickupDate)}</p>
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
    </div>
  );
}

function JobOrderHeader() {
  const { joId } = Route.useLoaderData();
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));
  const confirmOnlineOrder = useMutation(api.public.orders.confirmOnlineOrder);
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);

  if (!jo) {
    return <div> Error JO Not Found</div>;
  }

  const balance = jo.totalPayments - jo.totalOrderValue;
  const getStatusBadge = () => {
    if (jo.status === "unconfirmed") {
      return (
        <Badge variant="destructive" className="bg-amber-500/10 text-amber-600">
          Unconfirmed
        </Badge>
      );
    }

    if (balance >= 0) {
      return (
        <Badge
          variant="destructive"
          className="bg-green-500/10 text-green-600 focus-visible:ring-green-500/20 dark:bg-green-500/20 dark:focus-visible:ring-green-500/40 [a]:hover:bg-green-500/20"
        >
          Paid
        </Badge>
      );
    } else if (jo.totalPayments > 0) {
      return (
        <Badge
          variant="destructive"
          className="bg-amber-500/10 text-amber-500 focus-visible:ring-amber-500/20 dark:bg-amber-500/20 dark:focus-visible:ring-amber-500/40 [a]:hover:bg-amber-500/20"
        >
          Partial
        </Badge>
      );
    } else {
      return <Badge variant="destructive">Unpaid</Badge>;
    }
  };

  async function handleConfirm() {
    setIsConfirming(true);
    try {
      await confirmOnlineOrder({ joId });
      await queryClient.invalidateQueries();
      toast.success("Online order confirmed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to confirm order.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="flex items-center justify-between py-4 md:py-0">
      <div className="flex flex-col pr-4 md:gap-0">
        <h1 className="text-2xl font-bold">{jo?.name}</h1>
        <div className="flex gap-2">
          <p className="text-sm text-muted-foreground">Job Order #{jo?.joNumber}</p>
          {getStatusBadge()}
          {jo.source === "online-order" ? <Badge variant="outline">Online</Badge> : null}
        </div>
      </div>
      <div className="flex gap-2">
        {jo.status === "unconfirmed" && jo.source === "online-order" ? (
          <Button onClick={handleConfirm} disabled={isConfirming}>
            <CheckCircle2Icon className="h-4 w-4" />
            {isConfirming ? "Confirming" : "Confirm Order"}
          </Button>
        ) : null}
        {jo.status !== "unconfirmed" ? <PrintJoButton jo={jo} /> : null}
        <DeleteJoAlertDialog
          joId={joId}
          joName={jo.name}
          joNumber={String(jo.joNumber)}
        />
      </div>
    </div>
  );
}

function OnlineOrderDetailsCard() {
  const { joId } = Route.useLoaderData();
  const { data: jo } = useSuspenseQuery(convexQuery(api.jo.getOneComplete, { id: joId }));
  const [isOpen, setIsOpen] = useState(() => jo?.status === "unconfirmed");
  const { data } = useSuspenseQuery(
    convexQuery(api.public.orders.getOnlineOrderDetails, { joId }),
  );
  const getAttachmentUrl = useMutation(api.public.orders.getOrderAttachmentUrl);

  if (!data) {
    return null;
  }

  async function openAttachment(attachmentId: Id<"orderAttachments">) {
    try {
      const url = await getAttachmentUrl({ attachmentId });
      if (!url) {
        toast.error("Attachment URL is unavailable.");
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open attachment.");
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Online Order Details</CardTitle>
            <CardDescription>Customer-submitted intake details</CardDescription>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Toggle online order details">
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent asChild>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Customer" value={data.details.customerName} />
              <DetailField label="Mobile" value={data.details.mobile} />
              <DetailField label="Email" value={data.details.email ?? "N/A"} />
              <DetailField
                label="Submitted"
                value={formatOptionalDate(data.details.submittedAt)}
              />
              <DetailField
                label="Payment"
                value={formatKebab(data.details.paymentMethod)}
              />
              <DetailField
                label="Payment Proof"
                value={formatKebab(data.details.paymentProofStatus)}
              />
              <DetailField
                label="Upload Status"
                value={formatKebab(data.details.attachmentUploadStatus)}
              />
              <DetailField label="Notes" value={data.details.notes ?? "N/A"} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                Configured Items
              </h3>
              <div className="mt-2 space-y-2">
                {data.items.map((item) => (
                  <div key={item._id} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">
                      {item.width}ft x {item.height}ft · {item.areaSqft} sqft
                    </div>
                    <div className="text-muted-foreground">
                      {formatKebab(item.artworkOption)} ·{" "}
                      {formatCurrency(item.unitPricePerSqft)} / sqft
                    </div>
                    {item.designInstructions ? (
                      <p className="mt-2 text-muted-foreground">
                        {item.designInstructions}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                Attachments
              </h3>
              <div className="mt-2 space-y-2">
                {data.attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No uploaded attachments.
                  </p>
                ) : (
                  data.attachments.map((attachment) => (
                    <div
                      key={attachment._id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{attachment.filename}</div>
                        <div className="text-muted-foreground">
                          {formatKebab(attachment.kind)} · {attachment.mimeType} ·{" "}
                          {formatFileSize(attachment.size)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAttachment(attachment._id)}
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                        Open
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-sm break-words">{value}</div>
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

            {jo.status !== "unconfirmed" ? <AddItemDialog joId={joId} /> : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="">
              <TableRow>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase md:pl-4">
                  Item Name
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase">
                  Quantity
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">
                  Unit Price
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">
                  Total
                </TableHead>
                <TableHead className="w-12 text-xs font-semibold text-muted-foreground uppercase"></TableHead>
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
                    {jo.status !== "unconfirmed" ? (
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
                    ) : null}
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
                  <span className="text-xs text-muted-foreground">Total Order Value</span>
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

function formatOptionalDate(value: number | undefined) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatKebab(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
