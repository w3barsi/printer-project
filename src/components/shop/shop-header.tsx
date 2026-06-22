import { Link } from "@tanstack/react-router";

import { ShopButton } from "@/components/shop/ui/button";

export function ShopHeader() {
  return (
    <header className="relative z-20 mx-auto flex max-w-350 items-center justify-between px-6 py-5 md:px-10">
      <a href="#top" className="group flex items-center gap-3">
        <img
          src="/DG_SHORT_SVG.svg"
          alt=""
          className="h-10 w-auto rounded-2xl border border-white/80 bg-white p-1.5 shadow-sm md:h-11"
        />
        <img src="/DG_Long.png" alt="DARCYGRAPHiX" className="h-8 w-auto md:h-9" />
      </a>
      <nav className="hidden items-center gap-9 md:flex">
        {[
          ["Services", "#services"],
          ["Process", "#process"],
          ["Capabilities", "#capabilities"],
          ["Contact", "#contact"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="shop-link-underline font-shop-wide text-[0.72rem] font-semibold tracking-[0.2em] text-(--shop-ink-dim) uppercase"
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <Link
          to="/app/jo"
          className="shop-link-underline hidden font-shop-wide text-[0.72rem] font-semibold tracking-[0.16em] text-(--shop-ink-dim) uppercase sm:inline"
        >
          Staff login
        </Link>
        <ShopButton asChild variant="primary" size="sm">
          <a href="#contact">Get a quote</a>
        </ShopButton>
      </div>
    </header>
  );
}
