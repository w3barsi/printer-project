import { computePriceBreakdown, formatPeso } from "@dg/backend/printPricing";
import type { PrintPricingInput } from "@dg/backend/printPricing";
import { Button } from "@dg/ui-coss/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dg/ui-coss/components/card";
import { Separator } from "@dg/ui-coss/components/separator";
import { useMemo, useState } from "react";

import { buildBreakdownRows } from "@/components/3d/pricing/formatters";

type BreakdownView = "internal" | "client";

export function BreakdownPanel({ input }: { input: PrintPricingInput | null }) {
  const [view, setView] = useState<BreakdownView>("internal");
  const breakdown = useMemo(() => (input ? computePriceBreakdown(input) : null), [input]);
  const rows = useMemo(
    () => (input && breakdown ? buildBreakdownRows(input, breakdown) : []),
    [input, breakdown],
  );

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>Price breakdown</CardTitle>
        <CardDescription>
          Live preview of the price you are about to save.
        </CardDescription>
        <CardAction>
          <div
            className="grid grid-cols-2 gap-1"
            role="group"
            aria-label="Breakdown view"
          >
            <Button
              type="button"
              size="sm"
              variant={view === "internal" ? "default" : "outline"}
              aria-pressed={view === "internal"}
              onClick={() => setView("internal")}
            >
              Internal
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "client" ? "default" : "outline"}
              aria-pressed={view === "client"}
              onClick={() => setView("client")}
            >
              Client
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 p-4">
        {view === "internal" && rows.length > 0 ? (
          <>
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="tabular-nums">{formatPeso(row.amount)}</span>
              </div>
            ))}
            <Separator className="my-2" />
          </>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <span className="font-medium">Total</span>
          <span className="text-2xl font-bold tabular-nums">
            {breakdown ? formatPeso(breakdown.total) : "—"}
          </span>
        </div>

        {view === "client" ? (
          <p className="text-xs text-muted-foreground">
            Client view shows only the final price.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
