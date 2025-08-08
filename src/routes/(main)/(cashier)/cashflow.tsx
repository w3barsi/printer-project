import { AddExpense } from "@/components/cashier/add-expense"
import { Container } from "@/components/layouts/container"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Tabs } from "@radix-ui/react-tabs"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  CalendarIcon,
  ChevronDownIcon,
  PhilippinePesoIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"
import { Suspense, useState } from "react"

type CashflowData =
  | (
      | {
          id: Id<"payment">
          type: "Income"
          amount: number
          description: string
          status: string
          createdBy: string
          createdAt: Date
        }
      | {
          id: Id<"expenses">
          type: "Expense"
          amount: number
          description: string
          status: string
          createdBy: string
          createdAt: Date
        }
    )[]
  | null

// TODO: redesign to https://x.com/lamaandesign/status/1952285124680376786
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
      <Card className="p-2 md:p-8">
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
      </Card>
    </Container>
  )
}

function DailyTransactions({
  dayStart,
  dayEnd,
}: {
  dayStart: number
  dayEnd: number
  date?: Date
}) {
  const { data } = useSuspenseQuery(
    convexQuery(api.cashier.listDayData, { dayStart, dayEnd }),
  )

  const payments = data.paymentsData.map((payment) => ({
    id: payment._id,
    type: "Income" as const,
    amount: payment.amount,
    description: `JO #${payment.joNumber} - ${payment.joName}`,
    status: payment.full ? "Full Payment" : "Partial Payment",
    createdBy: payment.createdByName,
    createdAt: new Date(payment._creationTime),
  }))

  const expenses = data.expensesData.map((expense) => ({
    id: expense._id,
    type: "Expense" as const,
    amount: expense.amount,
    description: expense.description,
    status: "-",
    createdBy: expense.createdByName,
    createdAt: new Date(expense._creationTime),
  }))

  const allTransactions = [...payments, ...expenses].sort(
    (b, a) => b.createdAt.getTime() - a.createdAt.getTime(),
  )

  // prettier-ignore

  return (
    <Card>
      <Tabs defaultValue="all">
        <CardHeader className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Transactions </h3>
          </div>
          <TabsList className="h-10">
            <TabsTrigger value="all" className="w-12 shadow-none">
              All
            </TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg">
            <TabsContent value="all">
              <DailyTransactionsTable data={allTransactions} />
            </TabsContent>

            <TabsContent value="income">
              <DailyTransactionsTable data={payments} />
            </TabsContent>
            <TabsContent value="expenses">
              <DailyTransactionsTable data={expenses} />
            </TabsContent>
          </div>
        </CardContent>
      </Tabs>
    </Card>
  )
}

function DailyTransactionsTable({ data }: { data: CashflowData }) {
  const { mutateAsync: deleteExpense } = useMutation({
    mutationFn: useConvexMutation(api.cashier.deleteExpense),
  })
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Received By</TableHead>
          <TableHead className="text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.map((transaction) => (
          <TableRow key={transaction.id} className="">
            <TableCell>
              {transaction.createdAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </TableCell>
            <TableCell>
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                  transaction.type === "Income"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                )}
              >
                {transaction.type}
              </span>
            </TableCell>
            <TableCell>{transaction.description}</TableCell>
            <TableCell>
              {transaction.status !== "-" && (
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                    transaction.status === "Full Payment"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                  )}
                >
                  {transaction.status}
                </span>
              )}
            </TableCell>
            <TableCell
              className={cn(
                "text-right font-medium",
                transaction.type === "Income"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {transaction.type === "Income" ? "+" : "-"}₱{transaction.amount.toFixed(2)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {transaction.createdBy}
            </TableCell>
            <TableCell className="text-center">
              {transaction.type === "Expense" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteExpense({ expenseId: transaction.id })}
                  className="text-red-600 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/20"
                >
                  Delete
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ExpenseSummary({
  dayStart,
  dayEnd,
}: {
  dayStart: number
  dayEnd: number
  date?: Date
}) {
  const { data } = useSuspenseQuery(
    convexQuery(api.cashier.listDayData, { dayStart, dayEnd }),
  )

  const isPositive = data.paymentsTotal > data.expensesTotal ? true : false

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="">
        <CardHeader className="flex justify-between">
          <h2>Gross Income</h2>
          <TrendingUpIcon className="text-green-500 dark:text-green-600" />
        </CardHeader>
        <Separator />
        <CardContent className="text-xl font-bold">
          ₱{data.paymentsTotal.toFixed(2)}
        </CardContent>
      </Card>
      <Card className="">
        <CardHeader className="flex justify-between">
          <h2>Total Expenses</h2>
          <TrendingDownIcon className="text-red-500 dark:text-red-600" />
        </CardHeader>
        <Separator />
        <CardContent className="text-xl font-bold">
          ₱{data.expensesTotal.toFixed(2)}
        </CardContent>
      </Card>
      <Card className="">
        <CardHeader className="flex justify-between">
          Net Income
          <PhilippinePesoIcon
            className={cn(
              "transition-colors",
              isPositive
                ? "text-green-500 dark:text-green-600"
                : "text-red-500 dark:text-red-600",
            )}
          />
        </CardHeader>
        <Separator />
        <CardContent className="text-xl font-bold">
          ₱{(data.paymentsTotal - data.expensesTotal).toFixed(2)}
        </CardContent>
      </Card>
    </div>
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
