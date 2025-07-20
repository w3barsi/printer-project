import { Link, createFileRoute } from "@tanstack/react-router"

import { Container } from "@/components/layouts/container"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
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
import { useDevice } from "@/contexts/DeviceContext"
import { printReceipt } from "@/lib/printer"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Calendar, Package } from "lucide-react"
import { Suspense } from "react"

export const Route = createFileRoute("/(main)/jo/")({
  component: RouteComponent,
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(convexQuery(api.jo.getWithItems, {}))

    return { crumb: [{ value: "Job Orders", href: "/jo/", type: "static" }] }
  },
})

const getStatusColor = (status: string) => {
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}

function RouteComponent() {
  const { device } = useDevice()

  return (
    <Container>
      <div className="flex items-center justify-between">
        <div className="">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Job Orders</h1>
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <JobOrderList device={device} />
      </Suspense>
    </Container>
  )
}

function JobOrderList({ device }: { device: USBDevice | null }) {
  const { data } = useSuspenseQuery(convexQuery(api.jo.getWithItems, {}))
  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          All Job Orders ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {data.map((jo) => {
            const totalValue = jo.items.reduce(
              (sum, item) => sum + item.quantity * item.price,
              0,
            )
            const totalItems = jo.items.reduce((sum, item) => sum + item.quantity, 0)

            return (
              <AccordionItem key={jo.jo._id} value={jo.jo._id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full items-center justify-between pr-4">
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <div className="text-lg font-semibold">
                          <Link
                            to="/jo/$joId"
                            params={{ joId: jo.jo._id }}
                            className="hover:underline"
                          >
                            {jo.jo.name}
                          </Link>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          Pickup: {new Date(Number(jo.jo.pickupDate)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <div className="font-medium">{formatCurrency(totalValue)}</div>
                        <div className="text-muted-foreground">{totalItems} items</div>
                      </div>
                      <Badge variant="secondary" className={getStatusColor(jo.jo.status)}>
                        {jo.jo.status.replace("-", " ")}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4">
                    <div className="flex w-full items-center justify-between">
                      <div className="mb-4">
                        <h4 className="mb-2 text-lg font-semibold">Order Items</h4>
                        <p className="text-muted-foreground text-sm">
                          Items included in job order {jo.jo.joNumber}
                        </p>
                      </div>
                      <Button onClick={async () => await printReceipt({ device, jo })}>
                        Print
                      </Button>
                    </div>

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
                              <TableCell className="text-center">
                                {item.quantity}
                              </TableCell>
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
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
    </Card>
  )
}
