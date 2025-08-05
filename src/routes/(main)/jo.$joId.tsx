import { AddItemDialog } from "@/components/jo/add-item-dialog"
import { AddPaymentDialog } from "@/components/jo/add-payment-dialog"
import { Container } from "@/components/layouts/container"
import { PrintJoButton } from "@/components/printer/print-jo-button"
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
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  BanknoteIcon,
  Calendar,
  Clock,
  Package,
  PhilippinePesoIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react"

export const Route = createFileRoute("/(main)/jo/$joId")({
  component: JoDetailComponent,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const id = params.joId as Id<"jo">
    const jo = await qc.ensureQueryData(convexQuery(api.jo.getOneComplete, { id }))

    return {
      joNumber: jo?.joNumber,
      crumb: [
        { value: "Job Order", href: "/jo/", type: "static" },
        { value: params.joId, href: `/jo/${params.joId}`, type: "jo" },
      ],
    }
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
})

function JoDetailComponent() {
  const router = useRouter()
  const handleGoBackOrJo = () => {
    // Check if there's a previous entry in the history that we can go back to.
    // The history.length check is a common heuristic, though not foolproof
    // in all edge cases (e.g., if the user opened a new tab directly to this page).
    // However, for typical in-app navigation, it works well.
    if (router.history.length > 1) {
      router.history.back()
    } else {
      // No discernible previous history, so navigate to "/jo"
      router.navigate({ to: "/jo" })
    }
  }
  // Fetch job order with items using Convex API
  // Suspense query for /jo/${joId} route
  // Fetch job order with items using Convex API
  // Suspense query for /jo/${joId} route

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
  )
}
function PaymentCard() {
  const { joId } = Route.useParams()
  const { data: jo } = useSuspenseQuery(
    // Fetch job order with items using Convex API
    // Suspense query for /jo/${joId} route
    convexQuery(api.jo.getOneComplete, { id: joId as Id<"jo"> }),
  )

  const { mutateAsync: deletePayment, isPending } = useMutation({
    mutationFn: useConvexMutation(api.payment.deletePayment),
  })

  if (!jo) {
    return null
  }
  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BanknoteIcon className="h-6 w-6" />
            <p className="">Payment/s</p>
          </CardTitle>
          <div>
            <AddPaymentDialog
              joId={joId as Id<"jo">}
              totalPayments={jo.totalPayments}
              totalOrderValue={jo.totalOrderValue}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {jo.payments && jo.payments.length > 0 ? (
          <ScrollArea className="h-56">
            <div className="flex flex-col gap-2 md:gap-4">
              {jo.payments.map((payment) => (
                <div
                  key={payment._id}
                  className="bg-accent dark:bg-accent/20 flex items-center justify-between rounded pr-4"
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
                    onClick={() => deletePayment({ paymentId: payment._id })}
                    disabled={isPending}
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
  )
}

function JoItemsCard() {
  const { joId } = Route.useParams()

  const { data: jo } = useSuspenseQuery(
    // Fetch job order with items using Convex API
    // Suspense query for /jo/${joId} route
    convexQuery(api.jo.getOneComplete, { id: joId as Id<"jo"> }),
  )
  if (jo === null) {
    return null
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h3 className="text-lg font-bold">Order Items ({jo.items.length})</h3>
          </div>

          <AddItemDialog joId={joId as Id<"jo">} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jo.items.map((item) => (
                <TableRow key={item._id} className="group">
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.price)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.quantity * item.price)}
                  </TableCell>
                  <TableCell className="w-12 text-right">
                    <DeleteItemButton itemId={item._id} />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2">
                <TableCell colSpan={3} className="text-right font-semibold">
                  Total Order Value
                </TableCell>
                <TableCell className="text-right text-lg font-bold">
                  {formatCurrency(jo.totalOrderValue)}
                </TableCell>
                <TableCell className="w-12 text-right"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function JobOrderCard() {
  const { joId } = Route.useParams()
  const navigate = useNavigate()

  const { data: jo } = useSuspenseQuery(
    // Fetch job order with items using Convex API
    // Suspense query for /jo/${joId} route
    convexQuery(api.jo.getOneComplete, { id: joId as Id<"jo"> }),
  )

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.jo.deleteJo),
    onSuccess: () => {
      navigate({ to: "/jo" })
    },
  })
  const deleteJo = () => mutate({ joId: joId as Id<"jo"> })

  if (jo === null) {
    return <div className="text-muted-foreground text-center">No Items</div>
  }

  return (
    <Card className="">
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
                <Button variant="destructive-ghost">
                  <Trash2Icon />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={deleteJo}
                    disabled={isPending}
                  >
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <Calendar className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Pickup Date</p>
              <p className="text-muted-foreground text-sm">
                {new Date(Number(jo.pickupDate)).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="text-muted-foreground text-sm">
                {new Date(jo._creationTime).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Package className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Total Items</p>
              <p className="text-muted-foreground text-sm">{jo.items.length} items</p>
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
          <p>
            Balance
            {jo.totalPayments > jo.totalOrderValue - 1 && (
              <Badge className="bg-green-100 text-green-700">Fully Paid</Badge>
            )}
          </p>
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
  )
}

function DeleteItemButton({ itemId }: { itemId: Id<"items"> }) {
  const { mutate: deleteItem, isPending } = useMutation({
    mutationFn: useConvexMutation(api.items.deleteItem),
  })

  return (
    <Button
      variant="destructive-ghost"
      size="sm"
      className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
      onClick={() => deleteItem({ itemId })}
      disabled={isPending}
    >
      <Trash2Icon className="h-4 w-4" />
    </Button>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}
