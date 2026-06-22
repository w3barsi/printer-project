import type { OrderStep } from "./types";
import { formatCurrency } from "./utils";

export function StepRail({
  step,
  cartCount,
  total,
}: {
  step: OrderStep;
  cartCount: number;
  total: number;
}) {
  const steps = ["Service", "Size", "Artwork", "Cart", "Contact"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-shop-wide text-[0.65rem] font-semibold tracking-[0.22em] text-(--shop-ink-mute) uppercase">
          Step {step} of 5
        </p>
        <p className="rounded-full bg-(--shop-red) px-3 py-1 text-xs font-black text-white">
          {cartCount} item{cartCount === 1 ? "" : "s"} · {formatCurrency(total)}
        </p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = number <= step;
          return (
            <div key={label} className="min-w-0">
              <div
                className={`h-2 rounded-full ${active ? "bg-(--shop-red)" : "bg-(--shop-line-2)"}`}
              />
              <p className="mt-2 truncate text-[0.65rem] font-bold text-(--shop-ink-dim)">
                {label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
