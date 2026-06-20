import {
  TARPAULIN_PRICE_PER_SQFT,
  calculateShopOrderLineTotal,
  calculateTarpaulinAreaSqft,
  calculateTarpaulinPiecePrice,
} from "@/lib/shop-order";

import { SummaryRow } from "./summary-row";
import { formatCurrency } from "./utils";

export function EstimateCard({
  width,
  height,
  quantity,
  active,
}: {
  width: number;
  height: number;
  quantity: number;
  active: boolean;
}) {
  return (
    <aside className="rounded-[2rem] border border-(--shop-line) bg-(--shop-bg-2) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
      <p className="shop-eyebrow !tracking-[0.2em] !text-(--shop-red)">Live estimate</p>
      <h3 className="shop-font-display mt-3 text-4xl">
        {active
          ? formatCurrency(calculateShopOrderLineTotal(width, height, quantity))
          : "--"}
      </h3>
      <div className="mt-6 space-y-3 text-sm text-(--shop-ink-dim)">
        <SummaryRow
          label="Area"
          value={active ? `${calculateTarpaulinAreaSqft(width, height)} sqft` : "--"}
        />
        <SummaryRow
          label="Rate"
          value={formatCurrency(TARPAULIN_PRICE_PER_SQFT) + " / sqft"}
        />
        <SummaryRow
          label="Per piece"
          value={
            active ? formatCurrency(calculateTarpaulinPiecePrice(width, height)) : "--"
          }
        />
        <SummaryRow label="Quantity" value={active ? String(quantity) : "--"} />
      </div>
    </aside>
  );
}
