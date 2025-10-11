import { AddItemDialog } from "@/components/jo/add-item-dialog";
import { AddPaymentDialog } from "@/components/jo/add-payment-dialog";
import { Container } from "@/components/layouts/container";
import { PrintJoButton } from "@/components/printer/print-jo-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useCanGoBack,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useMutation } from "convex/react";
import {
  ArrowLeftIcon,
  BanknoteIcon,
  Calendar,
  Clock,
  Package,
  PhilippinePesoIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";

export const Route = createFileRoute("/(main)/jo/$joId")({
  component: JoDetailComponent,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const id = params.joId as Id<"jo">;
    const jo = await qc.ensureQueryData(convexQuery(api.jo.getOneComplete, { id }));

    return {
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
  const canGoBack = useCanGoBack();
  const router = useRouter();
  const navigate = Route.useNavigate();

  const handleGoBackOrJo = () => {
    // https://x.com/reactreaper/status/1960062834877894823/photo/1
    if (canGoBack) {
      router.history.back();
    } else {
      navigate({ to: "/jo" });
    }
  };
  return (
    <Container className="flex flex-col gap-2 md:gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleGoBackOrJo}>
          <ArrowLeftIcon /> Back
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:gap-4 lg:grid-cols-2">
        <JobOrderCard />
        <PaymentCard />
      </div>
      <JoItemsCard />
    </Container>
  );
}
function PaymentCard() {
  const { joId } = Route.useParams();
  const { data: jo } = useSuspenseQuery(
    // Fetch job order with items using Convex API
    // Suspense query for /jo/${joId} route
    convexQuery(api.jo.getOneComplete, { id: joId as Id<"jo"> }),
  );

  const deletePayment = useMutation(api.payment.deletePayment);

  if (!jo) {
    return null;
  }
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <BanknoteIcon className="h-6 w-6" />
          <p>Payment/s</p>
        </CardTitle>
        <AddPaymentDialog
          joId={joId as Id<"jo">}
          totalPayments={jo.totalPayments}
          totalOrderValue={jo.totalOrderValue}
        />
      </CardHeader>
      <CardContent>
        {jo.payments && jo.payments.length > 0 ? (
          <ScrollArea className="h-56">
            <div className="flex flex-col gap-2 md:gap-4">
              {jo.payments.map((payment) => (
                <div
                  key={payment._id}
                  className="bg-accent/20 dark:bg-accent/20 flex items-center justify-between rounded pr-4"
                >
                  <div className="flex gap-2 rounded p-2 md:gap-4 md:p-4">
                    <span className="size-10 rounded-full bg-green-200 p-2 text-center text-green-700">
                      <PhilippinePesoIcon className="s-4" />
                    </span>
                    <div className="flex w-full flex-col justify-between">
                      <div>₱{payment.amount.toFixed(2)}</div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>
                          {new Date(payment._creationTime).toLocaleDateString()}
                        </span>
                        {payment.createdByName && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              <span>{payment.createdByName}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive-ghost"
                    size="icon"
                    onClick={() => deletePayment({ paymentId: payment._id })}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-muted-foreground text-center">No payments yet</div>
        )}
      </CardContent>
    </Card>
  );
}

function JoItemsCard() {
  const { joId } = Route.useParams();

  const { data: jo } = useSuspenseQuery(
    // Fetch job order with items using Convex API
    // Suspense query for /jo/${joId} route
    convexQuery(api.jo.getOneComplete, { id: joId as Id<"jo"> }),
  );
  if (jo === null) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <h3 className="text-lg font-bold">Order Items ({jo.items.length})</h3>
        </div>

        <AddItemDialog joId={joId as Id<"jo">} />
      </div>

      <TableWrapper>
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="font-semibold md:pl-4">Item Name</TableHead>
              <TableHead className="text-center font-semibold">Quantity</TableHead>
              <TableHead className="text-right font-semibold">Unit Price</TableHead>
              <TableHead className="text-right font-semibold">Total</TableHead>
              <TableHead className="w-12 font-semibold"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jo.items.map((item) => (
              <TableRow key={item._id} className="group">
                <TableCell className="font-medium md:pl-4">{item.name}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.quantity * item.price)}
                </TableCell>
                <TableCell className="w-12 text-right">
                  <DeleteItemButton itemId={item._id} />
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2">
              <TableCell colSpan={3} className="text-right font-semibold md:pr-4">
                Total Order Value
              </TableCell>
              <TableCell className="text-right text-lg font-bold md:pr-4">
                {formatCurrency(jo.totalOrderValue)}
              </TableCell>
              <TableCell className="w-12 text-right"></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableWrapper>
    </div>
  );
}

function JobOrderCard() {
  const { joId } = Route.useParams();
  const navigate = useNavigate();

  const { data: jo } = useSuspenseQuery(
    // Fetch job order with items using Convex API
    // Suspense query for /jo/${joId} route
    convexQuery(api.jo.getOneComplete, { id: joId as Id<"jo"> }),
  );

  const mutate = useMutation(api.jo.deleteJo).withOptimisticUpdate((localStore, args) => {
    const getWithPaginationArgs = { paginationOptions: { cursor: null, numItems: 10 } };

    const currentValue = localStore.getQuery(
      api.jo.getWithPagination,
      getWithPaginationArgs,
    );

    if (currentValue === undefined) {
      return;
    }

    const newValue = {
      nextCursor: currentValue.nextCursor,
      jos: currentValue.jos.filter((c) => c._id !== args.joId),
    };

    localStore.setQuery(api.jo.getWithPagination, getWithPaginationArgs, newValue);
  });
  const deleteJo = () => {
    mutate({ joId: joId as Id<"jo"> });
    navigate({ to: "/jo" });
  };

  if (jo === null) {
    return <div className="text-muted-foreground text-center">No Items</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <Package className="h-6 w-6" />
              {jo.name}
            </CardTitle>
            <p className="text-muted-foreground mt-1">Job Order #{jo.joNumber}</p>
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive-ghost" size="icon">
                  <Trash2Icon />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this Job
                    Order.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={deleteJo}>
                    <Trash2Icon />
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <PrintJoButton jo={jo} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-sm font-medium">Pickup Date</p>
              <p className="text-sm">
                {new Date(Number(jo.pickupDate)).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-sm font-medium">Created</p>
              <p className="text-sm">{new Date(jo._creationTime).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Package className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total Items</p>
              <p className="text-sm">{jo.items.length} items</p>
            </div>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <p>Total Order Value</p>
          <p>₱{jo.totalOrderValue.toFixed(2)}</p>
        </div>
        <div className="flex items-center justify-between">
          <p>Total Payments</p>
          <p className="text-xl font-bold text-green-600">
            ₱{jo.totalPayments.toFixed(2)}
          </p>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p>Balance</p>
            {jo.totalPayments > jo.totalOrderValue - 1 && (
              <Badge className="bg-green-100 text-green-700">Fully Paid</Badge>
            )}
          </div>
          <p
            className={cn(
              jo.totalPayments === jo.totalOrderValue ||
                jo.totalPayments > jo.totalOrderValue
                ? "text-green-600"
                : "text-red-700",
              "text-xl font-bold",
            )}
          >
            ₱{(jo.totalPayments - jo.totalOrderValue).toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteItemButton({ itemId }: { itemId: Id<"items"> }) {
  const { joId } = Route.useParams();
  const deleteItem = useMutation(api.items.deleteItem).withOptimisticUpdate(
    (localStore, args) => {
      const currentValue = localStore.getQuery(api.jo.getOneComplete, {
        id: joId as Id<"jo">,
      });

      if (!currentValue) {
        return;
      }

      const newValue = {
        ...currentValue,
        items: currentValue.items.filter((c) => c._id !== args.itemId),
      };
      localStore.setQuery(api.jo.getOneComplete, { id: joId as Id<"jo"> }, newValue);
    },
  );

  return (
    <Button
      variant="destructive-ghost"
      size="icon"
      onClick={() => deleteItem({ itemId })}
    >
      <Trash2Icon />
    </Button>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}
