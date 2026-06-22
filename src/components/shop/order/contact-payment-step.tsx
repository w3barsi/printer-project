import { ShopButton } from "@/components/shop/ui/shop-button";
import { PAYMENT_METHODS } from "@/lib/shop-order";

import { Field } from "./field";
import type { ContactDraft } from "./types";
import {
  acceptedUploadExtensions,
  formatCurrency,
  inputClassName,
  paymentLabel,
} from "./utils";

export function ContactPaymentStep({
  draft,
  cartTotal,
  paymentProofFile,
  isSubmitting,
  updateDraft,
  onPaymentProof,
  onBack,
  onSubmit,
}: {
  draft: ContactDraft;
  cartTotal: number;
  paymentProofFile: File | null;
  isSubmitting: boolean;
  updateDraft: (patch: Partial<ContactDraft>) => void;
  onPaymentProof: (file: File | null) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const proofRequired = draft.paymentMethod !== "pay-later";

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
      <div className="rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
        <h2 className="font-shop-display text-4xl leading-[0.9] font-bold tracking-[-0.01em] italic">
          Contact and payment
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <input
              className={inputClassName}
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
            />
          </Field>
          <Field label="Mobile number">
            <input
              className={inputClassName}
              value={draft.mobile}
              onChange={(event) => updateDraft({ mobile: event.target.value })}
              placeholder="0917 123 4567"
            />
          </Field>
          <Field label="Email (optional)">
            <input
              className={inputClassName}
              type="email"
              value={draft.email}
              onChange={(event) => updateDraft({ email: event.target.value })}
            />
          </Field>
          <Field label="Payment method">
            <select
              className={inputClassName}
              value={draft.paymentMethod}
              onChange={(event) =>
                updateDraft({
                  paymentMethod: event.target.value as ContactDraft["paymentMethod"],
                })
              }
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {paymentLabel(method)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notes or special instructions" className="mt-4">
          <textarea
            className={`${inputClassName} min-h-28 resize-y`}
            value={draft.notes}
            onChange={(event) => updateDraft({ notes: event.target.value })}
          />
        </Field>

        <div className="mt-5 rounded-[1.5rem] border border-dashed border-(--shop-line-2) bg-white/50 p-5">
          <label className="flex cursor-pointer flex-col gap-2">
            <span className="font-black">
              Payment proof {proofRequired ? "required" : "optional"}
            </span>
            <span className="text-sm text-(--shop-ink-dim)">
              Keep the file here for Batch G upload integration.
            </span>
            <input
              type="file"
              accept={acceptedUploadExtensions}
              onChange={(event) => onPaymentProof(event.target.files?.[0] ?? null)}
            />
          </label>
          {paymentProofFile ? (
            <p className="mt-2 text-sm font-semibold text-(--shop-red)">
              {paymentProofFile.name}
            </p>
          ) : null}
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-(--shop-line) bg-white/55 p-4 text-sm text-(--shop-ink-dim)">
          <input
            type="checkbox"
            checked={draft.acceptedTerms}
            onChange={(event) => updateDraft({ acceptedTerms: event.target.checked })}
            className="mt-1"
          />
          <span>
            I understand this submits an order request. Staff will confirm final details,
            artwork, payment, and production schedule.
          </span>
        </label>

        <input
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          value={draft.honeypot}
          onChange={(event) => updateDraft({ honeypot: event.target.value })}
          aria-hidden="true"
        />

        <div className="mt-7 flex flex-wrap gap-3">
          <ShopButton type="button" variant="ghost" onClick={onBack}>
            Back
          </ShopButton>
          <ShopButton
            type="button"
            variant="primary"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Order Request"}
          </ShopButton>
        </div>
      </div>

      <aside className="rounded-[2rem] border border-(--shop-line) bg-(--shop-bg-2) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
        <p className="font-shop-wide text-[0.72rem] font-semibold tracking-[0.2em] text-(--shop-red) uppercase">
          Request total
        </p>
        <p className="mt-3 font-shop-display text-4xl leading-[0.9] font-bold tracking-[-0.01em] italic">
          {formatCurrency(cartTotal)}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-(--shop-ink-dim)">
          This is the print estimate only. Design fees, delivery, and special finishing
          are confirmed by staff.
        </p>
      </aside>
    </section>
  );
}
