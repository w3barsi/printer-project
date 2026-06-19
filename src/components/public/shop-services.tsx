import { SectionHead } from "@/components/public/section-head";
import { ServiceCard } from "@/components/public/service-card";
import { SERVICES } from "@/lib/services";

export function ShopServices() {
  return (
    <section
      id="services"
      className="relative z-10 mx-auto max-w-350 px-6 py-24 md:px-10 md:py-32"
    >
      <SectionHead
        no="§ 01"
        title="Start with what you need made"
        sub="From one banner to a full storefront, we make the practical pieces that help customers notice, understand, and remember you."
      />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <ServiceCard key={s.no} service={s} />
        ))}
      </div>
    </section>
  );
}
