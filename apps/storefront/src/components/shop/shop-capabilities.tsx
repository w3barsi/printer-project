import { SectionHead } from "@/components/shop/section-head";

export function ShopCapabilities() {
  const caps = [
    {
      k: "Clear",
      v: "You get practical options, plain-language pricing, and proofs before we produce.",
    },
    {
      k: "Helpful",
      v: "Bring a finished file or a rough idea. We can help shape it into something print-ready.",
    },
    {
      k: "Capable",
      v: "From a single engraved plaque to a full building wrap, the work stays with our team.",
    },
  ];
  return (
    <section
      id="capabilities"
      className="relative z-10 mx-auto max-w-350 px-6 py-24 md:px-10 md:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <SectionHead
            no="§ 03"
            title="Serious production, easy conversation"
            sub="We keep the machines, materials, and people close together so your project feels simpler from the first message to the final install."
            align="left"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {caps.map((c, i) => (
            <div
              key={c.k}
              className="relative flex flex-col gap-3 rounded-[1.75rem] border border-(--shop-line) bg-(--shop-panel) p-7 shadow-[0_18px_50px_rgba(139,39,32,0.07)]"
            >
              <span
                className={`font-shop-display text-3xl leading-[0.9] font-bold tracking-[-0.01em] italic ${
                  ["text-(--shop-red)", "text-(--shop-silver)", "text-(--shop-ink)"][i]
                }`}
              >
                0{i + 1}
              </span>
              <h3 className="font-shop-wide text-base font-extrabold tracking-wider uppercase">
                {c.k}
              </h3>
              <p className="text-sm leading-relaxed text-(--shop-ink-dim)">{c.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
