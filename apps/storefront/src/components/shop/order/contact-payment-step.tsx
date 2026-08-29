import { useEffect, useRef } from "react";

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
  turnstileSiteKey,
  turnstileToken,
  turnstileResetKey,
  updateDraft,
  onTurnstileTokenChange,
  onPaymentProof,
  onBack,
  onSubmit,
}: {
  draft: ContactDraft;
  cartTotal: number;
  paymentProofFile: File | null;
  isSubmitting: boolean;
  turnstileSiteKey: string | undefined;
  turnstileToken: string | null;
  turnstileResetKey: number;
  updateDraft: (patch: Partial<ContactDraft>) => void;
  onTurnstileTokenChange: (token: string | null) => void;
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

        <TurnstileBox
          siteKey={turnstileSiteKey}
          resetKey={turnstileResetKey}
          onTokenChange={onTurnstileTokenChange}
        />

        <div className="mt-7 flex flex-wrap gap-3">
          <ShopButton type="button" variant="ghost" onClick={onBack}>
            Back
          </ShopButton>
          <ShopButton
            type="button"
            variant="primary"
            onClick={onSubmit}
            disabled={isSubmitting || !turnstileSiteKey || !turnstileToken}
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

type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  action: string;
  theme: "light";
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load order verification"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

function TurnstileBox({
  siteKey,
  resetKey,
  onTokenChange,
}: {
  siteKey: string | undefined;
  resetKey: number;
  onTokenChange: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let isMounted = true;
    onTokenChange(null);

    loadTurnstileScript()
      .then(() => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onTokenChange,
          "expired-callback": () => onTokenChange(null),
          "error-callback": () => onTokenChange(null),
          action: "submit_order_request",
          theme: "light",
        });
      })
      .catch(() => onTokenChange(null));

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, resetKey, onTokenChange]);

  return (
    <div className="mt-5 rounded-[1.5rem] border border-(--shop-line) bg-white/55 p-4">
      <p className="mb-3 text-sm font-black text-(--shop-ink)">Order verification</p>
      {siteKey ? (
        <div ref={containerRef} />
      ) : (
        <p className="text-sm font-semibold text-red-700">
          Order verification is not configured.
        </p>
      )}
    </div>
  );
}
