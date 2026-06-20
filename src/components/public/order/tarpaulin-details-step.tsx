import { ArrowRightIcon } from "lucide-react";

import {
  TARPAULIN_SIZE_PRESETS,
  isPositiveDimension,
  isPositiveIntegerQuantity,
} from "@/lib/public-order";

import { EstimateCard } from "./estimate-card";
import { Field } from "./field";
import type { ItemDraft } from "./types";
import { inputClassName } from "./utils";

export function TarpaulinDetailsStep({
  draft,
  updateDraft,
  onNext,
}: {
  draft: ItemDraft;
  updateDraft: (patch: Partial<ItemDraft>) => void;
  onNext: () => void;
}) {
  const width = Number(draft.width);
  const height = Number(draft.height);
  const quantity = Number(draft.quantity);
  const hasValidEstimate =
    isPositiveDimension(width) &&
    isPositiveDimension(height) &&
    isPositiveIntegerQuantity(quantity);

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.75fr]">
      <div className="rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
        <h2 className="shop-font-display text-4xl">Tarpaulin size</h2>
        <p className="mt-3 text-sm leading-relaxed text-(--shop-ink-dim)">
          Use feet for width and height. Decimals are allowed for custom sizes.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          {TARPAULIN_SIZE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="rounded-2xl border border-(--shop-line-2) bg-[#ffe5df] px-4 py-3 text-sm font-black text-(--shop-red) transition hover:bg-white"
              onClick={() =>
                updateDraft({
                  width: String(preset.width),
                  height: String(preset.height),
                })
              }
            >
              {preset.label} ft
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Field label="Width (ft)">
            <input
              className={inputClassName}
              inputMode="decimal"
              value={draft.width}
              onChange={(event) => updateDraft({ width: event.target.value })}
            />
          </Field>
          <Field label="Height (ft)">
            <input
              className={inputClassName}
              inputMode="decimal"
              value={draft.height}
              onChange={(event) => updateDraft({ height: event.target.value })}
            />
          </Field>
          <Field label="Quantity">
            <input
              className={inputClassName}
              inputMode="numeric"
              value={draft.quantity}
              onChange={(event) => updateDraft({ quantity: event.target.value })}
            />
          </Field>
        </div>

        <button
          type="button"
          className="shop-btn shop-btn-primary mt-7 !rounded-full"
          onClick={onNext}
        >
          Continue to artwork <ArrowRightIcon className="size-4" />
        </button>
      </div>

      <EstimateCard
        width={width}
        height={height}
        quantity={quantity}
        active={hasValidEstimate}
      />
    </section>
  );
}
