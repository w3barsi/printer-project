import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { CreateDialog } from "@/components/create-jo"
import { Container } from "@/components/layouts/container"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
import { useConvex } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
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
          <Suspense fallback={<JobOrderSkeleton />}>
            <JobOrderList />
          </Suspense>
        </div>
      </Container>
    </>
  )
}

function JobOrderSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Table className="table-fixed">
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
          <JobOrderListBodySkeleton />
        </TableBody>
      </Table>
      <Separator />
      <div className="flex w-full flex-row-reverse gap-2">
        <Button>
          Next <ArrowRightIcon />
        </Button>
        <Button>
          <ArrowLeftIcon />
          Prev
        </Button>
      </div>
    </div>
  )
}

function JobOrderList() {
  const convex = useConvex()
  const { data, hasNextPage, fetchNextPage, isFetching, isLoading } =
    useSuspenseInfiniteQuery({
      queryKey: ["jo"],
      async queryFn({ pageParam }: { pageParam: string | null }) {
        const result = await convex.query(api.jo.getWithPagination, {
          paginationOptions: {
            cursor: pageParam,
            numItems: 10,
          },
        })
        return result
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: null,
    })

  const [page, setPage] = useState(0)

  const jos = data.pages[page].jos

  const noMoreNextPageCondition = !hasNextPage && page === data.pages.length - 1

  const goToNextPage = () => {
    if (noMoreNextPageCondition) {
      return toast.error("No more job orders")
    }

    if (page === data.pages.length - 1 && hasNextPage) {
      fetchNextPage().then(() => setPage((i) => i + 1))
    } else {
      setPage((i) => i + 1)
    }
  }

  const goToPreviousPage = () => {
    if (page > 0) {
      setPage((prev) => prev - 1)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Table className="table-fixed">
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
          <JobOrderListBody jos={jos} />
        </TableBody>
      </Table>
      <Separator />
      <div className="flex w-full flex-row-reverse gap-2">
        <Button
          onClick={() => goToNextPage()}
          disabled={isFetching || noMoreNextPageCondition}
        >
          Next <ArrowRightIcon />
        </Button>
        <Button onClick={() => goToPreviousPage()} disabled={page === 0}>
          <ArrowLeftIcon />
          Prev
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

  return (
    <>
      {jos.map((jo) => (
        <TableRow
          key={jo._id}
          className="cursor-pointer border-none"
          onClick={() => navigate({ to: "/jo/$joId", params: { joId: jo._id } })}
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
          <TableCell className="py-4 pl-6 first:rounded-l-lg">{jo.name}</TableCell>
          <TableCell className="">
            {new Date(jo._creationTime).toLocaleDateString()}
          </TableCell>
          <TableCell className="">
            {jo.contactNumber ? jo.contactNumber : "N/A"}
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
      {jos.length < 10 &&
        Array.from({ length: 10 - jos.length }).map((_, idx) => (
          // eslint-disable-next-line @eslint-react/no-array-index-key
          <TableRow key={idx} className="border-none">
            <TableCell className="py-4 pl-6 first:rounded-l-lg">&nbsp;</TableCell>
            <TableCell className="">&nbsp;</TableCell>
            <TableCell className="">&nbsp;</TableCell>
            <TableCell className="text-right">&nbsp;</TableCell>
            <TableCell className="flex justify-center">&nbsp;</TableCell>
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
      {Array.from({ length: 10 }).map((_, idx) => (
        // eslint-disable-next-line @eslint-react/no-array-index-key
        <TableRow key={idx} className="border-none">
          <TableCell className="py-4 pl-6 first:rounded-l-lg">
            <Skeleton className="h-5 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-28" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-5 w-20" />
          </TableCell>
          <TableCell className="flex justify-center">
            <Skeleton className="h-9 w-20 rounded-md" />
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
