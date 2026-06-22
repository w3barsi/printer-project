import { RegCorner } from "@/components/shop/reg-mark";
import { ShopButton } from "@/components/shop/ui/button";

export function ShopHero() {
  return (
    <section
      id="top"
      className="relative z-10 mx-auto max-w-350 px-6 pt-10 pb-20 md:px-10 md:pt-14"
    >
      {/* warm ink-and-paper blobs */}
      <div
        className="shop-blob shop-blob-red top-24 -left-20 h-105 w-105 opacity-30"
        aria-hidden
      />
      <div
        className="shop-blob shop-blob-white top-40 right-[-10%] h-95 w-95 opacity-60"
        aria-hidden
      />
      <div
        className="shop-blob shop-blob-silver top-105 left-1/3 h-75 w-75 opacity-40"
        aria-hidden
      />

      {/* DG watermark */}
      <img
        src="/DG_SHORT_BORDERED.png"
        alt=""
        className="pointer-events-none absolute top-[10%] right-[-8%] z-0 w-[55%] max-w-130 opacity-[0.08] md:top-[5%] md:right-[2%] md:w-[40%]"
      />

      <div className="relative grid gap-12 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
        <div>
          <div className="shop-rise shop-rise-1 mb-8 flex items-center gap-3">
            <span className="h-px w-10 bg-(--shop-red)" />
            <span className="font-shop-wide text-[0.72rem] font-semibold tracking-[0.18em] text-(--shop-red) uppercase">
              Friendly print, signage &amp; fabrication
            </span>
          </div>

          <h1 className="shop-rise shop-rise-2 font-shop-display text-[clamp(3.2rem,10vw,9rem)] leading-[0.88] font-bold tracking-[-0.01em] italic">
            <span className="block">MAKE YOUR</span>
            <span className="block">
              <span className="text-transparent [-webkit-text-stroke:1.5px_var(--shop-ink)]">
                BRAND
              </span>
            </span>
            <span className="block">
              <span
                className="text-(--shop-red) drop-shadow-[0_12px_28px_rgba(242,92,61,0.22)]"
                style={{ animationDelay: "0.6s" }}
              >
                EASY TO SPOT.
              </span>
            </span>
          </h1>

          <p className="shop-rise shop-rise-4 mt-8 max-w-xl text-base leading-relaxed text-pretty text-(--shop-ink-dim) md:text-lg">
            Big-format print, signage, acrylic, awards, and event pieces made by a crew
            that talks clearly, proofs carefully, and helps you get the job done without
            the guesswork.
          </p>

          <div className="shop-rise shop-rise-5 mt-10 flex flex-wrap items-center gap-4">
            <ShopButton asChild variant="primary">
              <a href="#contact">Request a quote</a>
            </ShopButton>
            <ShopButton asChild variant="ghost">
              <a href="#services">See services</a>
            </ShopButton>
          </div>

          <div className="shop-rise shop-rise-6 mt-12 flex flex-wrap items-center gap-x-8 gap-y-3">
            {["Clear quotes", "Artwork help", "Built in-house"].map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 text-sm text-(--shop-ink-dim)"
              >
                <span className="text-[0.7rem] text-(--shop-red)">✦</span>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* friendly shop-window panel */}
        <div className="shop-rise shop-rise-5 relative">
          <SignPanel />
        </div>
      </div>

      {/* corner registration marks */}
      <RegCorner className="top-3 left-3" />
      <RegCorner className="top-3 right-3" />
    </section>
  );
}

function SignPanel() {
  return (
    <div className="relative mx-auto w-full max-w-sm rotate-1 rounded-[2rem] border border-(--shop-line-2) bg-(--shop-panel) p-7 shadow-[0_28px_80px_rgba(139,39,32,0.14)]">
      <div className="shop-halftone pointer-events-none absolute inset-0 rounded-[2rem] opacity-20" />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-shop-wide text-[0.62rem] font-semibold tracking-[0.18em] text-(--shop-ink-dim) uppercase">
            Shop window preview
          </span>
          <span className="flex items-center gap-1.5 text-[0.62rem] text-(--shop-ink-mute)">
            <span className="size-1.5 animate-pulse rounded-full bg-(--shop-red)" />
            READY
          </span>
        </div>

        <div className="rounded-[1.35rem] border border-(--shop-line) bg-[#ffe5df] p-6 text-center shadow-inner">
          <div
            className="font-shop-display text-5xl leading-[0.9] font-bold tracking-[-0.01em] text-(--shop-red) italic"
            style={{ animationDelay: "0.2s" }}
          >
            HELLO
          </div>
          <div className="mt-3 font-shop-serif text-xl text-(--shop-ink-dim) italic">
            we made your sign
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <img src="/DG_SHORT_BORDERED.png" alt="" className="h-20 w-auto opacity-90" />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-(--shop-ink-mute)">
          We help choose materials, prepare artwork, print, fabricate, and install when
          your project needs it.
        </p>
      </div>
    </div>
  );
}
