import { formatPeso, type PrintPricingInput } from "@dg/backend/printPricing";
import { Button } from "@dg/ui-coss/components/button";
import { useNavigate } from "@tanstack/react-router";
import { CalculatorIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Suspense, useState } from "react";

import { BreakdownPanel } from "@/components/3d/pricing/breakdown-panel";
import {
  CalculationHistory,
  CalculationHistorySkeleton,
} from "@/components/3d/pricing/calculation-history";
import { PricingCalculatorForm } from "@/components/3d/pricing/calculator-form";
import {
  DeletePricingItemDialog,
  EditPricingItemDialog,
  type PricingListItem,
} from "@/components/3d/pricing/pricing-item-dialogs";

export function PricingItemDetails({ item }: { item: PricingListItem }) {
  const navigate = useNavigate();
  const [input, setInput] = useState<PrintPricingInput | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const latestTotal = item.latestTotal;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CalculatorIcon className="text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Created by {item.createdByName} on{" "}
            {new Date(item.createdAt).toLocaleDateString()}
            {" · "}
            {latestTotal !== undefined && item.latestCalculatedAt
              ? `Latest price ${formatPeso(latestTotal)} on ${new Date(
                  item.latestCalculatedAt,
                ).toLocaleDateString()}`
              : "Not priced yet"}
          </p>
          {item.notes ? <p className="max-w-2xl text-sm">{item.notes}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
            <PencilIcon data-icon="inline-start" />
            Edit details
          </Button>
          <Button
            type="button"
            variant="destructive-outline"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon data-icon="inline-start" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <PricingCalculatorForm itemId={item._id} onInputChange={setInput} />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <BreakdownPanel input={input} />
        </div>
      </div>

      <Suspense fallback={<CalculationHistorySkeleton />}>
        <CalculationHistory itemId={item._id} />
      </Suspense>

      {editOpen ? (
        <EditPricingItemDialog
          item={item}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setEditOpen(false);
          }}
        />
      ) : null}

      {deleteOpen ? (
        <DeletePricingItemDialog
          item={item}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setDeleteOpen(false);
          }}
          onDeleted={() => {
            void navigate({ to: "/3d/pricing" });
          }}
        />
      ) : null}
    </div>
  );
}
