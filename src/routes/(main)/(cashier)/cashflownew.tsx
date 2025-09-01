import { AddCoh } from "@/components/cashier/add-coh";
import { AddCashflow } from "@/components/cashier/add-transaction";
import { Container } from "@/components/layouts/container";
import {
  CashflowSummarySkeleton,
  CashflowTableSkeleton,
} from "@/components/skeletons/cashflow";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarIcon,
  ChevronDownIcon,
  PhilippinePesoIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { z } from "zod";

export const Route = createFileRoute("/(main)/(cashier)/cashflownew")({
  validateSearch: z.object({
    start: z.number().optional(),
  }),
  beforeLoad: ({ search }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = search && today.getTime();
    console.log(d);
    return {
      search: {
        start: d,
      },
    };
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.cashier.getCashflow, { dayStart: context.search.start }),
    );
  },
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: `Cashflow | DG`,
      },
    ],
  }),
});

function RouteComponent() {
  return (
    <>
      <Container className="flex flex-col">
        <CashflowHeader />
      </Container>
      <Separator />
      <Container className="flex flex-col gap-4">
        <Suspense fallback={<CashflowSummarySkeleton />}>
          <CashflowSummary />
        </Suspense>
        <Suspense fallback={<CashflowTableSkeleton />}>
          <CashflowTable />
        </Suspense>
      </Container>
    </>
  );
}

function CashflowTable() {
  const { start } = Route.useSearch();
  const dayStart = start ?? todayZero().getTime();

  const { data } = useSuspenseQuery(convexQuery(api.cashier.getCashflow, { dayStart }));
  const { mutateAsync: deleteCashflow } = useMutation({
    mutationFn: useConvexMutation(api.cashier.deleteCashflowExpense),
  });

  const sc = data.startingCash;

  return (
    <TableWrapper>
      <Table className="min-w-md">
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="w-1/11 md:pl-4">Time</TableHead>
            <TableHead className="w-1/11">Type</TableHead>
            <TableHead className="w-4/11">Description</TableHead>
            <TableHead className="w-1/11">Status</TableHead>
            <TableHead className="w-2/11">Received By</TableHead>
            <TableHead className="w-1/11 text-right">Amount</TableHead>
            <TableHead className="w-1/11 text-center md:pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sc ? (
            <TableRow className="bg-muted hover:bg-muted">
              <TableCell colSpan={4} className="text-center">
                Cash On Hand
              </TableCell>
              <TableCell>{sc.createdByName}</TableCell>
              <TableCell className={cn("text-right font-medium")}>
                ₱{sc.amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-center md:pr-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCashflow({ expenseId: sc._id })}
                  className="text-red-600 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/20"
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="text-center">
                <AddCoh start={start} />
              </TableCell>
            </TableRow>
          )}
          {data.data?.map((c) => (
            <TableRow key={c._id}>
              <TableCell className="md:pl-4">
                {new Date(c.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                    c.type === "Payment"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                  )}
                >
                  {c.type === "Payment" ? "Payment" : c.cashflowType}
                </span>
              </TableCell>
              <TableCell>
                {c.type === "Payment" ? (
                  <Link
                    to="/jo/$joId"
                    params={{ joId: c.joId }}
                    className="underline underline-offset-2"
                  >
                    {`JO #${c.joNumber} - ${c.joName}`}
                  </Link>
                ) : (
                  c.description
                )}
              </TableCell>
              <TableCell>
                {c.type === "Payment" && (
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                      c.full
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                    )}
                  >
                    {c.full ? "Full Payment" : "Partial Payment"}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{c.createdByName}</TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium",
                  c.type === "Payment"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {c.type === "Cashflow" && "-"}₱{c.amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-center md:pr-4">
                {c.type === "Cashflow" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCashflow({ expenseId: c._id })}
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
    </TableWrapper>
  );
}

function CashflowSummary() {
  const { start } = Route.useSearch();

  const dayStart = start ?? todayZero().getTime();
  const { data } = useSuspenseQuery(convexQuery(api.cashier.getCashflow, { dayStart }));
  const isPositive = data.paymentsTotal > data.expensesTotal ? true : false;
  const net = data.paymentsTotal - data.expensesTotal;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex justify-between">
          <h2>Gross Income</h2>
          <TrendingUpIcon className="text-green-500 dark:text-green-600" />
        </CardHeader>
        <Separator />
        <CardContent className="text-xl font-bold">
          ₱{data.paymentsTotal.toFixed(2)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex justify-between">
          <h2>Total Expenses</h2>
          <TrendingDownIcon className="text-red-500 dark:text-red-600" />
        </CardHeader>
        <Separator />
        <CardContent className="text-xl font-bold">
          ₱{data.expensesTotal.toFixed(2)}
        </CardContent>
      </Card>
      <Card>
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
        <CardContent className="text-xl font-bold">₱{net.toFixed(2)}</CardContent>
      </Card>
    </div>
  );
}

function CashflowHeader() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => {
    if (search.start) {
      return new Date(search.start);
    } else {
      return todayZero();
    }
  }, [search.start]);

  return (
    <div className="flex justify-between">
      <div className="flex items-center gap-4">
        <TrendingUpIcon className="size-10" />
        <div>
          <h1 className="text-2xl font-bold">Cashflow</h1>
          <p className="text-muted-foreground">Cashflow summary dashboard.</p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4 md:flex-row-reverse">
        <AddCashflow date={search.start} />
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
                {selected.toLocaleDateString()}
                <ChevronDownIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={selected}
                captionLayout="label"
                onSelect={async (date) => {
                  if (!date) return;
                  if (todayZero().getTime() === date.getTime()) {
                    await navigate({
                      to: "/cashflownew",
                    });
                  } else {
                    await navigate({
                      to: "/cashflownew",
                      search: { start: date.getTime() },
                    });
                  }
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

function todayZero() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
