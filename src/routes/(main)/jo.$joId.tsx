import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeftIcon, Calendar, Clock, Package } from "lucide-react"

export const Route = createFileRoute("/(main)/jo/$joId")({
  component: JoDetailComponent,
  loader: async ({ context: { queryClient: qc }, params }) => {
    const id = params.joId as Id<"jo">
    await qc.ensureQueryData(convexQuery(api.jo.getOneWithItems, { id }))

    return {
      crumb: [
        { value: "Job Order", href: "/jo/", type: "static" },
        { value: params.joId, href: `/jo/${params.joId}`, type: "jo" },
      ],
    }
  },
})

function JoDetailComponent() {
  const { joId } = Route.useParams()

  const { data: jo } = useSuspenseQuery(
    convexQuery(api.jo.getOneWithItems, { id: joId as Id<"jo"> }),
  )

  if (jo === null) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h2 className="mb-2 text-xl font-semibold">Job Order Not Found</h2>
            <p className="text-muted-foreground">
              The requested job order could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalValue = jo.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const totalItems = jo.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4">
      <Button variant="ghost" asChild>
        <Link to="/jo">
          <ArrowLeftIcon /> Back
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                <Package className="h-6 w-6" />
                {jo.jo.name}
              </CardTitle>
              <p className="text-muted-foreground mt-1">Job Order #{jo.jo.joNumber}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Calendar className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Pickup Date</p>
                <p className="text-muted-foreground text-sm">
                  {new Date(Number(jo.jo.pickupDate)).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-muted-foreground text-sm">
                  {new Date(jo.jo._creationTime).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Total Items</p>
                <p className="text-muted-foreground text-sm">{totalItems} items</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Items ({jo.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jo.items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.quantity * item.price)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={3} className="font-semibold">
                    Total Order Value
                  </TableCell>
                  <TableCell className="text-right text-lg font-bold">
                    {formatCurrency(totalValue)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "in-progress":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}
