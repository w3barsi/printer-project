import { Link } from "@tanstack/react-router";

export function ShopHeader() {
  return (
    <header className="relative z-20 mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10">
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
            className="shop-link-underline shop-eyebrow !tracking-[0.2em]"
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <Link
          to="/app/jo"
          className="shop-eyebrow shop-link-underline hidden !tracking-[0.16em] sm:inline"
        >
          Staff login
        </Link>
        <a
          href="#contact"
          className="shop-btn shop-btn-primary !rounded-full !px-5 !py-2.5"
        >
          Get a quote
        </a>
      </div>
    </header>
  );
}
