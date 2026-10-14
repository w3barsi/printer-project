import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Doc, Id } from "@dg/backend/dataModel";
import { formatPeso } from "@dg/backend/printPricing";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dg/ui-coss/components/alert-dialog";
import { Badge } from "@dg/ui-coss/components/badge";
import { Button } from "@dg/ui-coss/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dg/ui-coss/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dg/ui-coss/components/empty";
import { Separator } from "@dg/ui-coss/components/separator";
import { Skeleton } from "@dg/ui-coss/components/skeleton";
import { Spinner } from "@dg/ui-coss/components/spinner";
import { toastManager } from "@dg/ui-coss/components/toast";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRightIcon, HistoryIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import {
  buildBreakdownRows,
  formatDateTime,
  formatPercent,
  formatPrintTime,
} from "@/components/3d/pricing/formatters";

export type CalculationListItem = Doc<"printPricingCalculations"> & {
  createdByName: string;
};

export function CalculationHistory({ itemId }: { itemId: Id<"printPricingItems"> }) {
  const { data: calculations } = useSuspenseQuery(
    convexQuery(api.printPricing.calculations.listByItem, { itemId }),
  );
  const [calculationToDelete, setCalculationToDelete] =
    useState<CalculationListItem | null>(null);

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Price history</CardTitle>
          <CardDescription>Every saved price, newest first.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {calculations.length === 0 ? (
            <div className="p-6">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HistoryIcon />
                  </EmptyMedia>
                  <EmptyTitle>No saved prices yet</EmptyTitle>
                  <EmptyDescription>
                    Fill in the calculator and press Save price to start the history.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="divide-y">
              {calculations.map((calculation) => (
                <CalculationHistoryRow
                  key={calculation._id}
                  calculation={calculation}
                  onDelete={() => setCalculationToDelete(calculation)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {calculationToDelete ? (
        <DeleteCalculationDialog
          calculation={calculationToDelete}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setCalculationToDelete(null);
          }}
        />
      ) : null}
    </>
  );
}

function CalculationHistoryRow({
  calculation,
  onDelete,
}: {
  calculation: CalculationListItem;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronRightIcon
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {formatDateTime(calculation.createdAt)}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {calculation.createdByName}
              {calculation.note ? ` · ${calculation.note}` : ""}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="tabular-nums">
            {formatPeso(calculation.price.total)}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2Icon />
            <span className="sr-only">
              Delete price from {formatDateTime(calculation.createdAt)}
            </span>
          </Button>
        </div>
      </div>
      {open ? <CalculationSnapshot calculation={calculation} /> : null}
    </div>
  );
}

function CalculationSnapshot({ calculation }: { calculation: CalculationListItem }) {
  const inputRows: Array<{ label: string; value: string }> = [
    ...calculation.filaments.map((filament) => ({
      label: filament.name,
      value: `${filament.weightGrams.toLocaleString()} g · ${formatPeso(
        filament.costPerKg,
      )}/kg`,
    })),
    { label: "Print time", value: formatPrintTime(calculation.printTimeHours) },
  ];

  if (calculation.printer) {
    inputRows.push(
      {
        label: "Power",
        value: `${calculation.printer.powerWatts.toLocaleString()} W`,
      },
      { label: "Printer price", value: formatPeso(calculation.printer.price) },
      {
        label: "Lifespan",
        value: `${calculation.printer.lifespanHours.toLocaleString()} h`,
      },
      {
        label: "Electricity rate",
        value: `${formatPeso(calculation.printer.electricityRatePerKwh)}/kWh`,
      },
    );
  }

  if (calculation.labor) {
    inputRows.push(
      {
        label: "Labor rate",
        value: `${formatPeso(calculation.labor.ratePerHour)}/h`,
      },
      {
        label: "Labor hours",
        value: `${calculation.labor.hours.toLocaleString()} h`,
      },
    );
  }

  if (calculation.business) {
    inputRows.push(
      {
        label: "Failure rate",
        value: formatPercent(calculation.business.failureRatePercent),
      },
      { label: "Markup", value: formatPercent(calculation.business.markupPercent) },
    );
  }

  return (
    <div className="grid gap-6 border-t bg-muted/20 px-4 py-4 lg:grid-cols-2">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Inputs
        </h3>
        <dl className="flex flex-col gap-1 text-sm">
          {inputRows.map((row, index) => (
            <div
              key={`${row.label}-${index}`}
              className="flex items-center justify-between gap-4"
            >
              <dt className="min-w-0 truncate text-muted-foreground">{row.label}</dt>
              <dd className="shrink-0 tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Breakdown
        </h3>
        <div className="flex flex-col gap-1 text-sm">
          {buildBreakdownRows(calculation, calculation.price).map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="tabular-nums">{formatPeso(row.amount)}</span>
            </div>
          ))}
          <Separator className="my-1" />
          <div className="flex items-center justify-between gap-4 font-medium">
            <span>Total</span>
            <span className="tabular-nums">{formatPeso(calculation.price.total)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function DeleteCalculationDialog({
  calculation,
  open,
  onOpenChange,
}: {
  calculation: CalculationListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.printPricing.calculations.deleteCalculation),
    onSuccess: () => {
      toastManager.add({ title: "Saved price deleted", type: "success" });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not delete saved price",
        type: "error",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this saved price?</AlertDialogTitle>
          <AlertDialogDescription>
            Removes the {formatPeso(calculation.price.total)} entry from{" "}
            {formatDateTime(calculation.createdAt)}. The item&apos;s latest price falls
            back to the previous entry.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            disabled={mutation.isPending}
            render={<Button variant="outline" />}
          >
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ calculationId: calculation._id })}
            render={<Button variant="destructive" />}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Delete price
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CalculationHistorySkeleton() {
  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="border-b py-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
