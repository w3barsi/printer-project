import { SparklesIcon } from "lucide-react";

import { SHOP_ORDER_SUPPORTED_SERVICE_SLUG, getShopOrderHref } from "@/lib/shop-order";

import { ServiceSelection } from "./service-selection";

export function ComingSoon({
  serviceName,
  selectedSlug,
}: {
  serviceName: string;
  selectedSlug?: string;
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-amber-500/35 bg-amber-500/10 p-8 text-center shadow-[0_18px_50px_rgba(139,39,32,0.07)]">
        <SparklesIcon className="mx-auto size-10 text-amber-700" />
        <p className="mt-4 text-xs font-black tracking-[0.24em] text-amber-700 uppercase">
          Not yet available online
        </p>
        <h2 className="shop-font-display mt-3 text-4xl">
          {serviceName} online orders are coming soon
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-(--shop-ink-dim)">
          Online ordering starts with tarpaulins first. For this service, contact the shop
          and staff will help you quote it manually.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="/#contact" className="shop-btn shop-btn-primary !rounded-full">
            Contact Us
          </a>
          <a
            href={getShopOrderHref(SHOP_ORDER_SUPPORTED_SERVICE_SLUG)}
            className="shop-btn shop-btn-ghost !rounded-full"
          >
            Order tarpaulin
          </a>
        </div>
      </section>

      <ServiceSelection
        selectedSlug={selectedSlug}
        title="Choose an available online order"
        description="Tarpaulins are available for online ordering now. Other services are visible here, but staff still handles them manually until their online forms are ready."
      />
    </div>
  );
}
