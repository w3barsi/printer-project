import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"

import { CreateDialog } from "@/components/create-jo"
import { Container } from "@/components/layouts/container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import type { JoWithItems } from "@/types/convex"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"
import { toast } from "sonner"

export const Route = createFileRoute("/(main)/jo/")({
  component: RouteComponent,
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(convexQuery(api.jo.getWithItems, {}))

    return {
      crumb: [{ value: "Job Order", href: "/jo/", type: "static" }],
    }
  },
})

function RouteComponent() {
  return (
    <>
      <Container className="flex flex-col gap-2 md:gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Job Orders</h1>
          <CreateDialog />
        </div>
        <div className="w-full">
          <JobOrderList />
        </div>
      </Container>
    </>
  )
}
function JobOrderList() {
  return (
    <Table>
      <TableHeader className="bg-foreground rounded-lg">
        <TableRow className="*:text-background hover:bg-foreground border-none">
          <TableHead className="py-4 pl-6 first:rounded-l-lg">Name</TableHead>
          <TableHead>Pickup Date</TableHead>
          <TableHead>Contact Number</TableHead>
          <TableHead className="text-right">Total Value</TableHead>
          <TableHead className="w-32 text-center last:rounded-r-lg">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <Suspense fallback={<JobOrderListBodySkeleton />}>
          <JobOrderListBody />
        </Suspense>
      </TableBody>
    </Table>
  )
}

function JobOrderListBody() {
  const { data } = useSuspenseQuery(convexQuery(api.jo.getWithItems, {}))
  const navigate = useNavigate()
  const { preloadRoute } = useRouter()

  return (
    <>
      {data.map((jo) => (
        <TableRow
          key={jo.jo._id}
          className="cursor-pointer border-none"
          onClick={() => navigate({ to: "/jo/$joId", params: { joId: jo.jo._id } })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              navigate({ to: "/jo/$joId", params: { joId: jo.jo._id } })
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`View job order details for ${jo.jo.name}`}
        >
          <TableCell className="py-4 pl-6 first:rounded-l-lg">{jo.jo.name}</TableCell>
          <TableCell className="">
            {new Date(jo.jo._creationTime).toLocaleDateString()}
          </TableCell>
          <TableCell className="">
            {jo.jo.contactNumber ? jo.jo.contactNumber : "N/A"}
          </TableCell>

          <TableCell className="text-right">
            {formatCurrency(
              jo.items.reduce((sum, item) => sum + item.quantity * item.price, 0),
            )}
          </TableCell>
          <TableCell className="flex justify-center">
            <PrintButton jo={jo} />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function PrintButton({ jo }: { jo: JoWithItems }) {
  const { device, isConnected } = useDevice()

  const handlePrint = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!isConnected) {
      return toast.error("Printer not connected")
    }
    printReceipt({ jo, device })
  }

  return (
    <Button onClick={handlePrint} variant="outline">
      Print
    </Button>
  )
}

function JobOrderListBodySkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, idx) => (
        <TableRow key={idx} className="border-none">
          <TableCell className="py-4 pl-6 first:rounded-l-lg">
            <Skeleton />
          </TableCell>
          <TableCell className="">
            <Skeleton className="h-8 w-full" />
          </TableCell>
          <TableCell className="">
            <Skeleton className="h-8 w-full" />
          </TableCell>

          <TableCell className="text-right">
            <Skeleton className="h-8 w-full" />
          </TableCell>
          <TableCell className="flex justify-center">
            <Skeleton className="h-8 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}
