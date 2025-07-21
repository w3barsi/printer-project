import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { GetOneWithItemsReturnTypeNotNull } from "@/types/convex"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import { Suspense } from "react"

export const Route = createFileRoute("/(main)/jo")({
  component: RouteComponent,
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(convexQuery(api.jo.getWithItems, {}))
  },
})

function RouteComponent() {
  const location = useLocation()
  const hasJoId = location.pathname.split("/").length === 3

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <ScrollArea
        id="jo-list"
        className={cn(
          "h-full w-full bg-neutral-200/60 pb-8 xl:w-1/3 dark:bg-neutral-800",
          hasJoId && "hidden xl:flex",
        )}
      >
        <div className="flex items-center justify-between p-2 md:p-4">
          <h1 className="text-3xl font-bold tracking-tight">Job Orders</h1>
          <Button>
            <PlusIcon />
            Create
          </Button>
        </div>
        <div className="w-full px-2 md:px-4">
          <Suspense fallback={<div>Loading...</div>}>
            <JobOrderList />
          </Suspense>
        </div>
      </ScrollArea>
      <div
        className={cn(
          "w-full xl:flex xl:w-2/3",
          hasJoId && "w-full",
          !hasJoId && "hidden",
        )}
      >
        <Outlet />
      </div>
    </div>
  )
}

function JobOrderList() {
  const { data } = useSuspenseQuery(convexQuery(api.jo.getWithItems, {}))
  return (
    <div className="bg-background rounded">
      <div className="flex flex-col gap-1 p-2">
        {data.map((jo, idx) => (
          <JoItem key={jo.jo._id} idx={idx} jo={jo} />
        ))}
      </div>
    </div>
  )
}

function JoItem({ idx, jo }: { idx: number; jo: GetOneWithItemsReturnTypeNotNull }) {
  const totalValue = jo.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const totalItems = jo.items.reduce((sum, item) => sum + item.quantity, 0)
  return (
    <>
      {idx !== 0 && <Separator />}
      <Link
        key={jo.jo._id}
        to="/jo/$joId"
        params={{ joId: jo.jo._id }}
        className="text flex w-full items-center justify-between rounded p-4 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
        activeProps={{
          className: "bg-black text-white dark:bg-white dark:text-black",
        }}
      >
        <div className="text-left">
          <p className="text-lg font-semibold">{jo.jo.name}</p>
        </div>
        <div className="flex items-center">
          <div className="text-right text-sm">
            <div className="font-medium">{formatCurrency(totalValue)}</div>
            <div className="">{totalItems} items</div>
          </div>
        </div>
      </Link>
    </>
  )
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}
