import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"

import { CreateDialog } from "@/components/create-jo"
import { Container } from "@/components/layouts/container"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
import { ArrowLeftIcon, ArrowRightIcon, HashIcon, PrinterIcon } from "lucide-react"
import { Suspense, useState } from "react"
import { toast } from "sonner"

export const Route = createFileRoute("/(main)/jo/")({
  component: RouteComponent,
  loader: () => {
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
          <Suspense fallback={<div>Loading...</div>}>
            <JobOrderList />
          </Suspense>
        </div>
      </Container>
    </>
  )
}

type CursorHistory = (string | null)[]

function JobOrderList() {
  const [history, setHistory] = useState<CursorHistory>([])

  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.jo.getWithPagination, {
      paginationOptions: {
        numItems: 10,
        cursor: history.length > 0 ? history[history.length - 1] : null,
      },
    }),
  )

  const handleNext = () => {
    if (data.nextCursor) {
      const a = data.nextCursor
      setHistory((prev) => [...prev, a])
    }
  }

  const handlePrev = () => {
    setHistory((prev) => prev.slice(0, prev.length - 1))
  }

  const jos = data.jos

  return (
    <div className="flex flex-col gap-4">
      <Table className="table-fixed">
        <TableHeader className="bg-foreground rounded-lg">
          <TableRow className="*:text-background border-none hover:bg-gray-50">
            <TableHead className="w-16 font-semibold first:rounded-l-lg">
              <HashIcon className="h-4 w-4" />
            </TableHead>
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="text-center font-semibold">Pickup Date</TableHead>
            <TableHead className="text-center font-semibold">Contact Number</TableHead>
            <TableHead className="text-right font-semibold">Total Value</TableHead>
            <TableHead className="w-12 font-semibold last:rounded-r-lg"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <JobOrderListBody jos={jos} />
        </TableBody>
      </Table>
      <Separator />
      <div className="flex w-full justify-center gap-2">
        <Button
          onClick={handlePrev}
          variant="outline"
          disabled={isFetching || history.length === 0}
        >
          <ArrowLeftIcon /> Prev
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={isFetching || !data.nextCursor}
        >
          Next <ArrowRightIcon />
        </Button>
      </div>
    </div>
  )
}

function JobOrderListBody({ jos }: { jos: JoWithItems[] }) {
  // const [page, setPage] = useState(1)

  // const { data } = useSuspenseQuery(
  //   convexQuery(api.jo.getWithItems, {
  //     paginationopts: { cursor: null, numItems: 10 },
  //   }),
  // )

  const navigate = useNavigate()
  const { preloadRoute } = useRouter()

  return (
    <>
      {jos.map((jo) => (
        <TableRow
          key={jo._id}
          className="focus-within:bg-muted/50 cursor-pointer border-none"
          onClick={() => navigate({ to: "/jo/$joId", params: { joId: jo._id } })}
          onMouseDown={(e) => {
            e.preventDefault()
            preloadRoute({ to: "/jo/$joId", params: { joId: jo._id } })
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              navigate({ to: "/jo/$joId", params: { joId: jo._id } })
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`View job order details for ${jo.name}`}
        >
          <TableCell className="flex w-16">
            <span>{jo.joNumber}</span>
          </TableCell>
          <TableCell className="">{jo.name}</TableCell>
          <TableCell className="text-center">
            {new Date(jo._creationTime).toLocaleDateString()}
          </TableCell>
          <TableCell className="text-center">
            {jo.contactNumber ? jo.contactNumber : "N/A"}
          </TableCell>

          <TableCell className="text-right">
            {formatCurrency(
              jo.items.reduce((sum, item) => sum + item.quantity * item.price, 0),
            )}
          </TableCell>
          <TableCell className="w-12">
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
    <Button onClick={handlePrint} variant="ghost">
      <PrinterIcon />
    </Button>
  )
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}
