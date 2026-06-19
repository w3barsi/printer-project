export function ShopContact() {
  return (
    <section
      id="contact"
      className="relative z-10 overflow-hidden border-y border-(--shop-line) bg-(--shop-bg-2) py-24 md:py-36"
    >
      <div
        className="shop-blob shop-blob-red top-[-20%] left-[-10%] h-115 w-115 opacity-40"
        aria-hidden
      />
      <div
        className="shop-blob shop-blob-white right-[-15%] bottom-[-30%] h-105 w-105 opacity-40"
        aria-hidden
      />
      <div className="shop-halftone-red pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative mx-auto max-w-275 px-6 text-center md:px-10">
        <span className="shop-eyebrow !tracking-[0.18em] !text-(--shop-red)">
          ✦ Tell us what you are making
        </span>
        <h2 className="shop-font-display mx-auto mt-6 max-w-4xl text-[clamp(2.6rem,9vw,7rem)] leading-[0.92]">
          Let's make
          <br />
          <span className="text-(--shop-red)">this easy.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-(--shop-ink-dim) md:text-lg">
          Send the item, size, quantity, deadline, and any artwork you have. We'll reply
          with the next practical step.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:hello@darcygraphix.com"
            className="shop-btn shop-btn-primary !rounded-full"
          >
            hello@darcygraphix.com
          </a>
          <a href="#services" className="shop-btn shop-btn-ghost !rounded-full">
            Browse services
          </a>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            ["Email", "hello@darcygraphix.com"],
            ["Web", "darcygraphix.com"],
            ["Based in", "the Philippines"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex flex-col items-center gap-2 rounded-[1.5rem] border border-(--shop-line) bg-(--shop-panel) px-4 py-7 shadow-[0_18px_50px_rgba(139,39,32,0.07)]"
            >
              <span className="shop-eyebrow !text-[0.6rem] text-(--shop-ink-mute)">
                {k}
              </span>
              <span className="shop-font-wide text-sm font-semibold text-(--shop-ink)">
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
