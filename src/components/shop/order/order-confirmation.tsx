import { Link } from "@tanstack/react-router";
import { CheckCircle2Icon } from "lucide-react";

import { SHOP_ORDER_SUPPORTED_SERVICE_SLUG, getShopOrderHref } from "@/lib/shop-order";

import { SummaryPill } from "./summary-pill";
import type { SubmittedOrder } from "./types";
import { attachmentStatusLabel, formatCurrency } from "./utils";

export function OrderConfirmation({ order }: { order: SubmittedOrder }) {
  return (
    <section className="rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-8 text-center shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-10">
      <CheckCircle2Icon className="mx-auto size-12 text-(--shop-red)" />
      <h2 className="shop-font-display mt-4 text-5xl">Order request received</h2>
      {order.honeypot ? (
        <p className="mx-auto mt-4 max-w-xl text-(--shop-ink-dim)">
          Thanks. Your request has been received and will be reviewed by staff.
        </p>
      ) : (
        <div className="mx-auto mt-6 max-w-2xl space-y-4">
          <p className="text-lg text-(--shop-ink-dim)">
            Staff will confirm details, payment, artwork, and production schedule before
            printing.
          </p>
          <div className="grid gap-3 rounded-[1.5rem] border border-(--shop-line) bg-white/55 p-5 text-left sm:grid-cols-3">
            <SummaryPill label="Job Order" value={`#${order.joNumber}`} />
            <SummaryPill
              label="Print Estimate"
              value={formatCurrency(order.estimatedTotal)}
            />
            <SummaryPill
              label="Files"
              value={attachmentStatusLabel(order.attachmentStatus)}
            />
          </div>
          {order.attachmentStatus === "partial-failure" ? (
            <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700">
              Some files did not upload. Your order was still created; staff may ask you
              to resend files.
            </p>
          ) : null}
        </div>
      )}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <a
          href={getShopOrderHref(SHOP_ORDER_SUPPORTED_SERVICE_SLUG)}
          className="shop-btn shop-btn-primary !rounded-full"
        >
          Start another order
        </a>
        <Link to="/" className="shop-btn shop-btn-ghost !rounded-full">
          Back to home
        </Link>
      </div>
    </section>
  );
}
