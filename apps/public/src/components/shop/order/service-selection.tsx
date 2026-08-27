import { SERVICES } from "@/lib/services";

import { ServiceSelectionCard } from "./service-selection-card";

export function ServiceSelection({
  selectedSlug,
  title,
  description,
}: {
  selectedSlug?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section>
      {title || description ? (
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            {title ? (
              <h2 className="font-shop-display text-4xl leading-[0.9] font-bold tracking-[-0.01em] italic">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-(--shop-ink-dim)">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-700">
              Available now
            </span>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-700">
              Not yet available
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SERVICES.map((service) => (
          <ServiceSelectionCard
            key={service.slug}
            service={service}
            selected={service.slug === selectedSlug}
          />
        ))}
      </div>
    </section>
  );
}
