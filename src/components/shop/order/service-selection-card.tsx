import { ArrowRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SERVICES } from "@/lib/services";
import { SHOP_ORDER_SUPPORTED_SERVICE_SLUG, getShopOrderHref } from "@/lib/shop-order";

export function ServiceSelectionCard({
  service,
  selected,
}: {
  service: (typeof SERVICES)[number];
  selected: boolean;
}) {
  const supported = service.slug === SHOP_ORDER_SUPPORTED_SERVICE_SLUG;
  const Icon = service.icon;
  const cardClassName = `group relative flex min-h-64 flex-col gap-6 overflow-hidden rounded-[1.75rem] border p-7 shadow-[0_18px_50px_rgba(139,39,32,0.08)] transition-[border-color,box-shadow,background-color] duration-300 md:p-8 ${
    selected
      ? "cursor-not-allowed border-amber-500/40 bg-[#fff8ed] opacity-75"
      : "border-(--shop-line) bg-(--shop-panel) hover:border-[rgba(225,38,28,0.38)] hover:bg-[#fff0ec] hover:shadow-[0_24px_60px_rgba(139,39,32,0.13)]"
  }`;
  const content = (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(225,38,28,0.14),transparent_38%),radial-gradient(circle_at_90%_18%,rgba(214,60,50,0.1),transparent_34%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <div
          className={`relative flex size-12 items-center justify-center rounded-2xl border text-(--shop-red) transition-colors duration-300 ${selected ? "border-amber-500/35 bg-amber-500/15" : "border-(--shop-line-2) bg-[#ffe5df] group-hover:border-[rgba(225,38,28,0.45)] group-hover:bg-[#ffd9cc]"}`}
        >
          <Icon className="size-6" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            variant={supported ? "default" : "outline"}
            className={
              supported
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700"
                : "border-amber-500/30 bg-amber-500/15 text-amber-700"
            }
          >
            {supported
              ? "Available online"
              : selected
                ? "Selected · not online"
                : "Not online"}
          </Badge>
        </div>
      </div>

      <div className="mt-auto">
        <h3 className="shop-font-wide text-lg leading-snug font-bold">{service.name}</h3>
        <p className="mt-3 text-sm leading-relaxed text-(--shop-ink-dim)">
          {service.blurb}
        </p>
        <span className="shop-eyebrow mt-5 flex items-center gap-1.5 !text-[0.6rem] !tracking-[0.2em] !text-(--shop-red) transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {selected
            ? "Currently selected"
            : supported
              ? "Start order"
              : "View availability note"}
          {!selected ? (
            <ArrowRightIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          ) : null}
        </span>
      </div>
    </>
  );

  if (selected) {
    return (
      <div className={cardClassName} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <a href={getShopOrderHref(service.slug)} className={cardClassName}>
      {content}
    </a>
  );
}
