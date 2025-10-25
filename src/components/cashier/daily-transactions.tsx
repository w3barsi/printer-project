import { type JSX } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { FilterIcon, PhilippinePesoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";

export function DailyTransactions({
  dayStart,
  dayEnd,
  date,
}: {
  dayStart: number;
  dayEnd: number;
  date?: Date;
}) {
  const [filter, setFilter] = useLocalStorage<"all" | "income" | "expenses">(
    "filter",
    "all",
  );
  const { data } = useSuspenseQuery(
    convexQuery(api.cashier.listDayData, { dayStart, dayEnd }),
  );

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
            <span>Jo Number #{d.joNumber}</span> -{" "}
            <span className="font-semibold">{d.joName}</span>
          </Link>
          <p className="text-muted-foreground text-sm">Received by: {d.createdByName}</p>
        </div>
      ),
    };
  });

  const expenseElements = data.expensesData.map((d) => ({
    createdAt: d._creationTime,
    elem: (
      <div className="flex flex-col rounded border-l-4 border-red-500 bg-red-200 p-2 dark:bg-red-500/20">
        <p className="text-lg font-semibold">+₱{d.amount.toFixed(2)}</p>
        <p>{d.description}</p>
        <p className="text-muted-foreground text-sm">Received by: {d.createdByName}</p>
      </div>
    ),
  }));

  const allData = [...paymentsData, ...expenseElements];
  allData.sort((b, a) => a.createdAt - b.createdAt);

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
      <CardContent>
        {filter === "all" && <TransactionElement data={allData} />}
      </CardContent>
      <CardContent>
        {filter === "expenses" && <TransactionElement data={expenseElements} />}
      </CardContent>
      <CardContent>
        {filter === "income" && <TransactionElement data={paymentsData} />}
      </CardContent>
    </Card>
  );
}

function TransactionElement({
  data,
}: {
  data: Array<{ createdAt: number; elem: JSX.Element }>;
}) {
  return <div className="flex flex-col gap-2">{data.map((d) => d.elem)}</div>;
}
