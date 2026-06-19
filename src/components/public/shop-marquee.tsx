import { MARQUEE_ITEMS } from "@/lib/services";

export function ShopMarquee() {
  const row = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <section
      className="relative z-10 border-y border-(--shop-line) bg-(--shop-bg-2) py-5"
      aria-label="Services"
    >
      <div className="flex overflow-hidden">
        <div className="shop-marquee shop-marquee-fwd">
          {row.map((item, i) => (
            <span key={i} className="flex items-center">
              <span className="shop-font-display px-6 text-2xl text-(--shop-ink)">
                {item}
              </span>
              <span className="text-lg text-(--shop-red)">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
