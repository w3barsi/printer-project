import { Container } from "@/components/layouts/container"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"
import { convexQuery, useConvex } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  CalendarIcon,
  ChevronDownIcon,
  FilterIcon,
  PhilippinePesoIcon,
  TrendingUpIcon,
} from "lucide-react"
import { Suspense, useState, type JSX } from "react"

export const Route = createFileRoute("/(main)/(cashier)/cashflow")({
  loader: async ({ context }) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = today.getTime()
    const end = start + 24 * 60 * 60 * 1000 - 1
    await context.queryClient.ensureQueryData(
      convexQuery(api.cashier.listDayData, { dayStart: start, dayEnd: end }),
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const [selected, setSelected] = useState<Date | undefined>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [open, setOpen] = useState(false)
  const dayStart = selected ? selected.getTime() : 0
  const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1

  return (
    <Container className="flex flex-col">
      <div className="flex justify-between">
        <div className="flex items-center gap-4">
          <TrendingUpIcon className="size-10" />
          <div>
            <h1 className="text-xl font-bold">Cashflow</h1>
            <p className="text-muted-foreground">Cashflow summary dashboard.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <Label htmlFor="date" className="px-1">
              <CalendarIcon className="size-4" />
            </Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="date"
                  className="w-48 justify-between font-normal"
                >
                  {selected ? selected.toLocaleDateString() : "Select date"}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selected}
                  captionLayout="label"
                  onSelect={(date) => {
                    setSelected(date)
                    setOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <AddExpense />
        </div>
      </div>
      <Suspense fallback={<ExpenseSumamrySkeleton />}>
        <ExpenseSummary dayStart={dayStart} dayEnd={dayEnd} date={selected} />
      </Suspense>
      <Suspense>
        <DailyTransactions dayStart={dayStart} dayEnd={dayEnd} date={selected} />
      </Suspense>
    </Container>
  )
}

function DailyTransactions({
  dayStart,
  dayEnd,
  date,
}: {
  dayStart: number
  dayEnd: number
  date?: Date
}) {
  const [filter, setFilter] = useLocalStorage<"all" | "income" | "expenses">(
    "filter",
    "all",
  )
  const { data } = useSuspenseQuery(
    convexQuery(api.cashier.listDayData, { dayStart, dayEnd }),
  )

  const paymentsData = data.paymentsData.map((d) => {
    return {
      createdAt: d._creationTime,
      elem: (
        <div className="flex flex-col rounded border-l-4 border-green-500 bg-green-200 p-2 dark:bg-green-500/20">
          <div className="flex items-baseline gap-2 text-lg font-semibold">
            <span>+₱{d.amount.toFixed(2)}</span>
            <span className="text-muted-foreground text-sm">
              ({d.full ? "Full" : "Partial"})
            </span>
          </div>
          <Link
            to="/jo/$joId"
            params={{ joId: d.joId }}
            className="underline-offset-4 hover:underline"
          >
            <span className="">Jo Number #{d.joNumber}</span> -{" "}
            <span className="font-semibold">{d.joName}</span>
          </Link>
          <p className="text-muted-foreground text-sm">Received by: {d.createdByName}</p>
        </div>
      ),
    }
  })

  const expenseElements = data.expensesData.map((d) => ({
    createdAt: d._creationTime,
    elem: (
      <div className="flex flex-col rounded border-l-4 border-red-500 bg-red-200 p-2 dark:bg-red-500/20">
        <p className="text-lg font-semibold">+₱{d.amount.toFixed(2)}</p>
        <p>{d.description}</p>
        <p className="text-muted-foreground text-sm">Received by: {d.createdByName}</p>
      </div>
    ),
  }))

  const allData = [...paymentsData, ...expenseElements]
  allData.sort((a, b) => a.createdAt - b.createdAt)

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex gap-4">
          <PhilippinePesoIcon /> Daily Transactions on {date?.toLocaleDateString()}
        </div>
        <div className="flex items-center gap-2">
          <FilterIcon size={18} />
          <div className="flex gap-2 rounded-lg border p-1">
            <Button
              variant="ghost"
              onClick={() => setFilter("all")}
              className={cn(
                "w-24 hover:bg-neutral-100 dark:hover:bg-neutral-500/10",
                filter === "all" &&
                  "border-neutral-300 bg-neutral-200 hover:bg-neutral-200 dark:border-neutral-900 dark:bg-neutral-500/20 dark:hover:bg-neutral-500/20",
              )}
            >
              All
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFilter("income")}
              className={cn(
                "w-24 hover:bg-green-100 dark:hover:bg-green-500/10",
                filter === "income" &&
                  "border-green-300 bg-green-200 hover:bg-green-200 dark:border-green-900 dark:bg-green-500/20 dark:hover:bg-green-500/20",
              )}
            >
              Income
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFilter("expenses")}
              className={cn(
                "w-24 hover:bg-red-100 dark:hover:bg-red-500/10",
                filter === "expenses" &&
                  "border-red-300 bg-red-200 hover:bg-red-200 dark:border-red-900 dark:bg-red-500/20 dark:hover:bg-red-500/20",
              )}
            >
              Expenses
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>{filter === "all" && <TransactionList data={allData} />}</CardContent>
      <CardContent>
        {filter === "expenses" && <TransactionList data={expenseElements} />}
      </CardContent>
      <CardContent>
        {filter === "income" && <TransactionList data={paymentsData} />}
      </CardContent>
    </Card>
  )
}

function TransactionList({
  data,
}: {
  data: Array<{ createdAt: number; elem: JSX.Element }>
}) {
  return <div className="flex flex-col gap-2">{data.map((d) => d.elem)}</div>
}

function ExpenseSummary({
  dayStart,
  dayEnd,
  date,
}: {
  dayStart: number
  dayEnd: number
  date?: Date
}) {
  const { data } = useSuspenseQuery(
    convexQuery(api.cashier.listDayData, { dayStart, dayEnd }),
  )

  const paymentCount = data?.paymentsData.length
  const expenseCount = data?.expensesData.length

  const isPositive = data.paymentsTotal > data.expensesTotal ? true : false

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="h-40 justify-between">
        <CardHeader className="flex justify-between">
          <h2>Today's Gross Income</h2>
          <span>
            <TrendingUpIcon className="text-green-500 dark:text-green-600" />
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <span className="w-full rounded-full border border-green-300 bg-green-200 py-2 pl-5 dark:border-green-900 dark:bg-green-500/10">
            ₱{data.paymentsTotal.toFixed(2)}
          </span>
          <span className="text-muted-foreground text-sm">
            {paymentCount} transaction/s on {date?.toLocaleDateString()}
          </span>
        </CardContent>
      </Card>
      <Card className="h-40 justify-between">
        <CardHeader className="flex justify-between">
          <h2>Total Expenses</h2>
          <span>
            <TrendingUpIcon className="text-red-500 dark:text-red-600" />
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <span className="w-full rounded-full border border-red-300 bg-red-200 py-2 pl-5 dark:border-red-900 dark:bg-red-500/10">
            ₱{data.expensesTotal.toFixed(2)}
          </span>
          <span className="text-muted-foreground text-sm">
            {expenseCount} transaction/s on {date?.toLocaleDateString()}
          </span>
        </CardContent>
      </Card>
      <Card className="h-40 justify-between">
        <CardHeader className="flex justify-between">
          <h2>Net Income</h2>
          <PhilippinePesoIcon
            className={cn(
              isPositive
                ? "text-green-500 dark:text-green-600"
                : "text-red-500 dark:text-red-600",
            )}
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <span
            className={cn(
              "w-full rounded-full border py-2 pl-5",
              !isPositive &&
                "border-red-300 bg-red-200 dark:border-red-900 dark:bg-red-500/10",
              isPositive &&
                "border-green-300 bg-green-200 py-2 pl-5 dark:border-green-900 dark:bg-green-500/10",
            )}
          >
            ₱{(data.paymentsTotal - data.expensesTotal).toFixed(2)}
          </span>
          <span className="text-muted-foreground text-sm">
            {date?.toLocaleDateString()}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}

function AddExpense() {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState(0)
  const convex = useConvex()

  async function onSave() {
    await convex.mutation(api.cashier.addExpense, {
      description,
      amount: Number(amount),
    })
    setOpen(false)
    setDescription("")
    setAmount(0)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amt">Amount</Label>
            <Input
              id="amt"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave} disabled={!description || amount <= 0}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExpenseSumamrySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="h-40 justify-between">
        <CardHeader className="flex justify-between gap-5">
          <Skeleton className="h-8 w-full" />

          <Skeleton className="h-8 w-11 rounded-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
      <Card className="h-40 justify-between">
        <CardHeader className="flex justify-between gap-5">
          <Skeleton className="h-8 w-full" />

          <Skeleton className="h-8 w-11 rounded-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
      <Card className="h-40 justify-between">
        <CardHeader className="flex justify-between gap-5">
          <Skeleton className="h-8 w-full" />

          <Skeleton className="h-8 w-11 rounded-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  )
}
