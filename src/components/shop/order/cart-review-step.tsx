import { ArrowRightIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { ShopButton } from "@/components/shop/ui/button";
import { formatTarpaulinItemName } from "@/lib/shop-order";

import type { ShopOrderCartItem } from "./types";
import { artworkLabel, formatCurrency } from "./utils";

export function CartReviewStep({
  cart,
  artworkFiles,
  total,
  onEdit,
  onRemove,
  onAddItem,
  onContinue,
}: {
  cart: ShopOrderCartItem[];
  artworkFiles: Record<string, File[]>;
  total: number;
  onEdit: (item: ShopOrderCartItem) => void;
  onRemove: (id: string) => void;
  onAddItem: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-shop-display text-4xl leading-[0.9] font-bold tracking-[-0.01em] italic">
            Review cart
          </h2>
          <p className="mt-3 text-sm text-(--shop-ink-dim)">
            Check sizes and artwork notes before adding contact details.
          </p>
        </div>
        <p className="font-shop-display text-3xl leading-[0.9] font-bold tracking-[-0.01em] text-(--shop-red) italic">
          {formatCurrency(total)}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {cart.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-(--shop-line-2) p-8 text-center text-(--shop-ink-dim)">
            No items yet. Add a tarpaulin size to continue.
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="grid gap-4 rounded-[1.5rem] border border-(--shop-line) bg-white/55 p-5 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <h3 className="font-shop-wide font-black">
                  {formatTarpaulinItemName(item.width, item.height)}
                </h3>
                <p className="mt-2 text-sm text-(--shop-ink-dim)">
                  {item.quantity} pc · {item.areaSqft} sqft each ·{" "}
                  {artworkLabel(item.artworkOption)}
                </p>
                <p className="mt-1 text-xs text-(--shop-ink-mute)">
                  {artworkFiles[item.id]?.length ?? 0} artwork file
                  {(artworkFiles[item.id]?.length ?? 0) === 1 ? "" : "s"} selected
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 md:justify-end">
                <p className="font-mono text-lg font-black">
                  {formatCurrency(item.lineTotal)}
                </p>
                <button
                  type="button"
                  className="rounded-full border border-(--shop-line) p-2 text-(--shop-red)"
                  onClick={() => onEdit(item)}
                  aria-label="Edit item"
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full border border-(--shop-line) p-2 text-(--shop-red)"
                  onClick={() => onRemove(item.id)}
                  aria-label="Remove item"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <ShopButton type="button" variant="ghost" onClick={onAddItem}>
          <PlusIcon className="size-4" /> Add item
        </ShopButton>
        <ShopButton
          type="button"
          variant="primary"
          onClick={onContinue}
          disabled={cart.length === 0}
        >
          Continue <ArrowRightIcon className="size-4" />
        </ShopButton>
      </div>
    </section>
  );
}
