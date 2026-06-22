import { RegMark } from "@/components/shop/reg-mark";
import { SectionHead } from "@/components/shop/section-head";

export function ShopProcess() {
  const steps = [
    {
      no: "01",
      title: "Brief",
      body: "Tell us the what, where, and when. We quote it - most jobs same day.",
    },
    {
      no: "02",
      title: "Design",
      body: "We lay it out and send a proof. You approve the artwork before anything prints.",
    },
    {
      no: "03",
      title: "Produce",
      body: "Print, cut, bend, fabricate. Your job runs across the shop floor.",
    },
    {
      no: "04",
      title: "Install",
      body: "Delivery or on-site installation. We don't hand off until it's up and right.",
    },
  ];
  return (
    <section
      id="process"
      className="relative z-10 border-y border-(--shop-line) bg-(--shop-bg-2) py-24 md:py-32"
    >
      <div className="shop-halftone pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto max-w-350 px-6 md:px-10">
        <SectionHead
          no="§ 02"
          title="An easy path from idea to installed"
          sub="Four clear steps, one crew, and proofs before production so you always know what is happening."
        />

        <ol className="mt-14 grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.no}
              className="relative flex flex-col gap-4 rounded-[1.75rem] border border-(--shop-line) bg-(--shop-panel) p-7 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="font-shop-display text-5xl leading-[0.9] font-bold tracking-[-0.01em] text-(--shop-ink-mute) italic">
                  {s.no}
                </span>
                <RegMark
                  className={i % 2 === 0 ? "text-(--shop-red)" : "text-(--shop-silver)"}
                />
              </div>
              <h3 className="font-shop-wide text-xl font-extrabold tracking-wide uppercase">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-(--shop-ink-dim)">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
